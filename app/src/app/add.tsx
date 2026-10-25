import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Text } from '@/components/text';
import type { DeviceKind } from '@/lib/api-types';
import { DEVICE_KIND_OPTIONS } from '@/lib/device-ui';
import { useAppDispatch } from '@/store';
import { scanCleared } from '@/store/scan-slice';
import { radius, spacing, useTheme } from '@/theme';

/**
 * "+" first asks what to track, then scans the receipt (Wartung: a product photo; Vignette goes straight
 * to the form). A Rechnung of a Wertsache goes into the Tresor.
 */
export default function AddScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const pick = (kind: DeviceKind) => {
    if (kind === 'vignette') {
      dispatch(scanCleared());
      router.replace({ pathname: '/device/new', params: { kind } });
    } else {
      router.replace({ pathname: '/scan', params: { kind } });
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text variant="body" color="textSecondary">
        Was möchtest du im Blick behalten?
      </Text>
      {DEVICE_KIND_OPTIONS.map((o) => (
        <Card key={o.kind} onPress={() => pick(o.kind)} style={styles.row}>
          <View style={[styles.icon, { backgroundColor: theme.brandSoft }]}>
            <Ionicons name={o.icon} size={26} color={theme.brand} />
          </View>
          <View style={styles.flex}>
            <Text variant="headline">{o.label}</Text>
            <Text variant="caption" color="textSecondary">
              {o.description}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </Card>
      ))}
      <Card onPress={() => router.replace('/luxury-request')} style={styles.row}>
        <View style={[styles.icon, { backgroundColor: theme.brandSoft }]}>
          <Ionicons name="lock-closed-outline" size={26} color={theme.brand} />
        </View>
        <View style={styles.flex}>
          <Text variant="headline">Rechnung hinzufügen</Text>
          <Text variant="caption" color="textSecondary">
            Uhr, Schmuck oder Tasche mit Rechnung und Wert in den Tresor legen.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
