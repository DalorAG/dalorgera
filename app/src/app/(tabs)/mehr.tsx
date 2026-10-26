import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { LanguagePicker } from '@/components/language-picker';
import { ProfileAvatar } from '@/components/profile-avatar';
import { PushSetting } from '@/components/push-setting';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import i18n from '@/i18n';
import { apiErrorMessage, formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAppSelector } from '@/store';
import { useDeleteAccountMutation, useGetReminderSettingsQuery, useGetRemindersQuery } from '@/store/api';
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
    { text: i18n.t('common:actions.cancel'), style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function MoreScreen() {
  const theme = useTheme();
  const { t } = useTranslation(['account', 'nav']);
  const email = useAppSelector((s) => s.auth.email);
  const name = useAppSelector((s) => s.auth.name);
  const { data: reminders } = useGetRemindersQuery();
  const { data: reminderSettings } = useGetReminderSettingsQuery();
  const [deleteAccount, { isLoading: deleting }] = useDeleteAccountMutation();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) notify(t('more.signOutFailed'), error.message);
  };

  const removeAccount = () =>
    confirmDestructive(
      t('more.deleteConfirm.title'),
      t('more.deleteConfirm.message'),
      t('more.deleteConfirm.action'),
      async () => {
        try {
          await deleteAccount().unwrap();
          // The user no longer exists; drop the local session.
          await supabase.auth.signOut({ scope: 'local' });
        } catch (err) {
          notify(t('more.deleteFailed'), apiErrorMessage(err));
        }
      },
    );

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          icon={<ProfileAvatar size={56} />}
          title={name ?? t('more.title')}
          subtitle={email ?? ''}
        />

        <Card style={styles.links}>
          <LinkRow icon="person-outline" label={t('more.editProfile')} onPress={() => router.push('/profile')} />
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <LinkRow icon="file-tray-outline" label={t('more.inbox')} onPress={() => router.push('/posteingang')} />
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <LinkRow icon="archive-outline" label={t('nav:archive')} onPress={() => router.push('/archiv')} />
        </Card>

        <Card style={styles.links}>
          <LinkRow icon="pricetags-outline" label={t('nav:pricing')} onPress={() => router.push('/pricing')} />
        </Card>

        <Card style={styles.links}>
          <PushSetting />
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <LinkRow
            icon="time-outline"
            label={t('more.reminderTiming')}
            hint={
              reminderSettings
                ? t('more.reminderTimingHint', {
                    days: reminderSettings.daysBefore.join(', '),
                    time: `${String(reminderSettings.hour).padStart(2, '0')}:00`,
                  })
                : undefined
            }
            onPress={() => router.push('/reminder-settings')}
          />
        </Card>

        <Card>
          <LanguagePicker />
        </Card>

        <Text variant="title">{t('more.upcomingReminders')}</Text>
        <Card style={styles.list}>
          {reminders?.length ? (
            reminders.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.reminder}>
                <Ionicons name="notifications-outline" size={18} color={theme.brandIcon} />
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{r.deviceName}</Text>
                  <Text variant="caption" color="textSecondary">
                    {t(
                      r.kind === 'maintenance'
                        ? 'more.reminder.maintenance'
                        : r.kind === 'vignette'
                          ? 'more.reminder.vignette'
                          : r.kind === 'burden_of_proof'
                            ? 'more.reminder.burdenOfProof'
                            : r.kind === 'warranty'
                              ? 'more.reminder.warranty'
                              : 'more.reminder.legalWarranty',
                      { date: formatDate(r.dueDate) },
                    )}{' '}
                    · {t('more.reminder.remindAt', { date: formatDate(r.remindAt) })}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text variant="body" color="textSecondary">
              {t('more.noReminders')}
            </Text>
          )}
        </Card>

        <Text variant="title">{t('more.legal')}</Text>
        <Card style={styles.links}>
          <LinkRow icon="help-circle-outline" label={t('more.rights')} onPress={() => router.push('/rechte')} />
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <LinkRow icon="document-text-outline" label={t('nav:terms')} onPress={() => router.push('/terms')} />
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <LinkRow icon="shield-outline" label={t('nav:privacy')} onPress={() => router.push('/privacy')} />
        </Card>

        <Button label={t('more.signOut')} variant="secondary" icon="log-out-outline" onPress={signOut} loading={signingOut} />
        <Button label={t('more.deleteAccount')} variant="danger" icon="trash-outline" onPress={removeAccount} loading={deleting} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={styles.linkRow}>
      <Ionicons name={icon} size={20} color={theme.brandIcon} />
      <View style={styles.flex}>
        <Text variant="body">{label}</Text>
        {hint ? (
          <Text variant="caption" color="textSecondary">
            {hint}
          </Text>
        ) : null}
      </View>
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
