import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'tresor.amountsHidden';
const listeners = new Set<() => void>();
// null until the stored choice is read: amounts stay masked meanwhile instead of flashing up.
let hidden: boolean | null = null;

AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    hidden = stored === '1';
  })
  .catch(() => {
    hidden = false;
  })
  .finally(() => listeners.forEach((l) => l()));

function toggle() {
  hidden = hidden !== true;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(STORAGE_KEY, hidden ? '1' : '0').catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tresor amounts behind the eye button; remembered on this device, shared by every screen showing them. */
export function useHiddenAmounts() {
  const state = useSyncExternalStore(subscribe, () => hidden, () => null);
  const masked = state !== false;
  return { hidden: state === true, toggle, mask: (text: string) => (masked ? '••••' : text) };
}
