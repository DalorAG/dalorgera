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
  serialNumber: string | null;
  imei: string | null;
  documentsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DeviceInput = {
  kind?: DeviceKind;
  name: string;
  /** Optional fields: null clears them on update. */
  category?: string | null;
  brand?: string | null;
  store?: string | null;
  purchaseDate: string;
  priceCents?: number | null;
  currency?: string;
  warrantyMonths?: number;
  maintenanceIntervalMonths?: number;
  validUntil?: string;
  notes?: string | null;
  serialNumber?: string | null;
  imei?: string | null;
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
  luxuryItemId: string | null;
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

export type WarrantyRequestKind = 'extension' | 'luxury';
export type LuxuryCategory = 'watch' | 'jewelry' | 'bag' | 'other';

/** A Garantieverlängerung or Luxus-Versicherung request sent to our insurance team. */
export type WarrantyRequest = {
  id: string;
  kind: WarrantyRequestKind;
  documentId: string | null;
  /** For luxury items the model, e.g. Submariner */
  productName: string;
  category: LuxuryCategory | null;
  brand: string | null;
  status: WarrantyRequestStatus;
  createdAt: string;
};

export type CreateWarrantyRequest = {
  kind?: WarrantyRequestKind;
  documentId?: string;
  productName: string;
  message?: string;
  category?: LuxuryCategory;
  brand?: string;
  serialNumber?: string;
  valueCents?: number;
};

export type LuxuryDocument = { id: string; kind: DocumentKind; mimeType: DocumentMimeType; createdAt: string };

/** A watch, piece of jewellery or bag kept in the Tresor; insurance is requested per item. */
export type LuxuryItem = {
  id: string;
  category: LuxuryCategory;
  brand: string;
  model: string;
  /** Aktueller Wert, also what gets insured */
  valueCents: number | null;
  purchasePriceCents: number | null;
  purchaseDate: string | null;
  store: string | null;
  referenceNumber: string | null;
  hasBoxPapers: boolean;
  currency: string;
  serialNumber: string | null;
  notes: string | null;
  photos: LuxuryDocument[];
  /** Rechnungen (documents of kind invoice) */
  invoices: LuxuryDocument[];
  /** The latest insurance request, null until the user asked for one */
  request: { id: string; status: WarrantyRequestStatus; createdAt: string } | null;
  createdAt: string;
};

/** Today's resale value of a Wertsache, estimated from web listings; not saved until the user takes it over. */
export type MarketValueEstimate = {
  valueCents: number;
  lowCents: number;
  highCents: number;
  currency: string;
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  sources: { title: string; url: string }[];
};

export type LuxuryItemInput = {
  category: LuxuryCategory;
  brand: string;
  model: string;
  valueCents?: number | null;
  purchasePriceCents?: number | null;
  purchaseDate?: string | null;
  store?: string | null;
  referenceNumber?: string | null;
  hasBoxPapers?: boolean;
  serialNumber?: string | null;
  notes?: string | null;
  /** Uploaded documents to attach: photos and the Rechnung */
  documentIds?: string[];
};
