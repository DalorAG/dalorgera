import { StyleSheet, View } from 'react-native';

import type { WarrantyStatus } from '@/data/devices';
import { radius, spacing, useTheme } from '@/theme';

import { Text } from './text';

export function StatusBadge({ status, label }: { status: WarrantyStatus; label: string }) {
  const theme = useTheme();
  const ok = status === 'ok';
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: ok ? theme.successSoft : theme.warningSoft,
          borderColor: ok ? theme.successSoftBorder : theme.warningSoftBorder,
        },
      ]}>
      <Text variant="micro" color={ok ? 'successText' : 'warningText'} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: { fontWeight: '600' },
});
