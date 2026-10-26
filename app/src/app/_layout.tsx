import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Provider } from 'react-redux';

import { CloseButton } from '@/components/close-button';
import { StateView } from '@/components/state-view';
import { useAuthSync } from '@/features/use-auth-sync';
import { usePushRegistration } from '@/features/use-push-registration';
import { restoreLanguage } from '@/i18n';
import { store, useAppSelector } from '@/store';
import { useGetMeQuery } from '@/store/api';
import { colors, useScheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

const MODAL = { presentation: 'modal', headerShown: true, headerLeft: () => <CloseButton /> } as const;

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
}

function RootNavigator() {
  useAuthSync();
  usePushRegistration();
  const authStatus = useAppSelector((s) => s.auth.status);
  const signedIn = authStatus === 'signedIn';
  const me = useGetMeQuery(undefined, { skip: !signedIn });
  const scheme = useScheme();
  const { t, i18n } = useTranslation('nav');
  const [languageReady, setLanguageReady] = useState(false);
  // Wait for the profile so the terms gate does not flash for users who already accepted.
  const ready = languageReady && authStatus !== 'loading' && (!signedIn || !!me.data || !!me.error);

  useEffect(() => {
    restoreLanguage().finally(() => setLanguageReady(true));
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors[scheme].brand,
      background: colors[scheme].background,
      card: colors[scheme].surface,
      text: colors[scheme].text,
      border: colors[scheme].border,
    },
  };

  // Users must accept the current terms (Google sign-ups, or after the terms changed).
  const termsAccepted = signedIn && me.data?.terms.accepted === true;
  const profileFailed = signedIn && !!me.error && !me.data;

  // The navigator must render from the first frame, otherwise Expo Router loses
  // deep links such as /auth-callback?code=… (blank page on web). While loading,
  // an overlay covers it (on native the splash screen is still visible as well).

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Remounted on a language change, so labels computed outside React (lib/) follow too. */}
      <Stack key={i18n.language} screenOptions={{ headerShown: false, headerBackTitle: t('back') }}>
        <Stack.Protected guard={termsAccepted}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add" options={{ ...MODAL, title: t('add') }} />
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="device/new"
            options={{ ...MODAL, title: t('deviceNew') }}
          />
          <Stack.Screen name="profile" options={{ headerShown: true, title: t('profile') }} />
          <Stack.Screen name="pricing" options={{ headerShown: true, title: t('pricing') }} />
          <Stack.Screen name="reminder-settings" options={{ headerShown: true, title: t('reminderSettings') }} />
          <Stack.Screen name="posteingang" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="archiv" options={{ headerShown: true, title: t('archive') }} />
          <Stack.Screen
            name="device/edit"
            options={{ ...MODAL, title: t('edit') }}
          />
          <Stack.Screen name="device/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="luxury/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="receipt/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="document/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen
            name="warranty-request"
            options={{ ...MODAL, title: t('warrantyRequest') }}
          />
          <Stack.Screen
            name="luxury-request"
            options={{ ...MODAL, title: t('luxuryNew') }}
          />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !termsAccepted}>
          <Stack.Screen name="accept-terms" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Screen
          name="terms"
          options={{ ...MODAL, title: t('terms') }}
        />
        <Stack.Screen
          name="privacy"
          options={{ ...MODAL, title: t('privacy') }}
        />
        <Stack.Screen
          name="rechte"
          options={{ ...MODAL, title: t('rights') }}
        />
        <Stack.Screen name="auth-callback" />
      </Stack>
      {!ready || profileFailed ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors[scheme].background }]}>
          {profileFailed ? <StateView kind="error" error={me.error} onRetry={me.refetch} /> : <StateView kind="loading" />}
        </View>
      ) : null}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  overlay: { justifyContent: 'center' },
});
