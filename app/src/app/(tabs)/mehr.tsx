import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { apiErrorMessage, formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAppSelector } from '@/store';
import { useDeleteAccountMutation, useGetRemindersQuery } from '@/store/api';
import { spacing, useTheme } from '@/theme';

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

function confirmDestructive(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function MoreScreen() {
  const theme = useTheme();
  const email = useAppSelector((s) => s.auth.email);
  const { data: reminders } = useGetRemindersQuery();
  const [deleteAccount, { isLoading: deleting }] = useDeleteAccountMutation();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) notify('Abmelden fehlgeschlagen', error.message);
  };

  const removeAccount = () =>
    confirmDestructive(
      'Konto löschen?',
      'Dein Konto, alle Geräte, Belege und Erinnerungen werden sofort und endgültig gelöscht.',
      'Endgültig löschen',
      async () => {
        try {
          await deleteAccount().unwrap();
          // The user no longer exists; drop the local session.
          await supabase.auth.signOut({ scope: 'local' });
        } catch (err) {
          notify('Löschen fehlgeschlagen', apiErrorMessage(err));
        }
      },
    );

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          icon={<Ionicons name="person-circle-outline" size={44} color={theme.brand} />}
          title="Mehr"
          subtitle={email ?? ''}
        />

        <Text variant="title">Nächste Erinnerungen</Text>
        <Card style={styles.list}>
          {reminders?.length ? (
            reminders.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.reminder}>
                <Ionicons name="notifications-outline" size={18} color={theme.brandIcon} />
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{r.deviceName}</Text>
                  <Text variant="caption" color="textSecondary">
                    {r.kind === 'warranty' ? 'Garantie' : 'Gewährleistung'} endet am {formatDate(r.dueDate)} · Erinnerung am{' '}
                    {formatDate(r.remindAt)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text variant="body" color="textSecondary">
              Keine anstehenden Erinnerungen.
            </Text>
          )}
        </Card>

        <Text variant="title">Rechtliches</Text>
        <Card style={styles.links}>
          <LinkRow icon="document-text-outline" label="Nutzungsbedingungen" onPress={() => router.push('/terms')} />
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <LinkRow icon="shield-outline" label="Datenschutzerklärung" onPress={() => router.push('/privacy')} />
        </Card>

        <Button label="Abmelden" variant="secondary" icon="log-out-outline" onPress={signOut} loading={signingOut} />
        <Button label="Konto löschen" variant="danger" icon="trash-outline" onPress={removeAccount} loading={deleting} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({ icon, label, onPress }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={styles.linkRow}>
      <Ionicons name={icon} size={20} color={theme.brandIcon} />
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  list: { gap: spacing.lg },
  reminder: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  links: { paddingVertical: spacing.xs },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  separator: { height: StyleSheet.hairlineWidth },
});
