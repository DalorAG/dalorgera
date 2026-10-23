import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { LuxuryCategory, WarrantyRequestStatus } from './api-types';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const LUXURY_CATEGORIES: { value: LuxuryCategory; label: string; icon: IconName }[] = [
  { value: 'watch', label: 'Uhr', icon: 'watch-outline' },
  { value: 'jewelry', label: 'Schmuck', icon: 'diamond-outline' },
  { value: 'bag', label: 'Tasche', icon: 'bag-handle-outline' },
  { value: 'other', label: 'Sonstiges', icon: 'sparkles-outline' },
];

export const REQUEST_STATUS_LABELS: Record<WarrantyRequestStatus, string> = {
  new: 'Gesendet',
  contacted: 'In Bearbeitung',
  closed: 'Abgeschlossen',
};
