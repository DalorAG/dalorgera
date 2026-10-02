import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { radius, shadow, spacing, useTheme } from '@/theme';

type Props = ViewProps & { onPress?: () => void };

export function Card({ style, onPress, children, ...rest }: Props) {
  const theme = useTheme();
  const base = [
    styles.card,
    { backgroundColor: theme.surface, borderColor: theme.border },
    shadow(theme.shadow),
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, pressed && styles.pressed]}
        {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={base} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
