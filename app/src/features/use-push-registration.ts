import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { useEffect } from 'react';
import { Platform } from 'react-native';

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

/**
 * Registers the Expo push token for warranty reminders.
 * Needs a physical device and an EAS project id (`eas init`); otherwise it is skipped silently.
 */
export function usePushRegistration() {
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const [register] = useRegisterPushTokenMutation();

  useEffect(() => {
    if (!signedIn || !Notifications || !Device.isDevice) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) {
      console.info('Push notifications disabled: no EAS projectId (run `eas init`).');
      return;
    }

    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('reminders', {
            name: i18n.t('components:push.channelName'),
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        await register({ token, platform: Platform.OS as 'ios' | 'android' }).unwrap();
      } catch (err) {
        console.info('Push registration skipped:', (err as Error).message);
      }
    })();
  }, [signedIn, register]);
}
