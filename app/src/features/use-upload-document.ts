import { File, UploadType } from 'expo-file-system';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import type { DocumentItem, DocumentKind, DocumentMimeType } from '@/lib/api-types';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useCreateDocumentMutation, useCreateUploadUrlMutation } from '@/store/api';

const BUCKET = 'documents';

/** Web: through supabase-js. Returns the uploaded size in bytes. */
async function uploadWeb(uri: string, storagePath: string, token: string, mimeType: string): Promise<number> {
  const bytes = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(storagePath, token, bytes, { contentType: mimeType });
  if (error) throw error;
  return bytes.byteLength;
}

/**
 * iOS/Android: the file is streamed natively from disk. Sending an ArrayBuffer through
 * React Native's fetch (what supabase-js does) never finishes on Android.
 */
async function uploadNative(uri: string, storagePath: string, token: string, mimeType: string): Promise<number> {
  const file = new File(uri);
  // Same endpoint supabase-js uploadToSignedUrl() calls, on the host the app already talks to.
  const url = `${env.supabaseUrl}/storage/v1/object/upload/sign/${BUCKET}/${storagePath}?token=${encodeURIComponent(token)}`;
  const result = await file.upload(url, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    mimeType,
    headers: {
      apikey: env.supabaseKey,
      'content-type': mimeType,
      'cache-control': 'max-age=3600',
      'x-upsert': 'false',
    },
  });
  if (result.status < 200 || result.status >= 300) {
    let message = `Upload fehlgeschlagen (${result.status})`;
    try {
      message = JSON.parse(result.body).message ?? message;
    } catch {
      // Not JSON: keep the status message.
    }
    throw new Error(message);
  }
  return file.size ?? 0;
}

/**
 * Uploads a photo straight to Supabase Storage (the API only signs the upload)
 * and registers it as a document.
 */
export function useUploadDocument() {
  const [createUploadUrl] = useCreateUploadUrlMutation();
  const [createDocument] = useCreateDocumentMutation();

  return useCallback(
    async (photo: { uri: string; mimeType: DocumentMimeType; kind: DocumentKind; deviceId?: string }): Promise<DocumentItem> => {
      const { storagePath, token } = await createUploadUrl({ mimeType: photo.mimeType }).unwrap();
      const upload = Platform.OS === 'web' ? uploadWeb : uploadNative;
      const sizeBytes = await upload(photo.uri, storagePath, token, photo.mimeType);

      return createDocument({
        storagePath,
        kind: photo.kind,
        mimeType: photo.mimeType,
        sizeBytes,
        deviceId: photo.deviceId,
      }).unwrap();
    },
    [createUploadUrl, createDocument],
  );
}
