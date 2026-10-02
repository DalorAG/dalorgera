import type { Tables, TablesInsert } from '../supabase/database.types.js';
import type { CreateDeviceDto, DeviceStatus, UpdateDeviceDto } from './dto/device.dto.js';

/** Days before the deadline at which a device counts as "expiring". */
export const EXPIRING_WITHIN_DAYS = 30;

const DAY_MS = 86_400_000;

type DeviceRow = Tables<'devices'> & { documents?: { count: number }[] };

export function toDeviceInsert(dto: CreateDeviceDto | UpdateDeviceDto): Partial<TablesInsert<'devices'>> {
  const row: Partial<TablesInsert<'devices'>> = {
    name: dto.name,
    category: dto.category,
    brand: dto.brand,
    store: dto.store,
    purchase_date: dto.purchaseDate,
    price_cents: dto.priceCents,
    currency: dto.currency,
    warranty_months: dto.warrantyMonths,
    notes: dto.notes,
  };
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
}

function daysUntil(date: string, today: Date): number {
  return Math.ceil((Date.parse(`${date}T00:00:00Z`) - today.getTime()) / DAY_MS);
}

/** API shape: camelCase plus values the UI needs (days left, progress ring, status). */
export function toDeviceResponse(row: DeviceRow, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Generated column: the later of Garantie and Gewährleistung.
  const protectedUntil = row.protected_until!;
  const daysLeft = daysUntil(protectedUntil, today);
  const totalDays = Math.max(1, daysUntil(protectedUntil, new Date(`${row.purchase_date}T00:00:00Z`)));
  const status: DeviceStatus = daysLeft < 0 ? 'expired' : daysLeft <= EXPIRING_WITHIN_DAYS ? 'expiring' : 'active';

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand,
    store: row.store,
    purchaseDate: row.purchase_date,
    priceCents: row.price_cents,
    currency: row.currency,
    warrantyMonths: row.warranty_months,
    warrantyUntil: row.warranty_months > 0 ? row.warranty_until : null,
    statutoryUntil: row.statutory_until,
    protectedUntil,
    daysLeft,
    progress: Math.min(1, Math.max(0, 1 - daysLeft / totalDays)),
    status,
    notes: row.notes,
    documentsCount: row.documents?.[0]?.count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type DeviceResponse = ReturnType<typeof toDeviceResponse>;
