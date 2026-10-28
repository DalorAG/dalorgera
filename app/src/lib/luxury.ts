import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import i18n from '@/i18n';

import type { LuxuryItem, LuxuryCategory, WarrantyRequestStatus } from './api-types';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Labels are getters, so they follow the current language. */
const category = (value: LuxuryCategory, icon: IconName) => ({
  value,
  icon,
  get label() {
    return i18n.t(`labels:luxuryCategory.${value}`);
  },
});

export const LUXURY_CATEGORIES: { value: LuxuryCategory; label: string; icon: IconName }[] = [
  category('watch', 'watch-outline'),
  category('jewelry', 'diamond-outline'),
  category('bag', 'bag-handle-outline'),
  category('other', 'sparkles-outline'),
];

export const REQUEST_STATUS_LABELS = {} as Record<WarrantyRequestStatus, string>;
for (const status of ['new', 'contacted', 'closed'] as const) {
  Object.defineProperty(REQUEST_STATUS_LABELS, status, {
    enumerable: true,
    get: () => i18n.t(`labels:requestStatus.${status}`),
  });
}

/** Aktueller Wert; without one the purchase price is the best guess. */
export const currentValue = (item: LuxuryItem): number | null => item.valueCents ?? item.purchasePriceCents;

/** Insurance asked for but not confirmed yet: listed under Angefragt, not counted in Dein Vermögen. */
export const isRequested = (item: LuxuryItem): boolean => !!item.request && item.request.status !== 'closed';

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
