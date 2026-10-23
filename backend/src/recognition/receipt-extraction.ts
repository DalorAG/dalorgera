/** Structured data the model extracts from a receipt or warranty card photo. */
export type ReceiptExtraction = {
  /** Full transcription of the document, line by line. Stored separately in documents.raw_text. */
  rawText: string;
  documentType: 'receipt' | 'warranty_card' | 'invoice' | 'other';
  merchant: string | null;
  purchaseDate: string | null;
  totalCents: number | null;
  currency: string | null;
  products: {
    name: string;
    brand: string | null;
    category: string | null;
    priceCents: number | null;
    warrantyMonths: number | null;
  }[];
};

const nullable = (type: string) => ({ type: [type, 'null'] });

/** JSON schema for OpenAI structured outputs (strict mode: every field required). */
export const RECEIPT_EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rawText', 'documentType', 'merchant', 'purchaseDate', 'totalCents', 'currency', 'products'],
  properties: {
    rawText: {
      type: 'string',
      description: 'All text printed on the document, transcribed exactly, one printed line per line',
    },
    documentType: { type: 'string', enum: ['receipt', 'warranty_card', 'invoice', 'other'] },
    merchant: { ...nullable('string'), description: 'Store or seller name' },
    purchaseDate: { ...nullable('string'), description: 'Purchase date as YYYY-MM-DD' },
    totalCents: { ...nullable('integer'), description: 'Total amount in cents' },
    currency: { ...nullable('string'), description: 'ISO 4217 code, e.g. EUR' },
    products: {
      type: 'array',
      description:
        'Durable goods only (devices, appliances, electronics). Skip accessories under about 20 EUR/USD, bags, deposits, services. Extended warranties and insurances are not products.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'brand', 'category', 'priceCents', 'warrantyMonths'],
        properties: {
          name: {
            type: 'string',
            description:
              'Name a person would use: product type and model, e.g. "Waschmaschine WGG14400", "iPhone 15 128 GB", "Kopfhörer WH-1000XM5". Never only a model number.',
          },
          brand: nullable('string'),
          category: {
            ...nullable('string'),
            description: 'German category, e.g. Smartphone, Laptop, TV, Audio, Haushaltsgerät (Waschmaschine, Staubsauger), Küchengerät (Kaffeemaschine)',
          },
          priceCents: nullable('integer'),
          warrantyMonths: {
            ...nullable('integer'),
            description:
              'Warranty in months only if printed on the document, including an extended warranty bought with it, otherwise null',
          },
        },
      },
    },
  },
} as const;

export const EXTRACTION_PROMPT = `You read photos of receipts (Kassenbon), invoices and warranty cards (Garantieschein).
Most are German, but they can come from any European country or from the US. The photo may be skewed, curved, shadowed or partly cut off. Read carefully before answering.

Rules:
- Use null for anything that is not clearly readable. Never guess dates, prices or product names.
- First decide where the document is from: language, currency symbol, address, phone number, tax wording ("MwSt"/"VAT"/"TVA" is European, "Sales Tax" and a US state is American). Use that to read dates and numbers.
- Dates: return them as YYYY-MM-DD. The year is always the LAST part (or the first when it has 4 digits, YYYY-MM-DD). European documents write day first: DD.MM.YYYY, DD.MM.YY, DD/MM/YYYY, DD-MM-YYYY, so "22.10.26" is 2026-10-22 and "05.03.25" is 2025-03-05. US documents write month first: MM/DD/YYYY, MM/DD/YY, so "10/22/26" is 2026-10-22. Between day and month, a part above 12 is the day. Two-digit years are 20YY. Written months ("Oct 5, 2024", "5. Okt. 2024") are unambiguous. If day and month could be swapped and the origin is unclear, use null. Use the purchase date ("Datum", "Date"), not print, due or warranty dates. A purchase date is never after today's date given below.
- Prices: the separator followed by exactly two digits at the end is the decimal separator, the other one groups thousands. European: "1.299,00" or "1 299,00" is 129900 cents. US: "1,299.00" is 129900 cents. "49,90" and "49.90" are both 4990 cents. Convert to integer cents.
- currency is the ISO 4217 code of the amounts: "€" is EUR, "$" on a US document is USD, "CHF", "£" is GBP. Do not assume EUR when the document shows another currency.
- totalCents is the final amount paid ("Summe", "Gesamt", "Total", "zu zahlen", "Amount Due", "Balance Due"), not a subtotal, tax ("MwSt", "VAT", "Sales Tax") or change ("Rückgeld", "Change").
- A product spans its own line(s): name, then optionally "2 x 49,90" or "2 @ 49.90" (quantity x unit price) or a model number on the next line. Use the unit price for priceCents and keep one entry per distinct product. Discount lines ("Rabatt", "Discount", "Savings") belong to the product above them.
- merchant is the store name from the header (logo or top lines), not the street address or payment terminal.
- Extended warranties and insurances ("Garantieverlängerung", "36M Garantie Kompakt", "Schutzbrief", "Geräteversicherung", "AppleCare", "Protection Plan", "Extended Warranty") are not products. Leave them out of products and put their total duration into warrantyMonths of the product they cover (usually the line above; "36M" is 36, "3 Jahre" or "3 Year" is 36).
- Do not mix up lines of different products. If a line is ambiguous, leave its fields null.
- In rawText, transcribe every readable line exactly as printed (keep umlauts, prices, separators and line order).`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NUMERIC_DATE_RE = /(?<!\d)(\d{1,2})([./-])(\d{1,2})\2(\d{4}|\d{2})(?!\d)/g;
const ISO_DATE_RE = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g;

