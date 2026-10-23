// Response shapes of the Garantie-Radar API (backend/src/**/*.service.ts).

export type Me = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
  terms: { currentVersion: string; accepted: boolean; acceptedAt: string | null };
};

export type DeviceStatus = 'active' | 'expiring' | 'expired';
/** statutory = Gewährleistung only, warranty = Garantie, maintenance = recurring Wartung, vignette = Autobahnvignette. */
export type DeviceKind = 'statutory' | 'warranty' | 'maintenance' | 'vignette';
export type DocumentKind = 'receipt' | 'warranty_card' | 'invoice' | 'other' | 'product_photo';
export type DocumentMimeType = 'image/jpeg' | 'image/png' | 'image/heic' | 'image/webp' | 'application/pdf';

export type Device = {
  id: string;
  kind: DeviceKind;
  name: string;
  category: string | null;
  brand: string | null;
  store: string | null;
  purchaseDate: string;
  priceCents: number | null;
  currency: string;
  warrantyMonths: number;
  maintenanceIntervalMonths: number | null;
  /** Last valid day of a vignette. */
  validUntil: string | null;
  warrantyUntil: string | null;
  statutoryUntil: string;
  /** End of protection, the next Wartung, or the last valid day of a vignette. */
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
  kind?: DeviceKind;
  name: string;
  category?: string;
  brand?: string;
  store?: string;
  purchaseDate: string;
  priceCents?: number;
  currency?: string;
  warrantyMonths?: number;
  maintenanceIntervalMonths?: number;
  validUntil?: string;
  notes?: string;
};

export type ReceiptExtraction = {
  /** Full text of the document, line by line. */
  rawText?: string;
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
  rawText: string | null;
  createdAt: string;
};

export type Reminder = {
  id: string;
  deviceId: string;
  deviceName: string | null;
  kind: 'warranty' | 'statutory' | 'maintenance' | 'vignette' | 'burden_of_proof';
  daysBefore: number;
  dueDate: string;
  remindAt: string;
};

export type UploadUrl = { storagePath: string; signedUrl: string; token: string };

export type WarrantyRequestStatus = 'new' | 'contacted' | 'closed';

/** A Garantieverlängerung request sent to our insurance team. */
export type WarrantyRequest = {
  id: string;
  documentId: string | null;
  productName: string;
  status: WarrantyRequestStatus;
  createdAt: string;
};
