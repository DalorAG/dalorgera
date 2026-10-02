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
      description: 'Durable goods only (devices, appliances, electronics). Skip accessories under 20 EUR, bags, deposits, services.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'brand', 'category', 'priceCents', 'warrantyMonths'],
        properties: {
          name: { type: 'string', description: 'Short product name, e.g. "iPhone 15 128 GB"' },
          brand: nullable('string'),
          category: { ...nullable('string'), description: 'German category, e.g. Smartphone, Küchengerät, Audio' },
          priceCents: nullable('integer'),
          warrantyMonths: {
            ...nullable('integer'),
            description: 'Manufacturer warranty in months only if printed on the document, otherwise null',
          },
        },
      },
    },
  },
} as const;

export const EXTRACTION_PROMPT = `You read photos of German receipts (Kassenbon), invoices and warranty cards (Garantieschein).
Extract the purchase data. Use null for anything that is not clearly readable; never guess dates or prices.
Dates on German receipts are DD.MM.YYYY; return them as YYYY-MM-DD.
In rawText, transcribe every readable line exactly as printed (keep umlauts, prices and line order).`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_RAW_TEXT = 20_000;

/** Drops values that do not match the expected format instead of trusting the model blindly. */
export function sanitizeExtraction(raw: ReceiptExtraction): ReceiptExtraction {
  const int = (v: number | null, max: number) => (Number.isInteger(v) && v! >= 0 && v! <= max ? v : null);
  const text = (v: string | null, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const date = raw.purchaseDate && DATE_RE.test(raw.purchaseDate) && !Number.isNaN(Date.parse(raw.purchaseDate)) ? raw.purchaseDate : null;

  return {
    rawText: typeof raw.rawText === 'string' ? raw.rawText.replace(/\r\n?/g, '\n').trim().slice(0, MAX_RAW_TEXT) : '',
    documentType: ['receipt', 'warranty_card', 'invoice', 'other'].includes(raw.documentType) ? raw.documentType : 'other',
    merchant: text(raw.merchant, 120),
    purchaseDate: date,
    totalCents: int(raw.totalCents, 100_000_000),
    currency: raw.currency && /^[A-Z]{3}$/.test(raw.currency) ? raw.currency : null,
    products: (raw.products ?? []).slice(0, 20).flatMap((p) => {
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
    }),
  };
}
