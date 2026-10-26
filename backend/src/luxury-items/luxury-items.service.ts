import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';

import type { AuthUser } from '../auth/auth.types.js';
import { consumeAiQuota } from '../common/ai-quota.js';
import { toHttpError, unwrap } from '../common/db-error.js';
import type { Tables } from '../supabase/database.types.js';
import { DOCUMENTS_BUCKET, SupabaseService } from '../supabase/supabase.service.js';
import { WarrantyRequestMailer } from '../warranty-requests/warranty-request.mailer.js';
import type { LuxuryCategory } from '../warranty-requests/warranty-requests.dto.js';
import { formatPrice, loadAttachments } from '../warranty-requests/warranty-requests.service.js';
import type { CreateLuxuryItemDto, RequestInsuranceDto, UpdateLuxuryItemDto } from './luxury-items.dto.js';
import { MarketValueEstimator } from './market-value-estimator.js';

const SELECT =
  '*, documents(id, kind, mime_type, storage_path, created_at), warranty_requests(id, status, created_at)';

type ItemRow = Tables<'luxury_items'> & {
  documents: Pick<Tables<'documents'>, 'id' | 'kind' | 'mime_type' | 'storage_path' | 'created_at'>[];
  warranty_requests: Pick<Tables<'warranty_requests'>, 'id' | 'status' | 'created_at'>[];
};

const byCreatedAt = (a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at);

const toDocument = (d: ItemRow['documents'][number]) => ({ id: d.id, kind: d.kind, mimeType: d.mime_type, createdAt: d.created_at });

/** Arranged photos first, in the owner's order; the rest (new uploads) by upload time. */
function inPhotoOrder<T extends { id: string }>(photos: T[], order: string[] | null | undefined): T[] {
  const rank = new Map((order ?? []).map((id, i) => [id, i]));
  return photos
    .map((p, i) => ({ p, key: rank.get(p.id) ?? rank.size + i }))
    .sort((a, b) => a.key - b.key)
    .map(({ p }) => p);
}

function toResponse(row: ItemRow) {
  // The latest request decides what the detail screen offers.
  const request = [...row.warranty_requests].sort(byCreatedAt).at(-1);
  const documents = [...row.documents].sort(byCreatedAt);
  return {
    id: row.id,
    category: row.category,
    brand: row.brand,
    model: row.model,
    valueCents: row.value_cents,
    purchasePriceCents: row.purchase_price_cents,
    purchaseDate: row.purchase_date,
    store: row.store,
    referenceNumber: row.reference_number,
    hasBoxPapers: row.has_box_papers,
    currency: row.currency,
    serialNumber: row.serial_number,
    notes: row.notes,
    photos: inPhotoOrder(
      documents.filter((d) => d.kind !== 'invoice'),
      row.photo_order,
    ).map(toDocument),
    invoices: documents.filter((d) => d.kind === 'invoice').map(toDocument),
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
    private readonly estimator: MarketValueEstimator,
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
          purchase_price_cents: dto.purchasePriceCents ?? null,
          purchase_date: dto.purchaseDate ?? null,
          store: trimmed(dto.store) ?? null,
          reference_number: trimmed(dto.referenceNumber) ?? null,
          has_box_papers: dto.hasBoxPapers ?? false,
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
      ...(dto.purchasePriceCents !== undefined && { purchase_price_cents: dto.purchasePriceCents }),
      ...(dto.purchaseDate !== undefined && { purchase_date: dto.purchaseDate }),
      ...(dto.store !== undefined && { store: trimmed(dto.store) }),
      ...(dto.referenceNumber !== undefined && { reference_number: trimmed(dto.referenceNumber) }),
      ...(dto.hasBoxPapers !== undefined && { has_box_papers: dto.hasBoxPapers }),
      ...(dto.serialNumber !== undefined && { serial_number: trimmed(dto.serialNumber) }),
      ...(dto.notes !== undefined && { notes: trimmed(dto.notes) }),
      ...(dto.photoOrder !== undefined && { photo_order: dto.photoOrder }),
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
    const files = await loadAttachments(
      db,
      photos.map((d, i) => ({ storagePath: d.storage_path, name: `${d.kind === 'product_photo' ? 'Foto' : 'Beleg'}-${i + 1}` })),
    );
    await this.mailer.send({
      id: request.id,
      kind: 'luxury',
      userEmail: user.email,
      productName: item.model,
      category: item.category as LuxuryCategory,
      brand: item.brand,
      serialNumber: item.serial_number,
      referenceNumber: item.reference_number,
      hasBoxPapers: item.has_box_papers,
      value: formatPrice(item.value_cents, item.currency),
      store: item.store,
      purchaseDate: item.purchase_date,
      price: formatPrice(item.purchase_price_cents, item.currency),
      message: dto.message?.trim() || null,
      attachments: files.attachments,
      skippedAttachments: files.skipped,
    });
    return this.get(user, id);
  }

  async estimateMarketValue(user: AuthUser, id: string, language: string) {
    const row = await this.load(user, id);
    // Web search plus a large model: the most expensive call in the app.
    await consumeAiQuota(this.supabase.forUser(user.accessToken), 'market_value');
    return this.estimator.estimate(
      {
        category: row.category,
        brand: row.brand,
        model: row.model,
        referenceNumber: row.reference_number,
        purchaseDate: row.purchase_date,
        purchasePriceCents: row.purchase_price_cents,
        hasBoxPapers: row.has_box_papers,
        notes: row.notes,
      },
      language,
    );
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
