import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type WarrantyStatus = 'ok' | 'expiring';

export type Device = {
  id: string;
  name: string;
  category: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  purchasedAt: string;
  store: string;
  warrantyUntil: string;
  remainingLabel: string;
  progress: number;
  status: WarrantyStatus;
};

export const devices: Device[] = [
  {
    id: 'iphone-15',
    name: 'iPhone 15',
    category: 'Smartphone',
    icon: 'phone-portrait-outline',
    purchasedAt: '12.09.2023',
    store: 'TechnikMarkt',
    warrantyUntil: '12.09.2026',
    remainingLabel: 'Noch 18 Monate',
    progress: 0.6,
    status: 'ok',
  },
  {
    id: 'kaffeemaschine',
    name: 'Kaffeemaschine',
    category: 'Küchengerät',
    icon: 'cafe-outline',
    purchasedAt: '14.10.2022',
    store: 'Home & Living',
    warrantyUntil: '14.10.2025',
    remainingLabel: 'Nur noch 30 Tage',
    progress: 0.97,
    status: 'expiring',
  },
  {
    id: 'kopfhoerer',
    name: 'Kopfhörer',
    category: 'Audio',
    icon: 'headset-outline',
    purchasedAt: '03.03.2024',
    store: 'MediaWorld',
    warrantyUntil: '03.03.2026',
    remainingLabel: 'Noch 5 Monate',
    progress: 0.75,
    status: 'ok',
  },
];