function isoDate(y: number, m: number, d: number): string | null {
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return y >= 2000 && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : null;
}

/**
 * Dates printed on the document, read the way the document writes them: day first in Europe
 * ("22.10.26" is 2026-10-22), month first on US documents with slashes ("10/22/26").
 */
export function datesInText(rawText: string, currency: string | null): string[] {
  const us = currency === 'USD';
  const found: string[] = [];
  for (const [, a, sep, b, y] of rawText.matchAll(NUMERIC_DATE_RE)) {
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    // Dots are always day first; slashes follow the document's origin.
    const [day, month] = us && sep === '/' ? [Number(b), Number(a)] : [Number(a), Number(b)];
    const date = isoDate(year, month, day);
    if (date) found.push(date);
  }
  for (const [, y, m, d] of rawText.matchAll(ISO_DATE_RE)) {
    const date = isoDate(Number(y), Number(m), Number(d));
    if (date) found.push(date);
  }
  return found;
}

const parts = (iso: string) => [Number(iso.slice(2, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))].sort((x, y) => x - y).join();

/**
 * The model sometimes swaps day, month and year ("22.10.26" read as 2022-10-26) or returns a future
 * date. Prefer the date as printed when it is made of the same numbers, and never accept a future one.
 */
export function correctPurchaseDate(date: string | null, rawText: string, currency: string | null, today: string): string | null {
  // null means the model could not read it; that stays null.
  if (!date) return null;
  const printed = [...new Set(datesInText(rawText, currency).filter((d) => d <= today))];
  if (printed.includes(date)) return date;
  const same = printed.find((d) => parts(d) === parts(date));
  if (same) return same;
  if (date <= today) return date;
  // A future date is wrong; use the printed one when there is no doubt which it is.
  return printed.length === 1 ? printed[0] : null;
}
export const MAX_RAW_TEXT = 20_000;

/** Drops values that do not match the expected format instead of trusting the model blindly. */
export function sanitizeExtraction(raw: ReceiptExtraction, today = new Date().toISOString().slice(0, 10)): ReceiptExtraction {
  const int = (v: number | null, max: number) => (Number.isInteger(v) && v! >= 0 && v! <= max ? v : null);
  const text = (v: string | null, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const modelDate = raw.purchaseDate && DATE_RE.test(raw.purchaseDate) && !Number.isNaN(Date.parse(raw.purchaseDate)) ? raw.purchaseDate : null;
  const currency = raw.currency && /^[A-Z]{3}$/.test(raw.currency) ? raw.currency : null;
  const date = correctPurchaseDate(modelDate, typeof raw.rawText === 'string' ? raw.rawText : '', currency, today);

  return {
    rawText: typeof raw.rawText === 'string' ? raw.rawText.replace(/\r\n?/g, '\n').trim().slice(0, MAX_RAW_TEXT) : '',
    documentType: ['receipt', 'warranty_card', 'invoice', 'other'].includes(raw.documentType) ? raw.documentType : 'other',
    merchant: text(raw.merchant, 120),
    purchaseDate: date,
    totalCents: int(raw.totalCents, 100_000_000),
    currency,
    products: mergeWarrantyExtensions((raw.products ?? []).slice(0, 20).flatMap((p) => {
      const name = text(p.name, 120);
      if (!name) return [];
      return [
        {
          name,
          brand: text(p.brand, 60),
          category: text(p.category, 60),
          priceCents: int(p.priceCents, 100_000_000),
          warrantyMonths: int(p.warrantyMonths, 240),
        },
      ];
    })),
  };
}

type Product = ReceiptExtraction['products'][number];

const WARRANTY_EXTENSION_RE = /garantie|gewährleistung|schutzbrief|versicherung|applecare|warranty|protection plan/i;

/** "36M BW Garantie Kompakt" is 36, "Garantieverlängerung 3 Jahre" and "3 Year Protection Plan" are 36. */
function extensionMonths(name: string): number | null {
  const months = /(\d{1,3})[\s-]*M(?:on(?:ate?|ths?)?|os?)?\b/i.exec(name);
  if (months) return Number(months[1]);
  const years = /(\d{1,2})[\s-]*(?:J(?:ahre?)?|Y(?:ears?|rs?)?)\b/i.exec(name);
  return years ? Number(years[1]) * 12 : null;
}

/**
 * An extended warranty sold with a device is not a device of its own: it is dropped from the
 * products and its duration goes to the device it covers (the product above it, else the first one).
 * The model is told the same; this catches the cases where it still lists the warranty line.
 */
export function mergeWarrantyExtensions(products: Product[]): Product[] {
  const isExtension = (p: Product) => WARRANTY_EXTENSION_RE.test(p.name);
  const devices = products.flatMap((p, index) => (isExtension(p) ? [] : [{ index, product: { ...p } }]));
  if (!devices.length) return products;

  products.forEach((p, index) => {
    if (!isExtension(p)) return;
    const months = p.warrantyMonths ?? extensionMonths(p.name);
    if (!months || months > 240) return;
    const target = devices.findLast((d) => d.index < index) ?? devices[0];
    target.product.warrantyMonths = Math.max(target.product.warrantyMonths ?? 0, months);
  });
  return devices.map((d) => d.product);
}
