import { File } from 'expo-file-system';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import type { DocumentItem, DocumentKind, DocumentMimeType } from '@/lib/api-types';
import { supabase } from '@/lib/supabase';
import { useCreateDocumentMutation, useCreateUploadUrlMutation } from '@/store/api';

const BUCKET = 'documents';

async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
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
      const bytes = await readBytes(photo.uri);

      const { error } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(storagePath, token, bytes, { contentType: photo.mimeType });
      if (error) throw error;

      return createDocument({
        storagePath,
        kind: photo.kind,
        mimeType: photo.mimeType,
        sizeBytes: bytes.byteLength,
        deviceId: photo.deviceId,
      }).unwrap();
    },
    [createUploadUrl, createDocument],
  );
}
