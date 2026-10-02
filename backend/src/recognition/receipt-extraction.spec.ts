import { sanitizeExtraction } from './receipt-extraction.js';

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
