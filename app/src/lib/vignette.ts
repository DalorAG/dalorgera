// Austrian Autobahnvignette ("Autobahn-Pickerl"), validity rules of ASFINAG.

export type VignetteType = 'year' | 'twoMonths' | 'tenDays' | 'oneDay';

export const VIGNETTE_TYPES: { type: VignetteType; label: string }[] = [
  { type: 'year', label: 'Jahresvignette' },
  { type: 'twoMonths', label: '2-Monats-Vignette' },
  { type: 'tenDays', label: '10-Tages-Vignette' },
  { type: 'oneDay', label: '1-Tages-Vignette' },
];

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/** Same calendar day `months` later, clamped to the end of a shorter month (31.12. + 2 → 28./29.02.). */
function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return iso(new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay))));
}

/** The Jahresvignette for `year` is valid from 1.12. of the previous year until 31.1. of the next year. */
export function yearVignettePeriod(year: number): { validFrom: string; validUntil: string } {
  return { validFrom: `${year - 1}-12-01`, validUntil: `${year + 1}-01-31` };
}

/** First and last valid day (both inclusive). `validFrom` is ignored for the Jahresvignette. */
export function vignettePeriod(type: VignetteType, validFrom: string, year: number): { validFrom: string; validUntil: string } {
  switch (type) {
    case 'year':
      return yearVignettePeriod(year);
    case 'twoMonths':
      return { validFrom, validUntil: addMonths(validFrom, 2) };
    case 'tenDays':
      return { validFrom, validUntil: addDays(validFrom, 9) };
    case 'oneDay':
      return { validFrom, validUntil: validFrom };
  }
}

/** Jahresvignetten that are valid now or later; in January last year's one is still valid. */
export function selectableVignetteYears(today = new Date()): number[] {
  const year = today.getFullYear();
  return today.getMonth() === 0 ? [year - 1, year, year + 1] : [year, year + 1];
}

/** The Jahresvignette that is valid today (from December on: next year's one). */
export function currentVignetteYear(today = new Date()): number {
  return today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
}
