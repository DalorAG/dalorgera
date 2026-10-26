import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import i18n from '@/i18n';
import { useAppSelector } from '@/store';
import { useRegisterPushTokenMutation } from '@/store/api';

// Expo Go on Android ships without the expo-notifications native modules, so even importing it crashes.
const pushUnsupported =
  Platform.OS === 'web' ||
  (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

const Notifications: typeof import('expo-notifications') | null = pushUnsupported
  ? null
  : require('expo-notifications');

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** unsupported: web, simulator or no EAS project id; denied: only the system settings can turn it on. */
export type PushStatus = 'unsupported' | 'undetermined' | 'granted' | 'denied';

const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
const available = !!Notifications && Device.isDevice && !!projectId;

type Register = ReturnType<typeof useRegisterPushTokenMutation>[0];

async function readStatus(): Promise<PushStatus> {
  if (!available) return 'unsupported';
  const { status, canAskAgain } = await Notifications!.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  return status === 'denied' && !canAskAgain ? 'denied' : 'undetermined';
}

/** Asks for permission if it may still be asked, then hands the Expo push token to our backend. */
async function enablePush(register: Register, ask: boolean): Promise<PushStatus> {
  if (!available) return 'unsupported';
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission dialog once a channel exists.
    await Notifications!.setNotificationChannelAsync('reminders', {
      name: i18n.t('components:push.channelName'),
      importance: Notifications!.AndroidImportance.DEFAULT,
    });
  }
  let status = await readStatus();
  if (status === 'undetermined' && ask) {
    await Notifications!.requestPermissionsAsync();
    status = await readStatus();
  }
  if (status !== 'granted') return status;
  const { data: token } = await Notifications!.getExpoPushTokenAsync({ projectId });
  await register({ token, platform: Platform.OS as 'ios' | 'android' }).unwrap();
  return status;
}

/**
 * Registers the Expo push token for warranty reminders. Asks once after sign-in, and registers again
 * whenever the app comes back to the front, e.g. after notifications were allowed in the settings.
 */
export function usePushRegistration() {
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const [register] = useRegisterPushTokenMutation();

  useEffect(() => {
    if (!signedIn || !available) return;
    const run = (ask: boolean) =>
      enablePush(register, ask).catch((err) => console.info('Push registration skipped:', (err as Error).message));
    run(true);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && run(false));
    return () => sub.remove();
  }, [signedIn, register]);
}

/**
 * Detaches this phone's push token from the account before signing out, so the next person who
 * signs in on it does not get the previous owner's reminders. Never throws: signing out must work offline.
 */
export async function unregisterPush(unregister: (token: string) => Promise<unknown>): Promise<void> {
  if (!available) return;
  try {
    if ((await Notifications!.getPermissionsAsync()).status !== 'granted') return;
    const { data: token } = await Notifications!.getExpoPushTokenAsync({ projectId });
    await unregister(token);
  } catch (err) {
    console.info('Push token not removed:', (err as Error).message);
  }
}

/** Permission state for the settings switch, kept fresh when the user returns from the system settings. */
export function usePushPermission() {
  const [register] = useRegisterPushTokenMutation();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    readStatus().then(setStatus, () => setStatus('unsupported'));
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  /** Turning reminders off, or on after they were denied, is only possible in the system settings. */
  const toggle = useCallback(async () => {
    setError(null);
    if (status === 'granted' || status === 'denied') return Linking.openSettings();
    try {
      setStatus(await enablePush(register, true));
    } catch (err) {
      setError((err as Error).message);
      refresh();
    }
  }, [status, register, refresh]);

  return { status, error, toggle };
}
