import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { LuxuryItem, LuxuryCategory, WarrantyRequestStatus } from './api-types';

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

/** Aktueller Wert; without one the purchase price is the best guess. */
export const currentValue = (item: LuxuryItem): number | null => item.valueCents ?? item.purchasePriceCents;

/** Dein Vermögen: what everything is worth today, and what it cost. */
export function totals(items: LuxuryItem[]) {
  let value = 0;
  let cost = 0;
  for (const item of items) {
    value += currentValue(item) ?? 0;
    cost += item.purchasePriceCents ?? 0;
  }
  return { value, cost };
}

/** "+12 %" between purchase price and current value, null when either is missing. */
export function valueChange(item: LuxuryItem): string | null {
  if (!item.purchasePriceCents || item.valueCents == null) return null;
  const pct = Math.round(((item.valueCents - item.purchasePriceCents) / item.purchasePriceCents) * 100);
  return `${pct > 0 ? '+' : pct < 0 ? '−' : '±'}${Math.abs(pct)} %`;
}

export const itemTitle = (item: Pick<LuxuryItem, 'brand' | 'model'>) => `${item.brand} ${item.model}`;
