import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { Text } from './text';

type Props = { icon: ReactNode; title: string; subtitle: string; actions?: ReactNode };

export function ScreenHeader({ icon, title, subtitle, actions }: Props) {
  return (
    <View style={styles.wrap}>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
      <View style={styles.row}>
        {icon}
        <View style={styles.copy}>
          <Text variant="display">{title}</Text>
          <Text variant="body" color="textSecondary">
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg, minHeight: 28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1 },
});
