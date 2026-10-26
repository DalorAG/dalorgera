import { isPreviewable } from '@/components/device-thumb';
import type { DocumentItem } from '@/lib/api-types';
import { useGetDocumentsQuery } from '@/store/api';

/** Per device: its Produktfoto, otherwise the newest receipt photo (documents come newest first). */
export function useDevicePhotos(): Map<string, DocumentItem> {
  const { data: documents } = useGetDocumentsQuery();
  const photos = new Map<string, DocumentItem>();
  for (const doc of documents ?? []) {
    if (!doc.deviceId || !isPreviewable(doc)) continue;
    const shown = photos.get(doc.deviceId);
    if (!shown || (doc.kind === 'product_photo' && shown.kind !== 'product_photo')) photos.set(doc.deviceId, doc);
  }
  return photos;
}
