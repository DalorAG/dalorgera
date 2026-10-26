// One JSON file per namespace and language: src/locales/<lang>/<namespace>.json.
// German is the source; scripts/check-i18n.mjs checks that en and ru have the same keys.
import de_common from '@/locales/de/common.json';
import de_nav from '@/locales/de/nav.json';
import de_components from '@/locales/de/components.json';
import de_labels from '@/locales/de/labels.json';
import de_auth from '@/locales/de/auth.json';
import de_account from '@/locales/de/account.json';
import de_inbox from '@/locales/de/inbox.json';
import de_overview from '@/locales/de/overview.json';
import de_device from '@/locales/de/device.json';
import de_scan from '@/locales/de/scan.json';
import de_warranty from '@/locales/de/warranty.json';
import de_tresor from '@/locales/de/tresor.json';
import de_legal from '@/locales/de/legal.json';
import en_common from '@/locales/en/common.json';
import en_nav from '@/locales/en/nav.json';
import en_components from '@/locales/en/components.json';
import en_labels from '@/locales/en/labels.json';
import en_auth from '@/locales/en/auth.json';
import en_account from '@/locales/en/account.json';
import en_inbox from '@/locales/en/inbox.json';
import en_overview from '@/locales/en/overview.json';
import en_device from '@/locales/en/device.json';
import en_scan from '@/locales/en/scan.json';
import en_warranty from '@/locales/en/warranty.json';
import en_tresor from '@/locales/en/tresor.json';
import en_legal from '@/locales/en/legal.json';
import ru_common from '@/locales/ru/common.json';
import ru_nav from '@/locales/ru/nav.json';
import ru_components from '@/locales/ru/components.json';
import ru_labels from '@/locales/ru/labels.json';
import ru_auth from '@/locales/ru/auth.json';
import ru_account from '@/locales/ru/account.json';
import ru_inbox from '@/locales/ru/inbox.json';
import ru_overview from '@/locales/ru/overview.json';
import ru_device from '@/locales/ru/device.json';
import ru_scan from '@/locales/ru/scan.json';
import ru_warranty from '@/locales/ru/warranty.json';
import ru_tresor from '@/locales/ru/tresor.json';
import ru_legal from '@/locales/ru/legal.json';

export const resources = {
  de: { common: de_common, nav: de_nav, components: de_components, labels: de_labels, auth: de_auth, account: de_account, inbox: de_inbox, overview: de_overview, device: de_device, scan: de_scan, warranty: de_warranty, tresor: de_tresor, legal: de_legal },
  en: { common: en_common, nav: en_nav, components: en_components, labels: en_labels, auth: en_auth, account: en_account, inbox: en_inbox, overview: en_overview, device: en_device, scan: en_scan, warranty: en_warranty, tresor: en_tresor, legal: en_legal },
  ru: { common: ru_common, nav: ru_nav, components: ru_components, labels: ru_labels, auth: ru_auth, account: ru_account, inbox: ru_inbox, overview: ru_overview, device: ru_device, scan: ru_scan, warranty: ru_warranty, tresor: ru_tresor, legal: ru_legal },
} as const;

export const namespaces = ['common', 'nav', 'components', 'labels', 'auth', 'account', 'inbox', 'overview', 'device', 'scan', 'warranty', 'tresor', 'legal'] as const;
