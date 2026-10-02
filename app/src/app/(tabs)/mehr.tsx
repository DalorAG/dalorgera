import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAppSelector } from '@/store';
import { useGetRemindersQuery } from '@/store/api';
import { spacing, useTheme } from '@/theme';

export default function MoreScreen() {
  const theme = useTheme();
  const email = useAppSelector((s) => s.auth.email);
  const { data: reminders } = useGetRemindersQuery();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) {
      if (Platform.OS === 'web') window.alert(error.message);
      else Alert.alert('Abmelden fehlgeschlagen', error.message);
    }
  };

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

        <Button label="Abmelden" variant="danger" icon="log-out-outline" onPress={signOut} loading={signingOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  list: { gap: spacing.lg },
  reminder: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
});
