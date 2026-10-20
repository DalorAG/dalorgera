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
        'Durable goods only (devices, appliances, electronics). Skip accessories under 20 EUR, bags, deposits, services. Extended warranties and insurances are not products.',
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

export const EXTRACTION_PROMPT = `You read photos of German receipts (Kassenbon), invoices and warranty cards (Garantieschein).
The photo may be skewed, curved, shadowed or partly cut off. Read carefully before answering.

Rules:
- Use null for anything that is not clearly readable. Never guess dates, prices or product names.
- Dates are DD.MM.YYYY (or DD.MM.YY); return them as YYYY-MM-DD. Use the purchase date ("Datum"), not print, due or warranty dates.
- Prices use a decimal comma ("1.299,00" is 129900 cents). Convert to integer cents.
- totalCents is the final amount paid ("Summe", "Gesamt", "Total", "zu zahlen"), not a subtotal, VAT ("MwSt") or change ("Rückgeld").
- A product spans its own line(s): name, then optionally "2 x 49,90" (quantity x unit price) or a model number on the next line. Use the unit price for priceCents and keep one entry per distinct product. Discount lines ("Rabatt") belong to the product above them.
- merchant is the store name from the header (logo or top lines), not the street address or payment terminal.
- Extended warranties and insurances ("Garantieverlängerung", "36M Garantie Kompakt", "Schutzbrief", "Geräteversicherung", "AppleCare") are not products. Leave them out of products and put their total duration into warrantyMonths of the product they cover (usually the line above; "36M" is 36, "3 Jahre" is 36).
- Do not mix up lines of different products. If a line is ambiguous, leave its fields null.
- In rawText, transcribe every readable line exactly as printed (keep umlauts, prices and line order).`;

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

const WARRANTY_EXTENSION_RE = /garantie|gewährleistung|schutzbrief|versicherung|applecare/i;

/** "36M BW Garantie Kompakt" is 36, "Garantieverlängerung 3 Jahre" is 36. */
function extensionMonths(name: string): number | null {
  const months = /(\d{1,3})\s*M(?:on(?:ate?)?)?\b/i.exec(name);
  if (months) return Number(months[1]);
  const years = /(\d{1,2})\s*J(?:ahre?)?\b/i.exec(name);
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
