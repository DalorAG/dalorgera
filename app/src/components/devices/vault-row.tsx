import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/badge';
import { Card } from '@/components/card';
import { DeviceThumb } from '@/components/device-thumb';
import { Text } from '@/components/text';
import type { Device } from '@/lib/api-types';
import { iconForDevice, toneForStatus } from '@/lib/device-ui';
import { formatDate, remainingLabel } from '@/lib/format';
import { spacing, useTheme } from '@/theme';

export function VaultRow({ device }: { device: Device }) {
  const theme = useTheme();
  const tone = toneForStatus(device.status);
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.danger;

  return (
    <Card onPress={() => router.push(`/device/${device.id}`)} style={styles.row}>
      <DeviceThumb icon={iconForDevice(device.category, device.name)} size={60} />
      <View style={[styles.flex, styles.body]}>
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <Text variant="headline" numberOfLines={1}>
              {device.name}
            </Text>
            {device.category ? (
              <Text variant="caption" color="textSecondary">
                {device.category}
              </Text>
            ) : null}
          </View>
          <StatusBadge tone={tone} label={remainingLabel(device.daysLeft)} />
        </View>
        <View style={styles.metaRow}>
          <View style={styles.flex}>
            <Meta icon="calendar-outline" text={`Gekauft am ${formatDate(device.purchaseDate)}`} />
            {device.store ? <Meta icon="storefront-outline" text={device.store} /> : null}
            {device.documentsCount ? (
              <Meta icon="document-attach-outline" text={`${device.documentsCount} Beleg(e)`} />
            ) : null}
            <View style={styles.meta}>
              <Ionicons name="shield-checkmark" size={14} color={color} />
              <Text
                variant="caption"
                color={tone === 'success' ? 'successText' : tone === 'warning' ? 'warningText' : 'danger'}>
                Geschützt bis {formatDate(device.protectedUntil)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </View>
      </View>
    </Card>
  );
}

function Meta({ icon, text }: { icon: 'calendar-outline' | 'storefront-outline' | 'document-attach-outline'; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <Text variant="caption" color="textSecondary">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  body: { gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs },
});
