import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

import type { ReceiptExtraction } from '@/lib/api-types';
import { useRecognizeDocumentMutation } from '@/store/api';

import { preparePhoto } from './prepare-photo';
import { useUploadDocument } from './use-upload-document';

export type RequestPhoto = { id: string; uri: string; createdAt: string; extracted: ReceiptExtraction | null };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

/**
 * Photo of a receipt or the product itself, attached to a request for our insurance team.
 * Uploaded right away and recognized, so a receipt can pre-fill the form.
 */
export function useRequestPhoto() {
  const upload = useUploadDocument();
  const [recognize] = useRecognizeDocumentMutation();
  const [photo, setPhoto] = useState<RequestPhoto | null>(null);
  const [busy, setBusy] = useState(false);

  /** Resolves to the attached photo, or null when the user cancelled. Throws when the upload failed. */
  const add = async (source: 'camera' | 'library'): Promise<RequestPhoto | null> => {
    if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return null;
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS) : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return null;

    setBusy(true);
    try {
      const prepared = await preparePhoto(asset.uri).catch(() => ({ uri: asset.uri, mimeType: 'image/jpeg' as const }));
      const uploaded = await upload({ ...prepared, kind: 'receipt' });
      // Recognition only pre-fills the form; a photo of the product itself has nothing to read.
      const recognized = await recognize(uploaded.id).unwrap().catch(() => null);
      const next = { id: uploaded.id, uri: prepared.uri, createdAt: uploaded.createdAt, extracted: recognized };
      setPhoto(next);
      return next;
    } finally {
      setBusy(false);
    }
  };

  return { photo, busy, add, clear: () => setPhoto(null) };
}
