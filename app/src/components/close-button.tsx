import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { spacing, useTheme } from '@/theme';

/** Closes a modal. iOS users can also swipe it down; on the web this is the only way back. */
export function CloseButton() {
  const theme = useTheme();
  return (
    <Pressable
      // Opened by a deep link or after a reload on the web, there is nothing to go back to.
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Schließen"
      style={styles.button}>
      <Ionicons name="close" size={26} color={theme.brand} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Native headers inset headerLeft themselves, the web header does not.
  button: { marginLeft: Platform.OS === 'web' ? spacing.lg : 0 },
});
