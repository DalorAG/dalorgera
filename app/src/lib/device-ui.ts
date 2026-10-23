import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

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

export const DEVICE_KIND_OPTIONS: { kind: DeviceKind; label: string; description: string; icon: IconName }[] = [
  {
    kind: 'warranty',
    label: 'Garantie',
    description: 'Herstellergarantie laut Garantieschein, zusätzlich zur Gewährleistung.',
    icon: 'shield-checkmark-outline',
  },
  {
    kind: 'statutory',
    label: 'Gewährleistung',
    description: 'Gesetzliche 2 Jahre ab Kauf, auch ohne Herstellergarantie.',
    icon: 'receipt-outline',
  },
  {
    kind: 'maintenance',
    label: 'Wartung',
    description: 'Wiederkehrende Termine wie Pickerl, Service oder Heizungswartung.',
    icon: 'construct-outline',
  },
  {
    kind: 'vignette',
    label: 'Vignette',
    description: 'Autobahn-Pickerl: Jahres-, 2-Monats- oder 10-Tages-Vignette. Wir erinnern dich vor Ablauf.',
    icon: 'car-outline',
  },
];

/** Label for purchase_date: Kaufdatum, last Wartung or first valid day of a vignette. */
export function startDateLabel(kind: DeviceKind): string {
  return kind === 'maintenance' ? 'Letzte Wartung am' : kind === 'vignette' ? 'Gültig ab' : 'Gekauft am';
}

export const DEVICE_KIND_LABELS = Object.fromEntries(DEVICE_KIND_OPTIONS.map((o) => [o.kind, o.label])) as Record<
  DeviceKind,
  string
>;

/** Short status for badges: remaining time, or "Überfällig" for a missed Wartung. */
export function badgeLabel(device: Device): string {
  if (device.kind === 'maintenance' && device.daysLeft < 0) return 'Überfällig';
  if (device.kind === 'vignette' && device.purchaseDate > new Date().toISOString().slice(0, 10)) return 'Noch nicht gültig';
  return remainingLabel(device.daysLeft);
}

/** Card headline, e.g. "Noch 5 Monate geschützt" or "Wartung überfällig". */
export function headlineFor(device: Device): string {
  if (device.kind === 'maintenance') {
    if (device.status === 'expired') return 'Wartung überfällig';
    return device.status === 'expiring' ? `Wartung bald: ${remainingLabel(device.daysLeft)}` : `Wartung: ${remainingLabel(device.daysLeft)}`;
  }
  if (device.kind === 'vignette') {
    if (device.status === 'expired') return 'Vignette abgelaufen';
    return device.status === 'expiring' ? `Vignette läuft ab: ${remainingLabel(device.daysLeft)}` : `Vignette gültig: ${remainingLabel(device.daysLeft)}`;
  }
  if (device.status === 'active') return `${remainingLabel(device.daysLeft)} geschützt`;
  return device.status === 'expiring' ? `Achtung: ${remainingLabel(device.daysLeft)}` : 'Schutz abgelaufen';
}

/** "Garantie bis 01.01.2026", "Gewährleistung bis …" or "Nächste Wartung am …". */
export function deadlineLabel(device: Device): string {
  const date = formatDate(device.protectedUntil);
  if (device.kind === 'maintenance') return `Nächste Wartung am ${date}`;
  if (device.kind === 'vignette') return `Gültig bis ${date}`;
  return `${device.warrantyUntil && device.warrantyUntil === device.protectedUntil ? 'Garantie' : 'Gewährleistung'} bis ${date}`;
}

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  receipt: 'Kassenbon',
  warranty_card: 'Garantieschein',
  invoice: 'Rechnung',
  other: 'Sonstiges',
  product_photo: 'Produktfoto',
};

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
  const query = `${brand && !device.name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ` : ''}${device.name} Kundenservice`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Purchases we can offer an extended warranty / insurance for: an assigned device that has
 * only the Gewährleistung or whose Garantie is running out, or a receipt that shows no
 * manufacturer warranty at all (e.g. clothes).
 */
export function lacksWarranty(doc: DocumentItem, device?: Device): boolean {
  if (device) return device.kind === 'statutory' || (device.kind === 'warranty' && device.status !== 'active');
  return !doc.extracted?.products.some((p) => p.warrantyMonths);
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
  const store = device.store ?? 'dem Händler';
  const proofUntil = addMonths(device.purchaseDate, 12);
  const claimUntil = addMonths(device.statutoryUntil, 3);
  const warrantyActive = device.kind === 'warranty' && !!device.warrantyUntil && today <= device.warrantyUntil;
  const warranty = warrantyActive ? `Garantie von ${device.brand ?? 'dem Hersteller'} bis ${formatDate(device.warrantyUntil)}` : null;

  if (today <= proofUntil) {
    return {
      title: 'Bei einem Mangel: zuerst zum Händler',
      body: `Wende dich an ${store}. Bis ${formatDate(proofUntil)} muss der Händler beweisen, dass der Mangel nicht schon beim Kauf bestand.`,
      contact: 'store',
    };
  }
  if (today <= device.statutoryUntil) {
    return {
      title: 'Bei einem Mangel: zum Händler',
      body: `Die Gewährleistung bei ${store} gilt bis ${formatDate(device.statutoryUntil)}. Seit ${formatDate(proofUntil)} musst du nachweisen, dass der Mangel schon beim Kauf bestand.${
        warranty ? ` Alternativ hilft die ${warranty}, oft ohne diesen Nachweis.` : ''
      }`,
      contact: 'store',
    };
  }
  const grace =
    today <= claimUntil
      ? `Ist der Mangel bis ${formatDate(device.statutoryUntil)} aufgetreten, kannst du ihn noch bis ${formatDate(claimUntil)} beim Händler geltend machen, notfalls gerichtlich.`
      : null;
  if (warranty) {
    return {
      title: 'Bei einem Mangel: zum Hersteller',
      body: [`Die Gewährleistung ist abgelaufen. Nutze die ${warranty}.`, grace].filter(Boolean).join(' '),
      contact: 'manufacturer',
    };
  }
  if (grace) return { title: 'Letzte Frist beim Händler', body: grace, contact: 'store' };
  return {
    title: 'Fristen abgelaufen',
    body: 'Gewährleistung und Garantie sind abgelaufen. Frag beim Händler oder Hersteller nach Kulanz oder einer Reparatur.',
    contact: null,
  };
}
