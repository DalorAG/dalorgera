import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import i18n from '@/i18n';

import type { Device, DeviceKind, DeviceStatus, DocumentItem, DocumentKind } from './api-types';
import { formatDate, remainingLabel } from './format';

type IconName = ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICONS: [RegExp, IconName][] = [
  [/smartphone|handy|phone|telefon/i, 'phone-portrait-outline'],
  [/laptop|notebook|computer|pc|tablet/i, 'laptop-outline'],
  [/audio|kopfh|headphone|lautsprecher|speaker/i, 'headset-outline'],
  [/tv|fernseh|monitor/i, 'tv-outline'],
  [/kamera|camera|foto/i, 'camera-outline'],
  [/küche|kitchen|kaffee|coffee/i, 'cafe-outline'],
  [/haushalt|wasch|trockner|spül|staubsauger/i, 'water-outline'],
  [/vignette|auto|fahrzeug|pickerl/i, 'car-outline'],
  [/uhr|watch/i, 'watch-outline'],
  [/spiel|game|konsole/i, 'game-controller-outline'],
  [/fahrrad|bike/i, 'bicycle-outline'],
];

export function iconForDevice(category: string | null, name = ''): IconName {
  const text = `${category ?? ''} ${name}`;
  return CATEGORY_ICONS.find(([re]) => re.test(text))?.[1] ?? 'cube-outline';
}

export type Tone = 'success' | 'warning' | 'danger';

export function toneForStatus(status: DeviceStatus): Tone {
  return status === 'active' ? 'success' : status === 'expiring' ? 'warning' : 'danger';
}

/** Labels are getters, so they follow the current language. */
function kindOption(kind: DeviceKind, icon: IconName) {
  return {
    kind,
    icon,
    get label() {
      return i18n.t(`labels:deviceKind.${kind}.label`);
    },
    get description() {
      return i18n.t(`labels:deviceKind.${kind}.description`);
    },
  };
}

export const DEVICE_KIND_OPTIONS: { kind: DeviceKind; label: string; description: string; icon: IconName }[] = [
  kindOption('warranty', 'shield-checkmark-outline'),
  kindOption('statutory', 'receipt-outline'),
  kindOption('maintenance', 'construct-outline'),
  kindOption('vignette', 'car-outline'),
];

/** Label for purchase_date: Kaufdatum, last Wartung or first valid day of a vignette. */
export function startDateLabel(kind: DeviceKind): string {
  return i18n.t(kind === 'maintenance' ? 'labels:startDate.maintenance' : kind === 'vignette' ? 'labels:startDate.vignette' : 'labels:startDate.purchase');
}

/** Read-only record whose values are looked up on access. */
function lazyLabels<K extends string>(keys: readonly K[], label: (key: K) => string): Record<K, string> {
  const record = {} as Record<K, string>;
  for (const key of keys) Object.defineProperty(record, key, { enumerable: true, get: () => label(key) });
  return record;
}

export const DEVICE_KIND_LABELS = lazyLabels(
  DEVICE_KIND_OPTIONS.map((o) => o.kind),
  (kind) => i18n.t(`labels:deviceKind.${kind}.label`),
);

/** Short status for badges: remaining time, or "Überfällig" for a missed Wartung. */
export function badgeLabel(device: Device): string {
  if (device.kind === 'maintenance' && device.daysLeft < 0) return i18n.t('labels:badge.overdue');
  if (device.kind === 'vignette' && device.purchaseDate > new Date().toISOString().slice(0, 10)) return i18n.t('labels:badge.notYetValid');
  return remainingLabel(device.daysLeft);
}

/** Card headline, e.g. "Noch 5 Monate geschützt" or "Wartung überfällig". */
export function headlineFor(device: Device): string {
  const remaining = remainingLabel(device.daysLeft);
  if (device.kind === 'maintenance') {
    if (device.status === 'expired') return i18n.t('labels:headline.maintenanceOverdue');
    return i18n.t(device.status === 'expiring' ? 'labels:headline.maintenanceSoon' : 'labels:headline.maintenance', { remaining });
  }
  if (device.kind === 'vignette') {
    if (device.status === 'expired') return i18n.t('labels:headline.vignetteExpired');
    return i18n.t(device.status === 'expiring' ? 'labels:headline.vignetteExpiring' : 'labels:headline.vignetteValid', { remaining });
  }
  if (device.status === 'active') return i18n.t('labels:headline.protected', { remaining });
  return device.status === 'expiring' ? i18n.t('labels:headline.attention', { remaining }) : i18n.t('labels:headline.protectionExpired');
}

