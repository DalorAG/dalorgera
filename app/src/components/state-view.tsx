import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { apiErrorMessage } from '@/lib/format';
import { spacing, useTheme } from '@/theme';

import { Button } from './button';
import { Text } from './text';

type Props =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown; onRetry: () => void }
  | {
      kind: 'empty';
      icon: ComponentProps<typeof Ionicons>['name'];
      title: string;
      message: string;
      action?: ReactNode;
    };

/** Loading, error and empty states with one consistent look. */
export function StateView(props: Props) {
  const theme = useTheme();

  if (props.kind === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.brand} />
      </View>
    );
  }

  if (props.kind === 'error') {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.textTertiary} />
        <Text variant="headline">Laden fehlgeschlagen</Text>
        <Text variant="body" color="textSecondary" style={styles.text}>
          {apiErrorMessage(props.error)}
        </Text>
        <Button label="Erneut versuchen" variant="secondary" onPress={props.onRetry} />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Ionicons name={props.icon} size={40} color={theme.textTertiary} />
      <Text variant="headline">{props.title}</Text>
      <Text variant="body" color="textSecondary" style={styles.text}>
        {props.message}
      </Text>
      {props.action}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  text: { textAlign: 'center' },
});
