import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Provider } from 'react-redux';

import { StateView } from '@/components/state-view';
import { useAuthSync } from '@/features/use-auth-sync';
import { usePushRegistration } from '@/features/use-push-registration';
import { store, useAppSelector } from '@/store';
import { useGetMeQuery } from '@/store/api';
import { colors, useScheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

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
  // Wait for the profile so the terms gate does not flash for users who already accepted.
  const ready = authStatus !== 'loading' && (!signedIn || !!me.data || !!me.error);

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={termsAccepted}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="device/new"
            options={{ presentation: 'modal', headerShown: true, title: 'Gerät hinzufügen' }}
          />
          <Stack.Screen name="device/[id]" options={{ headerShown: true, title: '', headerBackTitle: 'Zurück' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !termsAccepted}>
          <Stack.Screen name="accept-terms" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Screen
          name="terms"
          options={{ presentation: 'modal', headerShown: true, title: 'Nutzungsbedingungen' }}
        />
        <Stack.Screen
          name="privacy"
          options={{ presentation: 'modal', headerShown: true, title: 'Datenschutzerklärung' }}
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
