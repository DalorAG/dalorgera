import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { DocumentKind, ReceiptExtraction } from '@/lib/api-types';

/** Hands the scanned document and its recognized data from the scanner to the device form. */
type ScanState = {
  documentId: string | null;
  kind: DocumentKind;
  extraction: ReceiptExtraction | null;
};

const initialState: ScanState = { documentId: null, kind: 'receipt', extraction: null };

export const scanSlice = createSlice({
  name: 'scan',
  initialState,
  reducers: {
    scanCompleted: (_state, action: PayloadAction<ScanState>) => action.payload,
    scanCleared: () => initialState,
  },
});

export const { scanCompleted, scanCleared } = scanSlice.actions;
