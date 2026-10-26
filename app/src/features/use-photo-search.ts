import { useCallback, useState } from 'react';

import { useCreateUploadUrlMutation, useDescribePhotoMutation } from '@/store/api';

import { preparePhoto } from './prepare-photo';
import type { PhotoSource } from './use-product-photo';
import { pickImages } from './use-request-photo';
import { uploadSigned } from './use-upload-document';

/** What the photo shows: a label for the user and the words looked for in the list. */
export type PhotoQuery = { label: string; words: string[] };

/** Words of 3+ letters, lowercased and unique: "Submariner Date" also finds "Rolex Submariner". */
function searchWords(values: (string | null)[]): string[] {
  const words = values.flatMap((v) => (v ?? '').toLowerCase().split(/[\s,/()-]+/));
  return [...new Set(words.filter((w) => w.length >= 3))];
}

/** How many words of the photo query appear in the text; 0 means no match. */
export function photoScore(text: string, query: PhotoQuery): number {
  const haystack = text.toLowerCase();
  return query.words.filter((w) => haystack.includes(w)).length;
}

/** Items matching the photo, best match first. */
export function rankByPhoto<T>(items: T[], textOf: (item: T) => string, query: PhotoQuery): T[] {
  return items
    .map((item) => ({ item, score: photoScore(textOf(item), query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}

/** Takes or picks a photo, asks the server what it shows; the photo is not kept. */
export function usePhotoSearch() {
  const [createUploadUrl] = useCreateUploadUrlMutation();
  const [describe] = useDescribePhotoMutation();
  const [busy, setBusy] = useState(false);

  const search = useCallback(
    async (source: PhotoSource): Promise<PhotoQuery | null> => {
      const [asset] = await pickImages(source, 1);
      if (!asset) return null;
      setBusy(true);
      try {
        const photo = await preparePhoto(asset.uri).catch(() => ({ uri: asset.uri, mimeType: 'image/jpeg' as const }));
        const { storagePath, token } = await createUploadUrl({ mimeType: photo.mimeType }).unwrap();
        await uploadSigned(photo.uri, storagePath, token, photo.mimeType);
        const found = await describe({ storagePath }).unwrap();
        const label = [found.brand, found.model].filter(Boolean).join(' ') || found.keywords[0] || '';
        return { label, words: searchWords([found.brand, found.model, ...found.keywords]) };
      } finally {
        setBusy(false);
      }
    },
    [createUploadUrl, describe],
  );

  return { search, busy };
}
