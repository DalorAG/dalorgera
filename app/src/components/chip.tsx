import { Pressable, StyleSheet } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Text } from './text';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.brand, borderColor: theme.brand }
          : { backgroundColor: theme.surface, borderColor: theme.borderStrong },
      ]}>
      <Text variant="captionStrong" color={selected ? 'textOnBrand' : 'text'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: '100%',
  },
});
