import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { radius, spacing, typography, useTheme } from '@/theme';

type Props = { value: string; onChangeText: (value: string) => void; placeholder: string };

export function SearchField({ value, onChangeText, placeholder }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
      <Ionicons name="search" size={18} color={theme.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel={placeholder}
        style={[typography.body, styles.input, { color: theme.text }]}
      />
      {value && Platform.OS === 'android' ? (
        <Ionicons name="close-circle" size={18} color={theme.textTertiary} onPress={() => onChangeText('')} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  input: { flex: 1, paddingVertical: spacing.sm },
});
