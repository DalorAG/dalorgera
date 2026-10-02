import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { supabase } from '@/lib/supabase';
import { useAppSelector } from '@/store';
import { useGetMeQuery } from '@/store/api';
import { spacing, useTheme } from '@/theme';

/**
 * Landing route of the Google OAuth redirect. On web the Supabase client
 * exchanges the code itself; on native this covers deep links that were not
 * caught by the in-app browser.
 */
export default function AuthCallbackScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const status = useAppSelector((s) => s.auth.status);
  const { data: me } = useGetMeQuery(undefined, { skip: status !== 'signedIn' });
  const [error, setError] = useState<string | null>(params.error_description ?? null);
  // On web the Supabase client has already exchanged the code when the auth status settles.
  const [exchanging, setExchanging] = useState(Platform.OS !== 'web' && !!params.code);

  useEffect(() => {
    if (Platform.OS === 'web' || !params.code || status === 'signedIn') return;
    supabase.auth
      .exchangeCodeForSession(params.code)
      .then(({ error: e }) => e && setError(e.message))
      .finally(() => setExchanging(false));
  }, [params.code, status]);

  // Auth finished without a session: the code was invalid, expired or already used.
  const message =
    error ??
    (status === 'signedOut' && !exchanging
      ? 'Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.'
      : null);

  // Go to a route the user may open: '/' stays protected until the terms are accepted.
  useEffect(() => {
    if (status === 'signedIn' && me) router.replace(me.terms.accepted ? '/' : '/accept-terms');
  }, [status, me]);

  if (!message) return <StateView kind="loading" />;
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <Text variant="headline">Anmeldung fehlgeschlagen</Text>
      <Text variant="body" color="textSecondary" style={styles.text}>
        {message}
      </Text>
      <Button label="Zurück zur Anmeldung" onPress={() => router.replace('/sign-in')} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  text: { textAlign: 'center' },
});
