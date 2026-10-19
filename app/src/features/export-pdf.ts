import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { DocumentItem } from '@/lib/api-types';
import { DOCUMENT_KIND_LABELS } from '@/lib/device-ui';

/** "Kassenbon-2026-10-19.pdf" */
function fileName(document: DocumentItem): string {
  return `${DOCUMENT_KIND_LABELS[document.kind]}-${document.createdAt.slice(0, 10)}.pdf`;
}

/**
 * Turns a stored receipt photo into an A4 PDF and opens the share sheet
 * ("In Dateien sichern", mail, ...). PDFs are shared as they are.
 * `url` is a short-lived signed download URL of the document.
 */
export async function shareDocumentAsPdf(document: DocumentItem, url: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
    return;
  }

  const dir = new Directory(Paths.cache, 'export');
  dir.create({ idempotent: true });
  const target = new File(dir, fileName(document));
  if (target.exists) target.delete();

  if (document.mimeType === 'application/pdf') {
    await File.downloadFileAsync(url, target);
  } else {
    // Embedded as base64 so the page never renders before the image has loaded.
    const photo = await File.downloadFileAsync(url, new File(dir, `photo-${document.id}`), { idempotent: true });
    const data = `data:${document.mimeType};base64,${await photo.base64()}`;
    photo.delete();
    const { uri } = await Print.printToFileAsync({
      html: `<html><body style="margin:0;display:flex;justify-content:center">
        <img src="${data}" style="max-width:100%;max-height:100vh;object-fit:contain" />
      </body></html>`,
    });
    await new File(uri).move(target);
  }

  await Sharing.shareAsync(target.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: target.name });
}
