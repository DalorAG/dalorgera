import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import type { DocumentItem } from '@/lib/api-types';
import { useDeleteDocumentMutation } from '@/store/api';

import { preparePhoto } from './prepare-photo';
import { useUploadDocument } from './use-upload-document';

export type PhotoSource = 'camera' | 'library';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  // Asks iOS for JPEG instead of HEIC.
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

/**
 * Takes or picks a photo of the device and stores it as its Produktfoto.
 * The previous Produktfoto is deleted once the new one is saved.
 * Resolves to false when the user cancelled or denied camera access.
 */
export function useProductPhoto(deviceId: string, current?: DocumentItem) {
  const upload = useUploadDocument();
  const [deleteDocument] = useDeleteDocumentMutation();
  const [saving, setSaving] = useState(false);

  const choose = useCallback(
    async (source: PhotoSource): Promise<boolean> => {
      if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return false;
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
          : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return false;

      setSaving(true);
      try {
        const photo = await preparePhoto(asset.uri).catch(() => ({ uri: asset.uri, mimeType: 'image/jpeg' as const }));
        await upload({ ...photo, kind: 'product_photo', deviceId });
        // The newest Produktfoto is the one shown, so a failed cleanup is not an error for the user.
        if (current) await deleteDocument(current.id).unwrap().catch(() => undefined);
        return true;
      } finally {
        setSaving(false);
      }
    },
    [current, deleteDocument, deviceId, upload],
  );

  return { choose, saving };
}
