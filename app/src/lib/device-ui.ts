import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { Device, DeviceKind, DeviceStatus, DocumentKind } from './api-types';
import { formatDate, remainingLabel } from './format';

type IconName = ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICONS: [RegExp, IconName][] = [
  [/smartphone|handy|phone|telefon/i, 'phone-portrait-outline'],
  [/laptop|notebook|computer|pc|tablet/i, 'laptop-outline'],
  [/audio|kopfh|headphone|lautsprecher|speaker/i, 'headset-outline'],
  [/tv|fernseh|monitor/i, 'tv-outline'],
  [/kamera|camera|foto/i, 'camera-outline'],
  [/küche|kitchen|kaffee|coffee/i, 'cafe-outline'],
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
];

export const DEVICE_KIND_LABELS = Object.fromEntries(DEVICE_KIND_OPTIONS.map((o) => [o.kind, o.label])) as Record<
  DeviceKind,
  string
>;

/** Short status for badges: remaining time, or "Überfällig" for a missed Wartung. */
export function badgeLabel(device: Device): string {
  return device.kind === 'maintenance' && device.daysLeft < 0 ? 'Überfällig' : remainingLabel(device.daysLeft);
}

/** Card headline, e.g. "Noch 5 Monate geschützt" or "Wartung überfällig". */
export function headlineFor(device: Device): string {
  if (device.kind === 'maintenance') {
    if (device.status === 'expired') return 'Wartung überfällig';
    return device.status === 'expiring' ? `Wartung bald: ${remainingLabel(device.daysLeft)}` : `Wartung: ${remainingLabel(device.daysLeft)}`;
  }
  if (device.status === 'active') return `${remainingLabel(device.daysLeft)} geschützt`;
  return device.status === 'expiring' ? `Achtung: ${remainingLabel(device.daysLeft)}` : 'Schutz abgelaufen';
}

/** "Garantie bis 01.01.2026", "Gewährleistung bis …" or "Nächste Wartung am …". */
export function deadlineLabel(device: Device): string {
  const date = formatDate(device.protectedUntil);
  if (device.kind === 'maintenance') return `Nächste Wartung am ${date}`;
  return `${device.warrantyUntil && device.warrantyUntil === device.protectedUntil ? 'Garantie' : 'Gewährleistung'} bis ${date}`;
}

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  receipt: 'Kassenbon',
  warranty_card: 'Garantieschein',
  invoice: 'Rechnung',
  other: 'Sonstiges',
};