/** "Garantie bis 01.01.2026", "Gewährleistung bis …" or "Nächste Wartung am …". */
export function deadlineLabel(device: Device): string {
  const date = formatDate(device.protectedUntil);
  if (device.kind === 'maintenance') return i18n.t('labels:deadline.maintenance', { date });
  if (device.kind === 'vignette') return i18n.t('labels:deadline.vignette', { date });
  const warranty = !!device.warrantyUntil && device.warrantyUntil === device.protectedUntil;
  return i18n.t(warranty ? 'labels:deadline.warranty' : 'labels:deadline.statutory', { date });
}

const yearsOption = (months: number) => ({
  months,
  get label() {
    return i18n.t('labels:warrantyYears', { count: months / 12 });
  },
});

export const WARRANTY_OPTIONS: { months: number; label: string }[] = [12, 24, 36, 60].map(yearsOption);

const INTERVAL_KEYS = {
  6: 'labels:interval.halfYearly',
  12: 'labels:interval.yearly',
  24: 'labels:interval.every2Years',
  36: 'labels:interval.every3Years',
} as const;

export const INTERVAL_OPTIONS: { months: number; label: string }[] = ([6, 12, 24, 36] as const).map((months) => ({
  months,
  get label() {
    return i18n.t(INTERVAL_KEYS[months]);
  },
}));

/** Seriennummer and IMEI belong to purchases, not to a Wartung or a Vignette. */
export function hasDeviceCodes(kind: DeviceKind): boolean {
  return kind === 'warranty' || kind === 'statutory';
}

const DOCUMENT_KIND_KEYS = {
  receipt: 'labels:documentKind.receipt',
  warranty_card: 'labels:documentKind.warrantyCard',
  invoice: 'labels:documentKind.invoice',
  other: 'labels:documentKind.other',
  product_photo: 'labels:documentKind.productPhoto',
} as const;

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = lazyLabels(
  Object.keys(DOCUMENT_KIND_KEYS) as DocumentKind[],
  (kind) => i18n.t(DOCUMENT_KIND_KEYS[kind]),
);

/** Belege are everything except the photo of the device itself. */
export function isReceipt(document: Pick<DocumentItem, 'kind'>): boolean {
  return document.kind !== 'product_photo';
}

// Austrian support pages of common brands; anything else falls back to a web search.
const MANUFACTURER_SUPPORT: [RegExp, string][] = [
  [/apple/i, 'https://support.apple.com/de-at'],
  [/samsung/i, 'https://www.samsung.com/at/support/'],
  [/bosch/i, 'https://www.bosch-home.at/service'],
  [/siemens/i, 'https://www.siemens-home.bsh-group.com/at/service'],
  [/philips/i, 'https://www.philips.at/c-w/support-home.html'],
  [/xiaomi/i, 'https://www.mi.com/at/support/'],
  [/^hp\b|hewlett/i, 'https://support.hp.com/at-de'],
  [/microsoft/i, 'https://support.microsoft.com/de-at'],
  [/google/i, 'https://support.google.com/store'],
  [/jura/i, 'https://www.jura.com/de-at/service'],
  [/asus/i, 'https://www.asus.com/at/support/'],
  [/tefal/i, 'https://www.tefal.at/service'],
  [/k(ä|ae|a)rcher/i, 'https://www.kaercher.com/at/services.html'],
];

