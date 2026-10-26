import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAppSelector } from '@/store';
import { useCreateUploadUrlMutation } from '@/store/api';

import type { PhotoSource } from './use-product-photo';
import { uploadSigned } from './use-upload-document';

const BUCKET = 'documents';
const SIDE = 512;
const URL_TTL_SECONDS = 60 * 60;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

// Signed URLs by storage path, so every avatar on screen shares one request.
const urls = new Map<string, Promise<string | null>>();

function signedUrl(path: string): Promise<string | null> {
  if (!urls.has(path)) {
    urls.set(
      path,
      supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, URL_TTL_SECONDS)
        .then(({ data }) => data?.signedUrl ?? null),
    );
  }
  return urls.get(path)!;
}

async function square(uri: string): Promise<string> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const resized =
    Math.max(original.width, original.height) > SIDE
      ? await ImageManipulator.manipulate(original)
          .resize(original.width <= original.height ? { width: SIDE } : { height: SIDE })
          .renderAsync()
      : original;
  return (await resized.saveAsync({ compress: 0.8, format: SaveFormat.JPEG })).uri;
}

/**
 * Profilfoto: a JPEG in the user's own folder of the documents bucket (so account deletion removes it),
 * its path kept in the Supabase user metadata. No document row, it is not a Beleg.
 */
export function useAvatar() {
  const path = useAppSelector((s) => s.auth.avatarPath);
  const [createUploadUrl] = useCreateUploadUrlMutation();
  const [loaded, setLoaded] = useState<{ path: string; url: string | null } | null>(null);
  const url = path && loaded?.path === path ? loaded.url : null;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!path) return;
    let current = true;
    signedUrl(path).then(
      (u) => current && setLoaded({ path, url: u }),
      () => current && setLoaded({ path, url: null }),
    );
    return () => {
      current = false;
    };
  }, [path]);

  /** Resolves to false when the user cancelled or denied camera access. */
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
        const uri = await square(asset.uri).catch(() => asset.uri);
        const { storagePath, token } = await createUploadUrl({ mimeType: 'image/jpeg' }).unwrap();
        await uploadSigned(uri, storagePath, token, 'image/jpeg');
        const { error } = await supabase.auth.updateUser({ data: { avatar_path: storagePath } });
        if (error) throw error;
        // The old photo is only clutter now; a failed cleanup is not the user's problem.
        if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
        return true;
      } finally {
        setSaving(false);
      }
    },
    [createUploadUrl, path],
  );

  const remove = useCallback(async () => {
    if (!path) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { avatar_path: null } });
      if (error) throw error;
      await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
    } finally {
      setSaving(false);
    }
  }, [path]);

  return { url, hasPhoto: !!path, saving, choose, remove };
}
