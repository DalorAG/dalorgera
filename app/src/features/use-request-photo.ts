import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

import type { DocumentKind, ReceiptExtraction } from '@/lib/api-types';
import { useDeleteDocumentMutation, useRecognizeDocumentMutation } from '@/store/api';

import { preparePhoto } from './prepare-photo';
import type { PhotoSource } from './use-product-photo';
import { useUploadDocument } from './use-upload-document';

export type RequestPhoto = { id: string; uri: string; createdAt: string; extracted: ReceiptExtraction | null };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

/** Opens the camera or the gallery; resolves to the picked images, empty when cancelled or denied. */
async function pickImages(source: PhotoSource, limit: number): Promise<ImagePicker.ImagePickerAsset[]> {
  if (source === 'camera') {
    if (!(await ImagePicker.requestCameraPermissionsAsync()).granted) return [];
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    return result.canceled ? [] : result.assets;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    ...PICKER_OPTIONS,
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
  });
  return result.canceled ? [] : result.assets.slice(0, limit);
}

/** Uploads one picked image and runs recognition, so a receipt can pre-fill the form. */
function useUploadPhoto(kind: DocumentKind) {
  const upload = useUploadDocument();
  const [recognize] = useRecognizeDocumentMutation();
  return async (asset: ImagePicker.ImagePickerAsset): Promise<RequestPhoto> => {
    const prepared = await preparePhoto(asset.uri).catch(() => ({ uri: asset.uri, mimeType: 'image/jpeg' as const }));
    const uploaded = await upload({ ...prepared, kind });
    // A photo of the item itself has nothing to read; recognition only pre-fills.
    const recognized = await recognize(uploaded.id).unwrap().catch(() => null);
    return { id: uploaded.id, uri: prepared.uri, createdAt: uploaded.createdAt, extracted: recognized };
  };
}

/**
 * Photo of a receipt or the product itself, attached to a request for our insurance team.
 * Uploaded right away and recognized, so a receipt can pre-fill the form.
 */
export function useRequestPhoto() {
  const uploadPhoto = useUploadPhoto('receipt');
  const [photo, setPhoto] = useState<RequestPhoto | null>(null);
  const [busy, setBusy] = useState(false);

  /** Resolves to the attached photo, or null when the user cancelled. Throws when the upload failed. */
  const add = async (source: PhotoSource): Promise<RequestPhoto | null> => {
    const [asset] = await pickImages(source, 1);
    if (!asset) return null;
    setBusy(true);
    try {
      const next = await uploadPhoto(asset);
      setPhoto(next);
      return next;
    } finally {
      setBusy(false);
    }
  };

  return { photo, busy, add, clear: () => setPhoto(null) };
}

/**
 * Several photos (receipt, the item, certificate, serial number), uploaded one after another.
 * Stored as Produktfotos so they never show up in the Posteingang as open Belege.
 */
export function useRequestPhotos(max: number) {
  const uploadPhoto = useUploadPhoto('product_photo');
  const [deleteDocument] = useDeleteDocumentMutation();
  const [photos, setPhotos] = useState<RequestPhoto[]>([]);
  const [busy, setBusy] = useState(false);

  /** Resolves to the newly attached photos. Throws when an upload failed; the ones before it are kept. */
  const add = async (source: PhotoSource): Promise<RequestPhoto[]> => {
    const assets = await pickImages(source, max - photos.length);
    if (!assets.length) return [];
    setBusy(true);
    const added: RequestPhoto[] = [];
    try {
      for (const asset of assets) {
        const next = await uploadPhoto(asset);
        added.push(next);
        setPhotos((current) => [...current, next]);
      }
      return added;
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    setPhotos((current) => current.filter((p) => p.id !== id));
    // Not attached to anything yet; a failed delete only leaves an invisible file behind.
    deleteDocument(id).unwrap().catch(() => undefined);
  };

  return { photos, busy, add, remove, full: photos.length >= max };
}
