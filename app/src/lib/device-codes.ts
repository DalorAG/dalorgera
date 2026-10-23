import type { BarcodeType } from 'expo-camera';

export type CodeTarget = 'imei' | 'serial';

/** 15 digits with a valid Luhn check digit, e.g. 356938035643809. */
export function isValidImei(value: string): boolean {
  if (!/^\d{15}$/.test(value)) return false;
  const sum = [...value].reduce((acc, ch, i) => {
    let n = Number(ch);
    if (i % 2 === 1) n = n * 2 > 9 ? n * 2 - 9 : n * 2;
    return acc + n;
  }, 0);
  return sum % 10 === 0;
}

/** Product codes (EAN/UPC) on the same box are never the Seriennummer. */
const PRODUCT_CODE_TYPES = new Set<string>(['ean13', 'ean8', 'upc_a', 'upc_e', 'itf14']);

/**
 * Picks the wanted value out of a scanned barcode, or null when it is another code on the box
 * (boxes carry EAN, IMEI and serial barcodes side by side).
 */
export function readScannedCode(target: CodeTarget, data: string, type: BarcodeType | string): string | null {
  const raw = data.trim();
  if (target === 'imei') {
    // "IMEI 35-693803-564380-9" or "35693803564380 9"
    const digits = raw.replace(/^IMEI\s*:?\s*/i, '').replace(/[\s-]/g, '');
    return isValidImei(digits) ? digits : null;
  }
  if (PRODUCT_CODE_TYPES.has(type) || isValidImei(raw.replace(/[\s-]/g, ''))) return null;
  // "S/N: C02XK1JHJG5J", "(S) C02XK1JHJG5J", "SN C02XK1JHJG5J"
  const serial = raw.replace(/^(?:\(S\)|S\/?N|Serial(?:\s*No\.?)?)\s*[:#]?\s*/i, '').replace(/\s+/g, '');
  return /^[A-Za-z0-9\-/.]{4,64}$/.test(serial) ? serial.toUpperCase() : null;
}

export const CODE_BARCODE_TYPES: BarcodeType[] = ['code128', 'code39', 'code93', 'datamatrix', 'qr', 'pdf417', 'ean13', 'upc_a'];
