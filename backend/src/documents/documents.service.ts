import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { AuthUser } from '../auth/auth.types.js';
import { consumeAiQuota } from '../common/ai-quota.js';
import { toHttpError, unwrap } from '../common/db-error.js';
import { OpenAiRecognizer, type ItemIdentification } from '../recognition/openai-recognizer.js';
import type { ReceiptExtraction } from '../recognition/receipt-extraction.js';
import type { Json, Tables } from '../supabase/database.types.js';
import { DOCUMENTS_BUCKET, SupabaseService, type Db } from '../supabase/supabase.service.js';
import {
  MIME_EXTENSIONS,
  type CreateDocumentDto,
  type CreateUploadUrlDto,
  type ListDocumentsQuery,
  type UpdateDocumentDto,
} from './dto/document.dto.js';

const DOWNLOAD_URL_TTL_SECONDS = 10 * 60;
/** Everything except the generated full-text column. */
const DOCUMENT_COLUMNS =
  'id, user_id, device_id, luxury_item_id, kind, storage_path, mime_type, size_bytes, extracted, raw_text, extracted_at, created_at';
/** Image types the vision model accepts. The app converts camera photos to JPEG. */
const RECOGNIZABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
/** Suche per Foto uploads: {user_id}/search-{uuid}.{jpg|png|webp}, never registered as documents. */
const SEARCH_PHOTO = /^[0-9a-f-]{36}\/search-[0-9a-f-]{36}\.(jpg|png|webp)$/;
const SEARCH_MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/**
 * The photo itself goes to OpenAI inline, so no link to a Beleg ever leaves our servers
 * (a signed URL would sit in OpenAI's request logs and work for anyone who has it).
 */
async function imageDataUrl(db: Db, storagePath: string, mimeType: string): Promise<string> {
  const { data, error } = await db.storage.from(DOCUMENTS_BUCKET).download(storagePath);
  if (error) throw toHttpError({ message: error.message });
  return `data:${mimeType};base64,${Buffer.from(await data.arrayBuffer()).toString('base64')}`;
}

function toDocumentResponse(row: Omit<Tables<'documents'>, 'search'>) {
  return {
    id: row.id,
    deviceId: row.device_id,
    luxuryItemId: row.luxury_item_id,
    kind: row.kind,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    extracted: row.extracted as ReceiptExtraction | null,
    rawText: row.raw_text,
    createdAt: row.created_at,
  };
}

