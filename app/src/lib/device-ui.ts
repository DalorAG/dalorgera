import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { DeviceStatus, DocumentKind } from './api-types';

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

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  receipt: 'Kassenbon',
  warranty_card: 'Garantieschein',
  invoice: 'Rechnung',
  other: 'Sonstiges',
};
