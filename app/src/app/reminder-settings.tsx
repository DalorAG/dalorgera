import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { InfoBanner } from '@/components/info-banner';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import type { ReminderSettings } from '@/lib/api-types';
import { apiErrorMessage } from '@/lib/format';
import { useGetReminderSettingsQuery, useUpdateReminderSettingsMutation } from '@/store/api';
import { spacing, useTheme } from '@/theme';

/** Same list as the backend and the database check. */
const DAYS = [90, 60, 30, 14, 7, 3, 1];
const HOURS = [7, 8, 9, 12, 15, 18, 20];

const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/** When warranty, Wartung and Vignette reminders go out. */
export default function ReminderSettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation(['account', 'common']);
  const { data, isLoading, error, refetch } = useGetReminderSettingsQuery();
  const [update, { isLoading: saving }] = useUpdateReminderSettingsMutation();
  // null until the user changes something: the saved settings are shown.
  const [edited, setForm] = useState<ReminderSettings | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const form = edited ?? data;

  if (isLoading) return <StateView kind="loading" />;
  if (error || !form) return <StateView kind="error" error={error} onRetry={refetch} />;

  const toggleDay = (day: number) => {
    setMessage(null);
    const days = form.daysBefore.includes(day) ? form.daysBefore.filter((d) => d !== day) : [...form.daysBefore, day];
    setForm({ ...form, daysBefore: days.sort((a, b) => b - a) });
  };

  const save = async () => {
    try {
      setForm(await update(form).unwrap());
      setMessage({ ok: true, text: t('reminderSettings.saved') });
    } catch (err) {
      setMessage({ ok: false, text: apiErrorMessage(err) });
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {message?.ok ? <InfoBanner title={message.text} subtitle={t('reminderSettings.savedHint')} /> : null}

      <Card style={styles.section}>
        <Text variant="headline">{t('reminderSettings.daysTitle')}</Text>
        <Text variant="caption" color="textSecondary">
          {t('reminderSettings.daysHint')}
        </Text>
        <View style={styles.chips}>
          {DAYS.map((day) => (
            <Chip
              key={day}
              label={t('reminderSettings.daysBefore', { count: day })}
              selected={form.daysBefore.includes(day)}
              onPress={() => toggleDay(day)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text variant="headline">{t('reminderSettings.hourTitle')}</Text>
        <View style={styles.chips}>
          {HOURS.map((hour) => (
            <Chip
              key={hour}
              label={formatHour(hour)}
              selected={form.hour === hour}
              onPress={() => {
                setMessage(null);
                setForm({ ...form, hour });
              }}
            />
          ))}
        </View>
      </Card>

      <Text variant="caption" color="textSecondary">
        {t('reminderSettings.burdenOfProof')}
      </Text>

      {message && !message.ok ? (
        <Text variant="body" color="danger">
          {message.text}
        </Text>
      ) : null}
      <Button
        label={t('common:actions.save')}
        icon="checkmark"
        onPress={save}
        loading={saving}
        disabled={form.daysBefore.length === 0}
      />
      {form.daysBefore.length === 0 ? (
        <Text variant="caption" color="warningText">
          {t('reminderSettings.pickOne')}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
});