/** Support page of the device's manufacturer, or a search for its Kundenservice. */
export function manufacturerSupportUrl(device: Pick<Device, 'brand' | 'name'>): string {
  const brand = device.brand?.trim();
  const known = brand ? MANUFACTURER_SUPPORT.find(([re]) => re.test(brand))?.[1] : undefined;
  if (known) return known;
  const name = `${brand && !device.name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ` : ''}${device.name}`;
  const query = i18n.t('labels:supportSearch', { query: name });
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/** A Garantieverlängerung can only be taken out within 4 weeks of the purchase. */
export const EXTENSION_WINDOW_DAYS = 28;

export type ExtensionWindow = { until: string; daysLeft: number };

/** Open window for a Garantieverlängerung, or null once the 4 weeks are over. */
export function extensionWindow(purchaseDate: string, today = new Date().toISOString().slice(0, 10)): ExtensionWindow | null {
  const [y, m, d] = purchaseDate.slice(0, 10).split('-').map(Number);
  const until = new Date(Date.UTC(y, m - 1, d + EXTENSION_WINDOW_DAYS)).toISOString().slice(0, 10);
  const daysLeft = Math.round((Date.parse(until) - Date.parse(today)) / 86_400_000);
  return daysLeft >= 0 && purchaseDate.slice(0, 10) <= today ? { until, daysLeft } : null;
}

/** "noch 12 Tage", "nur noch heute" */
export function extensionDaysLabel(window: ExtensionWindow): string {
  if (window.daysLeft === 0) return i18n.t('labels:extensionDays.today');
  return i18n.t('labels:extensionDays.left', { count: window.daysLeft });
}

/**
 * Window for a receipt in the Posteingang: the device's purchase date, else the recognized one,
 * else the day it was scanned. Wartung and Vignette cannot be extended.
 */
export function documentExtensionWindow(doc: DocumentItem, device?: Device): ExtensionWindow | null {
  if (device && !hasDeviceCodes(device.kind)) return null;
  return extensionWindow(device?.purchaseDate ?? doc.extracted?.purchaseDate ?? doc.createdAt.slice(0, 10));
}

/** 2024-03-15 + 12 → 2025-03-15 (month ends are clamped: 31.01. + 1 → 28./29.02.). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

export type ClaimGuidance = {
  title: string;
  body: string;
  /** Who to turn to with a defect right now. */
  contact: 'store' | 'manufacturer' | null;
};

/**
 * Who to turn to with a defect today (AT: VGG, § 933 ABGB; mostly the same in DE):
 * the first year the seller carries the burden of proof, the Gewährleistung lasts 2 years and
 * can be enforced 3 more months; a Garantie is extra and mostly matters after that.
 */
export function claimGuidance(device: Device, today = new Date().toISOString().slice(0, 10)): ClaimGuidance {
  const store = device.store ?? i18n.t('labels:claim.defaultStore');
  const proofUntil = addMonths(device.purchaseDate, 12);
  const claimUntil = addMonths(device.statutoryUntil, 3);
  const warrantyActive = device.kind === 'warranty' && !!device.warrantyUntil && today <= device.warrantyUntil;
  const warranty = warrantyActive
    ? { brand: device.brand ?? i18n.t('labels:claim.defaultBrand'), warrantyUntil: formatDate(device.warrantyUntil) }
    : null;
  const dates = {
    proofUntil: formatDate(proofUntil),
    statutoryUntil: formatDate(device.statutoryUntil),
    claimUntil: formatDate(claimUntil),
  };

  if (today <= proofUntil) {
    return {
      title: i18n.t('labels:claim.firstYear.title'),
      body: i18n.t('labels:claim.firstYear.body', { store, ...dates }),
      contact: 'store',
    };
  }
  if (today <= device.statutoryUntil) {
    return {
      title: i18n.t('labels:claim.statutory.title'),
      body: [
        i18n.t('labels:claim.statutory.body', { store, ...dates }),
        warranty ? i18n.t('labels:claim.statutory.warrantyAlternative', warranty) : null,
      ]
        .filter(Boolean)
        .join(' '),
      contact: 'store',
    };
  }
  const grace = today <= claimUntil ? i18n.t('labels:claim.grace', dates) : null;
  if (warranty) {
    return {
      title: i18n.t('labels:claim.manufacturer.title'),
      body: [i18n.t('labels:claim.manufacturer.body', warranty), grace].filter(Boolean).join(' '),
      contact: 'manufacturer',
    };
  }
  if (grace) return { title: i18n.t('labels:claim.lastDeadline.title'), body: grace, contact: 'store' };
  return {
    title: i18n.t('labels:claim.expired.title'),
    body: i18n.t('labels:claim.expired.body'),
    contact: null,
  };
}
