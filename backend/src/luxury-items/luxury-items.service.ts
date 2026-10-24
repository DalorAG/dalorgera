import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';

import type { AuthUser } from '../auth/auth.types.js';
import { toHttpError, unwrap } from '../common/db-error.js';
import type { Tables } from '../supabase/database.types.js';
import { DOCUMENTS_BUCKET, SupabaseService } from '../supabase/supabase.service.js';
import { WarrantyRequestMailer } from '../warranty-requests/warranty-request.mailer.js';
import type { LuxuryCategory } from '../warranty-requests/warranty-requests.dto.js';
import { RECEIPT_URL_TTL_SECONDS, formatPrice } from '../warranty-requests/warranty-requests.service.js';
import type { CreateLuxuryItemDto, RequestInsuranceDto, UpdateLuxuryItemDto } from './luxury-items.dto.js';

const SELECT =
  '*, documents(id, mime_type, storage_path, created_at), warranty_requests(id, status, created_at)';

type ItemRow = Tables<'luxury_items'> & {
  documents: Pick<Tables<'documents'>, 'id' | 'mime_type' | 'storage_path' | 'created_at'>[];
  warranty_requests: Pick<Tables<'warranty_requests'>, 'id' | 'status' | 'created_at'>[];
};

const byCreatedAt = (a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at);

function toResponse(row: ItemRow) {
  // The latest request decides what the detail screen offers.
  const request = [...row.warranty_requests].sort(byCreatedAt).at(-1);
  return {
    id: row.id,
    category: row.category,
    brand: row.brand,
    model: row.model,
    valueCents: row.value_cents,
    currency: row.currency,
    serialNumber: row.serial_number,
    notes: row.notes,
    photos: [...row.documents].sort(byCreatedAt).map((d) => ({ id: d.id, mimeType: d.mime_type })),
    request: request ? { id: request.id, status: request.status, createdAt: request.created_at } : null,
    createdAt: row.created_at,
  };
}

const trimmed = (s: string | null | undefined) => (s == null ? s : s.trim() || null);

@Injectable()
export class LuxuryItemsService {
  private readonly logger = new Logger(LuxuryItemsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly mailer: WarrantyRequestMailer,
  ) {}

  async list(user: AuthUser) {
    const rows = unwrap(
      await this.supabase
        .forUser(user.accessToken)
        .from('luxury_items')
        .select(SELECT)
        .order('created_at', { ascending: false }),
    );
    return (rows as ItemRow[]).map(toResponse);
  }

  async get(user: AuthUser, id: string) {
    return toResponse(await this.load(user, id));
  }

  async create(user: AuthUser, dto: CreateLuxuryItemDto) {
    const db = this.supabase.forUser(user.accessToken);
    const row = unwrap(
      await db
        .from('luxury_items')
        .insert({
          user_id: user.id,
          category: dto.category,
          brand: dto.brand.trim(),
          model: dto.model.trim(),
          value_cents: dto.valueCents ?? null,
          serial_number: trimmed(dto.serialNumber) ?? null,
          notes: trimmed(dto.notes) ?? null,
        })
        .select('id')
        .single(),
    );
    if (dto.documentIds?.length) await this.attach(user, row.id, dto.documentIds);
    return this.get(user, row.id);
  }

  async update(user: AuthUser, id: string, dto: UpdateLuxuryItemDto) {
    const db = this.supabase.forUser(user.accessToken);
    const patch = {
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.brand !== undefined && { brand: dto.brand.trim() }),
      ...(dto.model !== undefined && { model: dto.model.trim() }),
      ...(dto.valueCents !== undefined && { value_cents: dto.valueCents }),
      ...(dto.serialNumber !== undefined && { serial_number: trimmed(dto.serialNumber) }),
      ...(dto.notes !== undefined && { notes: trimmed(dto.notes) }),
    };
    if (Object.keys(patch).length) unwrap(await db.from('luxury_items').update(patch).eq('id', id).select('id').single());
    if (dto.documentIds?.length) await this.attach(user, id, dto.documentIds);
    return this.get(user, id);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const db = this.supabase.forUser(user.accessToken);
    const docs = unwrap(await db.from('documents').select('storage_path').eq('luxury_item_id', id));
    const { data, error } = await db.from('luxury_items').delete().eq('id', id).select('id');
    if (error) throw toHttpError(error);
    if (!data.length) throw toHttpError({ code: 'PGRST116', message: 'not found' });

    // Document rows are removed by the FK cascade; the files must be removed explicitly.
    if (docs.length) {
      const { error: storageError } = await db.storage.from(DOCUMENTS_BUCKET).remove(docs.map((d) => d.storage_path));
      if (storageError) this.logger.warn(`Orphaned files for luxury item ${id}: ${storageError.message}`);
    }
  }

  /** Sends the item with all its photos to our insurance team. */
  async requestInsurance(user: AuthUser, id: string, dto: RequestInsuranceDto) {
    const db = this.supabase.forUser(user.accessToken);
    const item = await this.load(user, id);
    if (item.warranty_requests.some((r) => r.status !== 'closed')) {
      throw new ConflictException('Für diesen Artikel läuft bereits eine Anfrage');
    }

    const request = unwrap(
      await db
        .from('warranty_requests')
        .insert({
          user_id: user.id,
          kind: 'luxury',
          luxury_item_id: item.id,
          category: item.category,
          brand: item.brand,
          product_name: item.model,
          serial_number: item.serial_number,
          value_cents: item.value_cents,
          message: dto.message?.trim() || null,
        })
        .select('id')
        .single(),
    );

    const photos = [...item.documents].sort(byCreatedAt);
    const signed = photos.length
      ? (await db.storage.from(DOCUMENTS_BUCKET).createSignedUrls(photos.map((d) => d.storage_path), RECEIPT_URL_TTL_SECONDS)).data
      : null;
    await this.mailer.send({
      id: request.id,
      kind: 'luxury',
      userEmail: user.email,
      productName: item.model,
      category: item.category as LuxuryCategory,
      brand: item.brand,
      serialNumber: item.serial_number,
      value: formatPrice(item.value_cents, item.currency),
      store: null,
      purchaseDate: null,
      price: null,
      message: dto.message?.trim() || null,
      photoUrls: (signed ?? []).flatMap((s) => (s.signedUrl ? [s.signedUrl] : [])),
    });
    return this.get(user, id);
  }

  private async load(user: AuthUser, id: string): Promise<ItemRow> {
    const row = unwrap(await this.supabase.forUser(user.accessToken).from('luxury_items').select(SELECT).eq('id', id).single());
    return row as ItemRow;
  }

  /** Only the user's own documents that are not on a device yet. */
  private async attach(user: AuthUser, id: string, documentIds: string[]) {
    const attached = unwrap(
      await this.supabase
        .forUser(user.accessToken)
        .from('documents')
        .update({ luxury_item_id: id })
        .in('id', documentIds)
        .is('device_id', null)
        .select('id'),
    );
    if (attached.length !== new Set(documentIds).size) throw new BadRequestException('Unknown or already used photo');
  }
}
