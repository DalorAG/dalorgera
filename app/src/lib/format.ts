/** 2023-09-12 → 12.09.2023 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '–';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/** 12.09.2023 or 2023-09-12 → 2023-09-12, otherwise null */
export function parseDate(input: string): string | null {
  const s = input.trim();
  const de = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  const iso = de ? `${de[3]}-${de[2].padStart(2, '0')}-${de[1].padStart(2, '0')}` : s;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : null;
}

export function formatPrice(cents: number | null | undefined, currency = 'EUR'): string {
  if (cents == null) return '';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(cents / 100);
}

/** "949,00" / "949.00" / "949" → 94900 */
export function parsePrice(input: string): number | null {
  const normalized = input.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
}

/** Human readable remaining time for badges and cards. */
export function remainingLabel(daysLeft: number): string {
  if (daysLeft < 0) return 'Abgelaufen';
  if (daysLeft === 0) return 'Läuft heute ab';
  if (daysLeft <= 60) return daysLeft === 1 ? 'Nur noch 1 Tag' : `Nur noch ${daysLeft} Tage`;
  const months = Math.round(daysLeft / 30.44);
  return months === 1 ? 'Noch 1 Monat' : `Noch ${months} Monate`;
}

export function apiErrorMessage(err: unknown): string {
  const e = err as { status?: number | string; data?: { message?: string | string[] }; message?: string };
  if (e?.status === 'FETCH_ERROR') return 'Server nicht erreichbar. Prüfe deine Verbindung.';
  const msg = e?.data?.message ?? e?.message;
  return Array.isArray(msg) ? msg.join('\n') : (msg ?? 'Etwas ist schiefgelaufen.');
}
