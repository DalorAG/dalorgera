import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

type Props = { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; error?: boolean };

export function Checkbox({ checked, onChange, children, error }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.row}
      hitSlop={6}>
      <View
        style={[
          styles.box,
          checked
            ? { backgroundColor: theme.brand, borderColor: theme.brand }
            : { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.borderStrong },
        ]}>
        {checked ? <Ionicons name="checkmark" size={16} color={theme.textOnBrand} /> : null}
      </View>
      <View style={styles.label}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm - 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  label: { flex: 1 },
});
