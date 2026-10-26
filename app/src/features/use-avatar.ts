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
const URL_TTL_SECONDS = 10 * 60;
/** Signed again this long before it runs out. */
const RENEW_BEFORE_MS = 60 * 1000;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

// Signed URLs by storage path, so every avatar on screen shares one request. Failures are not kept.
const urls = new Map<string, { url: Promise<string>; expiresAt: number }>();

function signedUrl(path: string): Promise<string> {
  const cached = urls.get(path);
  if (cached && cached.expiresAt - RENEW_BEFORE_MS > Date.now()) return cached.url;
  const url = supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, URL_TTL_SECONDS)
    .then(({ data, error }) => {
      if (!data) throw error ?? new Error('No signed URL');
      return data.signedUrl;
    });
  urls.set(path, { url, expiresAt: Date.now() + URL_TTL_SECONDS * 1000 });
  url.catch(() => urls.delete(path));
  return url;
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
 * Only the owner can read it: the bucket is private and the short-lived link is renewed while shown.
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
    const load = () =>
      signedUrl(path).then(
        (u) => current && setLoaded({ path, url: u }),
        () => current && setLoaded({ path, url: null }),
      );
    load();
    // Renew before the link expires while the photo stays on screen.
    const timer = setInterval(load, (URL_TTL_SECONDS * 1000) / 2);
    return () => {
      current = false;
      clearInterval(timer);
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
