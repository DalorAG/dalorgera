import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Provider } from 'react-redux';

import { useAuthSync } from '@/features/use-auth-sync';
import { usePushRegistration } from '@/features/use-push-registration';
import { store, useAppSelector } from '@/store';
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
  const scheme = useScheme();

  useEffect(() => {
    if (authStatus !== 'loading') SplashScreen.hideAsync();
  }, [authStatus]);

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

  if (authStatus === 'loading') return null;
  const signedIn = authStatus === 'signedIn';

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="device/new"
            options={{ presentation: 'modal', headerShown: true, title: 'Gerät hinzufügen' }}
          />
          <Stack.Screen name="device/[id]" options={{ headerShown: true, title: '', headerBackTitle: 'Zurück' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
