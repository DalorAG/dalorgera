import { Injectable } from '@nestjs/common';

import type { AuthUser } from '../auth/auth.types.js';
import { unwrap } from '../common/db-error.js';
import type { ReceiptExtraction } from '../recognition/receipt-extraction.js';
import type { Tables } from '../supabase/database.types.js';
import { DOCUMENTS_BUCKET, SupabaseService, type Db } from '../supabase/supabase.service.js';
import type { CreateWarrantyRequestDto } from './warranty-requests.dto.js';
import { WarrantyRequestMailer, type MailAttachment } from './warranty-request.mailer.js';

/** Resend allows 40 MB per email, base64 included. */
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/**
 * Downloads the user's files (through their own RLS) to attach them to the team email.
 * Files that no longer fit are counted, not sent.
 */
export async function loadAttachments(
  db: Db,
  files: { storagePath: string; name: string }[],
): Promise<{ attachments: MailAttachment[]; skipped: number }> {
  const attachments: MailAttachment[] = [];
  let total = 0;
  let skipped = 0;
  for (const file of files) {
    const { data } = await db.storage.from(DOCUMENTS_BUCKET).download(file.storagePath);
    if (!data) continue;
    const bytes = Buffer.from(await data.arrayBuffer());
    if (total + bytes.length > MAX_ATTACHMENT_BYTES) {
      skipped++;
      continue;
    }
    total += bytes.length;
    const extension = file.storagePath.split('.').pop() ?? 'jpg';
    attachments.push({ filename: `${file.name}.${extension}`, content: bytes.toString('base64') });
  }
  return { attachments, skipped };
}
const COLUMNS = 'id, kind, document_id, product_name, category, brand, status, created_at';

type ResponseRow = Pick<
  Tables<'warranty_requests'>,
  'id' | 'kind' | 'document_id' | 'product_name' | 'category' | 'brand' | 'status' | 'created_at'
>;

function toResponse(row: ResponseRow) {
  return {
    id: row.id,
    kind: row.kind,
    documentId: row.document_id,
    productName: row.product_name,
    category: row.category,
    brand: row.brand,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const formatPrice = (cents: number | null, currency: string | null) =>
  cents == null ? null : new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency ?? 'EUR' }).format(cents / 100);

@Injectable()
export class WarrantyRequestsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly mailer: WarrantyRequestMailer,
  ) {}

  async list(user: AuthUser) {
    const rows = unwrap(
      await this.supabase
        .forUser(user.accessToken)
        .from('warranty_requests')
        .select(COLUMNS)
        .order('created_at', { ascending: false }),
    );
    return rows.map(toResponse);
  }

  async create(user: AuthUser, dto: CreateWarrantyRequestDto) {
    const db = this.supabase.forUser(user.accessToken);
    const productName = dto.productName.trim();
    const kind = dto.kind ?? 'extension';

    // Store, date and price come from the recognized receipt, not from the client.
    let extracted: ReceiptExtraction | null = null;
    let storagePath: string | null = null;
    if (dto.documentId) {
      const doc = unwrap(await db.from('documents').select('extracted, storage_path').eq('id', dto.documentId).single());
      extracted = doc.extracted as ReceiptExtraction | null;
      storagePath = doc.storage_path;
    }
    const product = extracted?.products.find((p) => p.name.toLowerCase() === productName.toLowerCase());
    const priceCents = product?.priceCents ?? (extracted && extracted.products.length <= 1 ? extracted.totalCents : null);

    const row = unwrap(
      await db
        .from('warranty_requests')
        .insert({
          user_id: user.id,
          kind,
          document_id: dto.documentId ?? null,
          product_name: productName,
          store: extracted?.merchant ?? null,
          purchase_date: extracted?.purchaseDate ?? null,
          price_cents: priceCents ?? null,
          currency: extracted?.currency ?? null,
          message: dto.message?.trim() || null,
          category: dto.category ?? null,
          brand: dto.brand?.trim() || null,
          serial_number: dto.serialNumber?.trim() || null,
          value_cents: dto.valueCents ?? null,
        })
        .select(`${COLUMNS}, store, purchase_date, price_cents, currency, message, serial_number, value_cents`)
        .single(),
    );

    const files = await loadAttachments(db, storagePath ? [{ storagePath, name: 'Beleg' }] : []);
    await this.mailer.send({
      id: row.id,
      kind,
      userEmail: user.email,
      productName: row.product_name,
      category: dto.category ?? null,
      brand: row.brand,
      serialNumber: row.serial_number,
      value: formatPrice(row.value_cents, 'EUR'),
      store: row.store,
      purchaseDate: row.purchase_date,
      price: formatPrice(row.price_cents, row.currency),
      message: row.message,
      attachments: files.attachments,
      skippedAttachments: files.skipped,
    });
    return toResponse(row);
  }
}
