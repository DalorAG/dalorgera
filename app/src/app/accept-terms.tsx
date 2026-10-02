import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { apiErrorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAcceptTermsMutation, useGetMeQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

/**
 * Shown to signed-in users who have not accepted the current terms yet
 * (new Google accounts, or everyone after the terms changed).
 */
export default function AcceptTermsScreen() {
  const theme = useTheme();
  const { data: me } = useGetMeQuery();
  const [acceptTerms, { isLoading, error }] = useAcceptTermsMutation();
  const [checked, setChecked] = useState(false);
  const [showError, setShowError] = useState(false);
  const [autoAccepting, setAutoAccepting] = useState(true);
  const tried = useRef(false);

  // Email sign-ups already ticked the checkbox when registering: record that consent.
  useEffect(() => {
    if (!me || tried.current) return;
    tried.current = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const versionAtSignUp = data.user?.user_metadata?.terms_version;
      if (versionAtSignUp === me.terms.currentVersion) {
        await acceptTerms({ version: me.terms.currentVersion }).unwrap().catch(() => undefined);
      }
      setAutoAccepting(false);
    })();
  }, [me, acceptTerms]);

  if (!me || autoAccepting) return <StateView kind="loading" />;

  const submit = () => {
    if (!checked) return setShowError(true);
    acceptTerms({ version: me.terms.currentVersion });
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.icon, { backgroundColor: theme.brandSoft }]}>
          <Ionicons name="document-text-outline" size={36} color={theme.brand} />
        </View>
        <Text variant="display">Fast geschafft</Text>
        <Text variant="body" color="textSecondary">
          Bevor du Garantie-Radar nutzen kannst, bestätige bitte unsere Nutzungsbedingungen.
        </Text>

        <Checkbox checked={checked} onChange={(v) => { setChecked(v); setShowError(false); }} error={showError}>
          <Text variant="body">
            Ich akzeptiere die{' '}
            <Link href="/terms" style={{ color: theme.brand, fontWeight: '600' }}>
              Nutzungsbedingungen
            </Link>
            . Die{' '}
            <Link href="/privacy" style={{ color: theme.brand, fontWeight: '600' }}>
              Datenschutzerklärung
            </Link>{' '}
            habe ich zur Kenntnis genommen.
          </Text>
        </Checkbox>
        {showError ? (
          <Text variant="caption" color="danger">
            Bitte bestätige die Nutzungsbedingungen.
          </Text>
        ) : null}
        {error ? (
          <Text variant="caption" color="danger">
            {apiErrorMessage(error)}
          </Text>
        ) : null}

        <Button label="Zustimmen und fortfahren" onPress={submit} loading={isLoading} />
        <Button label="Abmelden" variant="secondary" onPress={() => supabase.auth.signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xxl, gap: spacing.lg },
  icon: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
});
