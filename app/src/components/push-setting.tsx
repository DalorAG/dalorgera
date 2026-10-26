import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { usePushPermission } from '@/features/use-push-registration';
import { spacing, useTheme } from '@/theme';

import { Text } from './text';

/** Push reminders on or off; once decided, the system settings own the switch. */
export function PushSetting() {
  const theme = useTheme();
  const { t } = useTranslation('components');
  const { status, error, toggle } = usePushPermission();
  if (!status) return null;

  const on = status === 'granted';
  const hint =
    status === 'unsupported'
      ? t('push.setting.unsupported')
      : status === 'denied'
        ? t('push.setting.denied')
        : on
          ? t('push.setting.on')
          : t('push.setting.off');

  return (
    <Pressable
      onPress={status === 'unsupported' ? undefined : toggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled: status === 'unsupported' }}
      style={styles.row}>
      <Ionicons name={on ? 'notifications' : 'notifications-off-outline'} size={20} color={theme.brandIcon} />
      <View style={styles.flex}>
        <Text variant="body">{t('push.setting.title')}</Text>
        <Text variant="caption" color={error ? 'danger' : 'textSecondary'}>
          {error ? t('push.setting.failed', { reason: error }) : hint}
        </Text>
      </View>
      <Switch
        value={on}
        onValueChange={toggle}
        disabled={status === 'unsupported'}
        trackColor={{ true: theme.brand }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
});
