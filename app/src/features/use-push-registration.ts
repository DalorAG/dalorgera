import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAppSelector } from '@/store';
import { useRegisterPushTokenMutation } from '@/store/api';

Notifications.setNotificationHandler({
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
    if (!signedIn || Platform.OS === 'web' || !Device.isDevice) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) {
      console.info('Push notifications disabled: no EAS projectId (run `eas init`).');
      return;
    }

    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('reminders', {
            name: 'Garantie-Erinnerungen',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        await register({ token, platform: Platform.OS as 'ios' | 'android' }).unwrap();
      } catch (err) {
        // E.g. Expo Go on Android does not support remote push.
        console.info('Push registration skipped:', (err as Error).message);
      }
    })();
  }, [signedIn, register]);
}
