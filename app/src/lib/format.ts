import i18n, { formatLocale } from '@/i18n';

/** 2023-09-12 → 12.09.2023 (de, ru) or 12/09/2023 (en) */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '–';
  const [y, m, d] = iso.slice(0, 10).split('-');
  const sep = i18n.language === 'en' ? '/' : '.';
  return `${d}${sep}${m}${sep}${y}`;
}

/** 12.09.2023, 12/09/2023 or 2023-09-12 → 2023-09-12, otherwise null */
export function parseDate(input: string): string | null {
  const s = input.trim();
  const de = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s);
  const iso = de ? `${de[3]}-${de[2].padStart(2, '0')}-${de[1].padStart(2, '0')}` : s;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : null;
}

export function formatPrice(cents: number | null | undefined, currency = 'EUR'): string {
  if (cents == null) return '';
  return new Intl.NumberFormat(formatLocale(), { style: 'currency', currency }).format(cents / 100);
}

/** EUR → €, USD → $, CHF → CHF */
export function currencySymbol(currency: string | null | undefined = 'EUR'): string {
  try {
    const parts = new Intl.NumberFormat(formatLocale(), { style: 'currency', currency: currency ?? 'EUR' }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? currency ?? '€';
  } catch {
    return currency ?? '€';
  }
}

/** "949,00" / "949.00" / "949" / "1.299,00" / "1,299.00" → cents; the last separator before 1–2 digits is the decimal one. */
export function parsePrice(input: string): number | null {
  const s = input.replace(/[^\d,.]/g, '');
  if (!/\d/.test(s) || input.includes('-')) return null;
  const decimals = /[.,](\d{1,2})$/.exec(s);
  const whole = (decimals ? s.slice(0, decimals.index) : s).replace(/[.,]/g, '');
  const value = Number(`${whole || '0'}.${decimals?.[1] ?? '0'}`);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** Sum of prices for purchases (and services) in the given month, e.g. for "Im Oktober ausgegeben". */
export function spentInMonth(items: { purchaseDate: string; priceCents: number | null; currency: string }[], month: Date) {
  const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const inMonth = items.filter((i) => i.purchaseDate.startsWith(prefix) && i.priceCents != null && i.currency === 'EUR');
  return { cents: inMonth.reduce((sum, i) => sum + i.priceCents!, 0), count: inMonth.length };
}

/** Human readable remaining time for badges and cards. */
export function remainingLabel(daysLeft: number): string {
  if (daysLeft < 0) return i18n.t('labels:remaining.expired');
  if (daysLeft === 0) return i18n.t('labels:remaining.today');
  if (daysLeft <= 60) return i18n.t('labels:remaining.days', { count: daysLeft });
  return i18n.t('labels:remaining.months', { count: Math.round(daysLeft / 30.44) });
}

export function apiErrorMessage(err: unknown): string {
  const e = err as { status?: number | string; data?: { message?: string | string[] }; message?: string };
  if (e?.status === 'FETCH_ERROR') return i18n.t('labels:apiError.network');
  const msg = e?.data?.message ?? e?.message;
  return Array.isArray(msg) ? msg.join('\n') : (msg ?? i18n.t('labels:apiError.generic'));
}
