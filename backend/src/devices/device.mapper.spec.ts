import type { Tables } from '../supabase/database.types.js';
import { toDeviceInsert, toDeviceResponse } from './device.mapper.js';

const row = (overrides: Partial<Tables<'devices'>> = {}): Tables<'devices'> => ({
  id: 'd1',
  user_id: 'u1',
  name: 'iPhone 15',
  category: 'Smartphone',
  brand: null,
  store: 'TechnikMarkt',
  purchase_date: '2024-01-01',
  price_cents: 94900,
  currency: 'EUR',
  warranty_months: 24,
  warranty_until: '2026-01-01',
  statutory_until: '2026-01-01',
  protected_until: '2026-01-01',
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('toDeviceResponse', () => {
  it('computes days left, progress and status', () => {
    const res = toDeviceResponse(row(), new Date('2025-01-01T12:00:00Z'));
    expect(res.daysLeft).toBe(365);
    expect(res.progress).toBeCloseTo(0.5, 2);
    expect(res.status).toBe('active');
  });

  it('marks devices within 30 days as expiring', () => {
    expect(toDeviceResponse(row(), new Date('2025-12-10T08:00:00Z')).status).toBe('expiring');
  });

  it('marks past deadlines as expired and clamps progress', () => {
    const res = toDeviceResponse(row(), new Date('2026-03-01T00:00:00Z'));
    expect(res.status).toBe('expired');
    expect(res.progress).toBe(1);
  });

  it('hides the warranty date when there is no manufacturer warranty', () => {
    expect(toDeviceResponse(row({ warranty_months: 0 })).warrantyUntil).toBeNull();
  });
});

describe('toDeviceInsert', () => {
  it('maps to snake_case and drops undefined fields', () => {
    expect(toDeviceInsert({ name: 'Kopfhörer', purchaseDate: '2024-03-03', warrantyMonths: 12 })).toEqual({
      name: 'Kopfhörer',
      purchase_date: '2024-03-03',
      warranty_months: 12,
    });
  });
});
