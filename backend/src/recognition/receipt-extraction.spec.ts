import { mergeWarrantyExtensions, sanitizeExtraction } from './receipt-extraction.js';

describe('sanitizeExtraction', () => {
  it('keeps valid values and drops malformed ones', () => {
    const result = sanitizeExtraction({
      rawText: '  TECHNIKMARKT\r\nTotal 978,99 €  ',
      documentType: 'receipt',
      merchant: '  TechnikMarkt ',
      purchaseDate: '12.09.2023',
      totalCents: 97899,
      currency: 'eur',
      products: [
        { name: 'iPhone 15 128 GB', brand: 'Apple', category: 'Smartphone', priceCents: 94900, warrantyMonths: -1 },
        { name: ' ', brand: null, category: null, priceCents: null, warrantyMonths: null },
      ],
    });
    expect(result).toEqual({
      rawText: 'TECHNIKMARKT\nTotal 978,99 €',
      documentType: 'receipt',
      merchant: 'TechnikMarkt',
      purchaseDate: null,
      totalCents: 97899,
      currency: null,
      products: [{ name: 'iPhone 15 128 GB', brand: 'Apple', category: 'Smartphone', priceCents: 94900, warrantyMonths: null }],
    });
  });

  it('accepts ISO dates', () => {
    expect(
      sanitizeExtraction({ rawText: '', documentType: 'invoice', merchant: null, purchaseDate: '2023-09-12', totalCents: null, currency: 'EUR', products: [] })
        .purchaseDate,
    ).toBe('2023-09-12');
  });
});

describe('mergeWarrantyExtensions', () => {
  const product = (name: string, warrantyMonths: number | null = null) => ({
    name,
    brand: null,
    category: null,
    priceCents: null,
    warrantyMonths,
  });

  it('moves an extended warranty onto the device above it', () => {
    expect(mergeWarrantyExtensions([product('AirPods mit Ladecase'), product('36M BW Garantie Kompakt')])).toEqual([
      product('AirPods mit Ladecase', 36),
    ]);
  });

  it('uses the first device when the warranty comes first and reads years', () => {
    expect(
      mergeWarrantyExtensions([product('Garantieverlängerung 3 Jahre'), product('Waschmaschine WGG14400', 24), product('TV OLED55')]),
    ).toEqual([product('Waschmaschine WGG14400', 36), product('TV OLED55')]);
  });

  it('keeps a warranty bought on its own', () => {
    expect(mergeWarrantyExtensions([product('36M Garantie Kompakt')])).toEqual([product('36M Garantie Kompakt')]);
  });

  it('drops the warranty line even when its duration is unreadable', () => {
    expect(mergeWarrantyExtensions([product('iPhone 15'), product('Geräteversicherung')])).toEqual([product('iPhone 15')]);
  });
});
