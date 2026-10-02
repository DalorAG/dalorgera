import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { AuthUser } from '../auth/auth.types.js';
import { toHttpError, unwrap } from '../common/db-error.js';
import { OpenAiRecognizer } from '../recognition/openai-recognizer.js';
import type { ReceiptExtraction } from '../recognition/receipt-extraction.js';
import type { Json, Tables } from '../supabase/database.types.js';
import { DOCUMENTS_BUCKET, SupabaseService } from '../supabase/supabase.service.js';
import {
  MIME_EXTENSIONS,
  type CreateDocumentDto,
  type CreateUploadUrlDto,
  type ListDocumentsQuery,
  type UpdateDocumentDto,
} from './dto/document.dto.js';

const DOWNLOAD_URL_TTL_SECONDS = 10 * 60;
const RECOGNITION_URL_TTL_SECONDS = 5 * 60;
/** Image types the vision model accepts. The app converts camera photos to JPEG. */
const RECOGNIZABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function toDocumentResponse(row: Tables<'documents'>) {
  return {
    id: row.id,
    deviceId: row.device_id,
    kind: row.kind,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    extracted: row.extracted as ReceiptExtraction | null,
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
    const path = `${user.id}/${randomUUID()}.${MIME_EXTENSIONS[dto.mimeType]}`;
    const { data, error } = await this.supabase
      .forUser(user.accessToken)
      .storage.from(DOCUMENTS_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw toHttpError({ message: error.message });
    return { storagePath: data.path, signedUrl: data.signedUrl, token: data.token };
  }

  async create(user: AuthUser, dto: CreateDocumentDto) {
    if (!dto.storagePath.startsWith(`${user.id}/`)) throw new BadRequestException('Invalid storage path');

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
        .select()
        .single(),
    );
    return toDocumentResponse(row);
  }

  async list(user: AuthUser, query: ListDocumentsQuery) {
    let q = this.supabase
      .forUser(user.accessToken)
      .from('documents')
      .select()
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);
    if (query.deviceId) q = q.eq('device_id', query.deviceId);
    if (query.kind) q = q.eq('kind', query.kind);
    return unwrap(await q).map(toDocumentResponse);
  }

  async update(user: AuthUser, id: string, dto: UpdateDocumentDto) {
    const patch: { kind?: Tables<'documents'>['kind']; device_id?: string | null } = {};
    if (dto.kind !== undefined) patch.kind = dto.kind;
    if (dto.deviceId !== undefined) patch.device_id = dto.deviceId;
    const row = unwrap(
      await this.supabase.forUser(user.accessToken).from('documents').update(patch).eq('id', id).select().single(),
    );
    return toDocumentResponse(row);
  }

  /**
   * Reads purchase data from the photo to prefill the device form.
   * The result is stored on the document, so each photo is sent to OpenAI only once.
   */
  async recognize(user: AuthUser, id: string): Promise<ReceiptExtraction> {
    const db = this.supabase.forUser(user.accessToken);
    const doc = unwrap(await db.from('documents').select('storage_path, mime_type, extracted').eq('id', id).single());
    if (doc.extracted) return doc.extracted as ReceiptExtraction;
    if (!RECOGNIZABLE_TYPES.has(doc.mime_type)) throw new BadRequestException('Only JPEG, PNG and WebP photos can be recognized');

    const { data, error } = await db.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(doc.storage_path, RECOGNITION_URL_TTL_SECONDS);
    if (error) throw toHttpError({ message: error.message });

    const extracted = await this.recognizer.extract(data.signedUrl);
    const { error: saveError } = await db
      .from('documents')
      .update({ extracted: extracted as unknown as Json, extracted_at: new Date().toISOString() })
      .eq('id', id);
    if (saveError) this.logger.warn(`Could not cache recognition for ${id}: ${saveError.message}`);
    return extracted;
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
