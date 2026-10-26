import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'tresor.amountsHidden';
const listeners = new Set<() => void>();
let hidden = false;

AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    hidden = stored === '1';
    listeners.forEach((l) => l());
  })
  .catch(() => undefined);

function toggle() {
  hidden = !hidden;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(STORAGE_KEY, hidden ? '1' : '0').catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tresor amounts behind the eye button; remembered on this device, shared by every screen showing them. */
export function useHiddenAmounts() {
  const isHidden = useSyncExternalStore(subscribe, () => hidden);
  return { hidden: isHidden, toggle, mask: (text: string) => (isHidden ? '••••' : text) };
}
