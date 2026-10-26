import 'i18next';

import type { resources } from './resources';

// Typed keys: t('device:title') fails the typecheck when the key is missing in German.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['de'];
    returnNull: false;
  }
}
