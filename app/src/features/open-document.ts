import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { DocumentItem } from '@/lib/api-types';
import type { AppDispatch } from '@/store';
import { api } from '@/store/api';

/** Browsers cannot render HEIC, iOS and Android can. */
function viewableInApp(doc: DocumentItem) {
  if (doc.mimeType === 'image/heic') return Platform.OS !== 'web';
  return doc.mimeType.startsWith('image/');
}

/** Photos open in the in-app viewer; PDFs still go to the system browser. */
export async function openDocument(doc: DocumentItem, dispatch: AppDispatch) {
  if (viewableInApp(doc)) {
    router.push({ pathname: '/document/[id]', params: { id: doc.id } });
    return;
  }
  const { url } = await dispatch(api.endpoints.getDocumentUrl.initiate(doc.id)).unwrap();
  await WebBrowser.openBrowserAsync(url);
}
