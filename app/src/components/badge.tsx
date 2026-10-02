import { StyleSheet, View } from 'react-native';

import type { Tone } from '@/lib/device-ui';
import { radius, spacing, useTheme, type ThemeColor } from '@/theme';

import { Text } from './text';

const TONES: Record<Tone, { bg: ThemeColor; border: ThemeColor; text: ThemeColor }> = {
  success: { bg: 'successSoft', border: 'successSoftBorder', text: 'successText' },
  warning: { bg: 'warningSoft', border: 'warningSoftBorder', text: 'warningText' },
  danger: { bg: 'dangerSoft', border: 'dangerSoft', text: 'danger' },
};

export function StatusBadge({ tone, label }: { tone: Tone; label: string }) {
  const theme = useTheme();
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: theme[t.bg], borderColor: theme[t.border] }]}>
      <Text variant="micro" color={t.text} style={styles.label}>
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
