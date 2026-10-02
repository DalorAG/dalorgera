// Response shapes of the Garantie-Radar API (backend/src/**/*.service.ts).

export type DeviceStatus = 'active' | 'expiring' | 'expired';
export type DocumentKind = 'receipt' | 'warranty_card' | 'invoice' | 'other';
export type DocumentMimeType = 'image/jpeg' | 'image/png' | 'image/heic' | 'image/webp' | 'application/pdf';

export type Device = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  store: string | null;
  purchaseDate: string;
  priceCents: number | null;
  currency: string;
  warrantyMonths: number;
  warrantyUntil: string | null;
  statutoryUntil: string;
  protectedUntil: string;
  daysLeft: number;
  progress: number;
  status: DeviceStatus;
  notes: string | null;
  documentsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DeviceInput = {
  name: string;
  category?: string;
  brand?: string;
  store?: string;
  purchaseDate: string;
  priceCents?: number;
  currency?: string;
  warrantyMonths?: number;
  notes?: string;
};

export type ReceiptExtraction = {
  documentType: DocumentKind;
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

export type DocumentItem = {
  id: string;
  deviceId: string | null;
  kind: DocumentKind;
  mimeType: DocumentMimeType;
  sizeBytes: number | null;
  storagePath: string;
  extracted: ReceiptExtraction | null;
  createdAt: string;
};

export type Reminder = {
  id: string;
  deviceId: string;
  deviceName: string | null;
  kind: 'warranty' | 'statutory';
  daysBefore: number;
  dueDate: string;
  remindAt: string;
};

export type UploadUrl = { storagePath: string; signedUrl: string; token: string };
