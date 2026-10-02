import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { spacing, useTheme } from '@/theme';

export default function MehrScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.center}>
        <Ionicons name="ellipsis-horizontal-circle-outline" size={48} color={theme.textTertiary} />
        <Text variant="title">Mehr</Text>
        <Text variant="body" color="textSecondary">
          Kommt bald.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
