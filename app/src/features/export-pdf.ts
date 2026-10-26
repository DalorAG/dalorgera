import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import i18n from '@/i18n';
import type { DocumentItem as FullDocument } from '@/lib/api-types';
import { DOCUMENT_KIND_LABELS } from '@/lib/device-ui';

/** All the export needs; Wertsachen only carry these fields for their documents. */
type DocumentItem = Pick<FullDocument, 'id' | 'kind' | 'mimeType' | 'createdAt'>;

/** "Kassenbon-2026-10-19.pdf" */
function fileName(document: DocumentItem): string {
  return `${DOCUMENT_KIND_LABELS[document.kind]}-${document.createdAt.slice(0, 10)}.pdf`;
}

function exportDir(): Directory {
  const dir = new Directory(Paths.cache, 'export');
  dir.create({ idempotent: true });
  return dir;
}

function freshFile(dir: Directory, name: string): File {
  const file = new File(dir, name);
  if (file.exists) file.delete();
  return file;
}

/** Embedded as base64 so the page never renders before the image has loaded. */
async function photoDataUri(dir: Directory, document: DocumentItem, url: string): Promise<string> {
  const photo = await File.downloadFileAsync(url, new File(dir, `photo-${document.id}`), { idempotent: true });
  const data = `data:${document.mimeType};base64,${await photo.base64()}`;
  photo.delete();
  return data;
}

/** One A4 page per photo. */
async function photosToPdf(photos: string[], target: File): Promise<void> {
  const pages = photos
    .map(
      (src, i) => `<div style="height:100vh;display:flex;justify-content:center;align-items:center;${
        i < photos.length - 1 ? 'page-break-after:always;' : ''
      }"><img src="${src}" style="max-width:100%;max-height:100vh;object-fit:contain" /></div>`,
    )
    .join('');
  const { uri } = await Print.printToFileAsync({ html: `<html><body style="margin:0">${pages}</body></html>` });
  await new File(uri).move(target);
}

function share(target: File): Promise<void> {
  return Sharing.shareAsync(target.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: target.name });
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

  const dir = exportDir();
  const target = freshFile(dir, fileName(document));
  if (document.mimeType === 'application/pdf') await File.downloadFileAsync(url, target);
  else await photosToPdf([await photoDataUri(dir, document, url)], target);
  await share(target);
}

/**
 * All Belege of a device in one PDF, one page per photo ("Belege-Kaffeemaschine.pdf").
 * A single document goes through shareDocumentAsPdf; stored PDFs cannot be merged and are left out.
 */
export async function shareDocumentsAsPdf(
  documents: { document: DocumentItem; url: string }[],
  title: string,
): Promise<void> {
  if (documents.length === 1) return shareDocumentAsPdf(documents[0].document, documents[0].url);
  if (Platform.OS === 'web') {
    for (const { url } of documents) window.open(url, '_blank');
    return;
  }

  const dir = exportDir();
  const photos = [];
  for (const { document, url } of documents) {
    if (document.mimeType !== 'application/pdf') photos.push(await photoDataUri(dir, document, url));
  }
  if (!photos.length) return shareDocumentAsPdf(documents[0].document, documents[0].url);
  const name = title.replace(/[\\/:*?"<>|]/g, '').trim() || i18n.t('components:exportPdf.fallbackTitle');
  const target = freshFile(dir, `${i18n.t('components:exportPdf.receiptsFile', { title: name })}.pdf`);
  await photosToPdf(photos, target);
  await share(target);
}