/**
 * Photos never pass through the API: the app gets a signed upload URL, uploads
 * straight to Supabase Storage, then registers the file here.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly recognizer: OpenAiRecognizer,
  ) {}

  async createUploadUrl(user: AuthUser, dto: CreateUploadUrlDto) {
    const name = `${dto.purpose === 'search' ? 'search-' : ''}${randomUUID()}.${MIME_EXTENSIONS[dto.mimeType]}`;
    const path = `${user.id}/${name}`;
    const { data, error } = await this.supabase
      .forUser(user.accessToken)
      .storage.from(DOCUMENTS_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw toHttpError({ message: error.message });
    return { storagePath: data.path, signedUrl: data.signedUrl, token: data.token };
  }

  async create(user: AuthUser, dto: CreateDocumentDto) {
    if (!dto.storagePath.startsWith(`${user.id}/`) || SEARCH_PHOTO.test(dto.storagePath))
      throw new BadRequestException('Invalid storage path');

    const db = this.supabase.forUser(user.accessToken);
    const { data: exists } = await db.storage.from(DOCUMENTS_BUCKET).exists(dto.storagePath);
    if (!exists) throw new BadRequestException('File has not been uploaded yet');

    const row = unwrap(
      await db
        .from('documents')
        .insert({
          user_id: user.id,
          storage_path: dto.storagePath,
          kind: dto.kind,
          mime_type: dto.mimeType,
          size_bytes: dto.sizeBytes ?? null,
          device_id: dto.deviceId ?? null,
        })
        .select(DOCUMENT_COLUMNS)
        .single(),
    );
    return toDocumentResponse(row);
  }

  async list(user: AuthUser, query: ListDocumentsQuery) {
    let q = this.supabase
      .forUser(user.accessToken)
      .from('documents')
      .select(DOCUMENT_COLUMNS)
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);
    if (query.deviceId) {
      // Its own documents plus the Beleg it shares with other devices from the same purchase.
      const { data: device } = await this.supabase
        .forUser(user.accessToken)
        .from('devices')
        .select('source_document_id')
        .eq('id', query.deviceId)
        .maybeSingle();
      q = device?.source_document_id
        ? q.or(`device_id.eq.${query.deviceId},id.eq.${device.source_document_id}`)
        : q.eq('device_id', query.deviceId);
    }
    if (query.kind) q = q.eq('kind', query.kind);
    if (query.q) q = q.textSearch('search', query.q, { config: 'german', type: 'websearch' });
    return unwrap(await q).map(toDocumentResponse);
  }

  async update(user: AuthUser, id: string, dto: UpdateDocumentDto) {
    const patch: { kind?: Tables<'documents'>['kind']; device_id?: string | null } = {};
    if (dto.kind !== undefined) patch.kind = dto.kind;
    if (dto.deviceId !== undefined) patch.device_id = dto.deviceId;
    const row = unwrap(
      await this.supabase
        .forUser(user.accessToken)
        .from('documents')
        .update(patch)
        .eq('id', id)
        .select(DOCUMENT_COLUMNS)
        .single(),
    );
    return toDocumentResponse(row);
  }

  /**
   * Reads purchase data from the photo to prefill the device form.
   * The result is stored on the document, so each photo is sent to OpenAI only once.
   */
  async recognize(user: AuthUser, id: string): Promise<ReceiptExtraction> {
    const db = this.supabase.forUser(user.accessToken);
    const doc = unwrap(
      await db.from('documents').select('storage_path, mime_type, extracted, raw_text').eq('id', id).single(),
    );
    if (doc.extracted) return { ...(doc.extracted as Omit<ReceiptExtraction, 'rawText'>), rawText: doc.raw_text ?? '' };
    if (!RECOGNIZABLE_TYPES.has(doc.mime_type)) throw new BadRequestException('Only JPEG, PNG and WebP photos can be recognized');

    await consumeAiQuota(db, 'recognize');
    const extracted = await this.recognizer.extract(await imageDataUrl(db, doc.storage_path, doc.mime_type));
    const { rawText, ...fields } = extracted;
    const { error: saveError } = await db
      .from('documents')
      .update({ extracted: fields as unknown as Json, raw_text: rawText || null, extracted_at: new Date().toISOString() })
      .eq('id', id);
    if (saveError) this.logger.warn(`Could not cache recognition for ${id}: ${saveError.message}`);
    return extracted;
  }

  /** Category, brand and model of a Wertsache from its photo or invoice. */
  async identify(user: AuthUser, id: string): Promise<ItemIdentification> {
    const db = this.supabase.forUser(user.accessToken);
    const doc = unwrap(await db.from('documents').select('storage_path, mime_type').eq('id', id).single());
    if (!RECOGNIZABLE_TYPES.has(doc.mime_type)) throw new BadRequestException('Only JPEG, PNG and WebP photos can be recognized');
    await consumeAiQuota(db, 'identify');
    return this.recognizer.identify(await imageDataUrl(db, doc.storage_path, doc.mime_type));
  }

  /**
   * Suche per Foto: what a photo just uploaded with purpose "search" shows. It is only a search
   * query, so it is deleted again right away. Only such search uploads are accepted (and deleted),
   * never the file of a Beleg.
   */
  async describePhoto(user: AuthUser, storagePath: string): Promise<ItemIdentification> {
    const match = SEARCH_PHOTO.exec(storagePath);
    if (!match || !storagePath.startsWith(`${user.id}/`)) throw new BadRequestException('Invalid storage path');
    const db = this.supabase.forUser(user.accessToken);
    const bucket = db.storage.from(DOCUMENTS_BUCKET);
    try {
      await consumeAiQuota(db, 'identify');
      return await this.recognizer.identify(await imageDataUrl(db, storagePath, SEARCH_MIME[match[1]]));
    } finally {
      const { error } = await bucket.remove([storagePath]);
      if (error) this.logger.warn(`Orphaned search photo ${storagePath}: ${error.message}`);
    }
  }

  /** Short-lived URL to show or download the photo. */
  async downloadUrl(user: AuthUser, id: string) {
    const db = this.supabase.forUser(user.accessToken);
    const doc = unwrap(await db.from('documents').select('storage_path').eq('id', id).single());
    const { data, error } = await db.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(doc.storage_path, DOWNLOAD_URL_TTL_SECONDS);
    if (error) throw toHttpError({ message: error.message });
    return { url: data.signedUrl, expiresIn: DOWNLOAD_URL_TTL_SECONDS };
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const db = this.supabase.forUser(user.accessToken);
    const doc = unwrap(await db.from('documents').delete().eq('id', id).select('storage_path').single());
    const { error } = await db.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path]);
    if (error) this.logger.warn(`Orphaned file ${doc.storage_path}: ${error.message}`);
  }
}
