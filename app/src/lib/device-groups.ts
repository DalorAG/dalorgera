import type { Device } from './api-types';

const OTHER_CATEGORY = 'Sonstiges';

/** Devices grouped by category (alphabetical, "Sonstiges" last), keeping the deadline order inside a group. */
export function groupByCategory(devices: Device[]): [string, Device[]][] {
  const groups = new Map<string, Device[]>();
  for (const d of devices) {
    const category = d.category?.trim() || OTHER_CATEGORY;
    groups.set(category, [...(groups.get(category) ?? []), d]);
  }
  return [...groups].sort(([a], [b]) =>
    a === OTHER_CATEGORY ? 1 : b === OTHER_CATEGORY ? -1 : a.localeCompare(b, 'de'),
  );
}

export function matches(device: Device, query: string): boolean {
  const text = [device.name, device.brand, device.category, device.store].filter(Boolean).join(' ').toLowerCase();
  return query.split(/\s+/).every((word) => text.includes(word));
}
