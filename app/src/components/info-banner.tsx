import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Text } from './text';

type Props = { title: string; subtitle: string; icon?: ReactNode };

export function InfoBanner({ title, subtitle, icon }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: theme.surfaceBrand }]}>
      {icon ?? (
        <View style={[styles.check, { backgroundColor: theme.success }]}>
          <Ionicons name="checkmark" size={18} color={theme.textOnBrand} />
        </View>
      )}
      <View style={styles.copy}>
        <Text variant="captionStrong">{title}</Text>
        <Text variant="caption" color="textSecondary">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: spacing.xxs },
});
