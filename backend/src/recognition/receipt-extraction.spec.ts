import { correctPurchaseDate, datesInText, mergeWarrantyExtensions, sanitizeExtraction, type ReceiptExtraction } from './receipt-extraction.js';

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
      products: [{ name: 'iPhone 15 128 GB', brand: 'Apple', category: 'Smartphone', priceCents: 94900, warrantyMonths: null, quantity: 1 }],
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

  it('reads US warranty plans', () => {
    expect(mergeWarrantyExtensions([product('MacBook Air 13'), product('3-Year Protection Plan')])).toEqual([product('MacBook Air 13', 36)]);
    expect(mergeWarrantyExtensions([product('Dyson V15'), product('Extended Warranty 24 Months')])).toEqual([product('Dyson V15', 24)]);
  });

  it('drops the warranty line even when its duration is unreadable', () => {
    expect(mergeWarrantyExtensions([product('iPhone 15'), product('Geräteversicherung')])).toEqual([product('iPhone 15')]);
  });
});

describe('purchase dates', () => {
  const today = '2026-10-23';

  it('reads printed dates day first, two-digit years as 20YY', () => {
    expect(datesInText('Datum: 22.10.26 14:05\nBon 05.03.2025', 'EUR')).toEqual(['2026-10-22', '2025-03-05']);
  });

  it('reads US slash dates month first', () => {
    expect(datesInText('10/22/26 2:05 PM', 'USD')).toEqual(['2026-10-22']);
    expect(datesInText('22/10/26', 'EUR')).toEqual(['2026-10-22']);
  });

  it('fixes a model date with day and year swapped', () => {
    expect(correctPurchaseDate('2022-10-26', 'MEDIAMARKT\n22.10.26 14:05', 'EUR', today)).toBe('2026-10-22');
  });

  it('keeps a model date that is printed or plausible', () => {
    expect(correctPurchaseDate('2026-10-22', '22.10.26', 'EUR', today)).toBe('2026-10-22');
    expect(correctPurchaseDate('2025-06-01', 'no date in text', 'EUR', today)).toBe('2025-06-01');
    expect(correctPurchaseDate(null, '22.10.26', 'EUR', today)).toBeNull();
  });

  it('never returns a future date', () => {
    expect(correctPurchaseDate('2027-01-01', 'Datum 21.10.2026', 'EUR', today)).toBe('2026-10-21');
    expect(correctPurchaseDate('2027-01-01', 'nothing', 'EUR', today)).toBeNull();
  });

  it('is applied by sanitizeExtraction', () => {
    expect(
      sanitizeExtraction(
        { rawText: 'OBI\n22.10.26', documentType: 'receipt', merchant: 'OBI', purchaseDate: '2022-10-26', totalCents: null, currency: 'EUR', products: [] },
        today,
      ).purchaseDate,
    ).toBe('2026-10-22');
  });
});

describe('product quantity', () => {
  const raw = (quantity: number | null) =>
    ({
      rawText: '',
      documentType: 'invoice',
      merchant: null,
      purchaseDate: null,
      totalCents: null,
      currency: null,
      products: [{ name: 'Laptop ThinkPad T14', brand: null, category: null, priceCents: 99900, warrantyMonths: null, quantity }],
    }) as unknown as ReceiptExtraction;

  it('keeps the number of units bought', () => {
    expect(sanitizeExtraction(raw(20)).products[0].quantity).toBe(20);
  });

  it('falls back to one unit and caps absurd values', () => {
    expect(sanitizeExtraction(raw(null)).products[0].quantity).toBe(1);
    expect(sanitizeExtraction(raw(0)).products[0].quantity).toBe(1);
    expect(sanitizeExtraction(raw(5000)).products[0].quantity).toBe(1);
  });
});
