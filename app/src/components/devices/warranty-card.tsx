import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { DeviceThumb } from '@/components/device-thumb';
import { ProgressBar, ProgressRing } from '@/components/progress';
import { Text } from '@/components/text';
import type { Device } from '@/lib/api-types';
import { iconForDevice, toneForStatus } from '@/lib/device-ui';
import { formatDate, remainingLabel } from '@/lib/format';
import { spacing, useTheme } from '@/theme';

export function WarrantyCard({ device }: { device: Device }) {
  const theme = useTheme();
  const tone = toneForStatus(device.status);
  const accent = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.danger;
  const headline =
    device.status === 'active'
      ? `${remainingLabel(device.daysLeft)} geschützt`
      : device.status === 'expiring'
        ? `Achtung: ${remainingLabel(device.daysLeft)}`
        : 'Schutz abgelaufen';

  return (
    <Card onPress={() => router.push(`/device/${device.id}`)} style={styles.card}>
      <View style={styles.row}>
        <DeviceThumb icon={iconForDevice(device.category, device.name)} size={80} />
        <View style={styles.flex}>
          <Text variant="headline" numberOfLines={1}>
            {device.name}
          </Text>
          {device.category ? (
            <Text variant="caption" color="textSecondary">
              {device.category}
            </Text>
          ) : null}
          <Text variant="caption" color="textSecondary" style={styles.meta}>
            Gekauft am {formatDate(device.purchaseDate)}
            {device.store ? `\nbei ${device.store}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
      </View>

      <View style={styles.row}>
        <ProgressRing progress={device.progress} color={accent} />
        <View style={[styles.flex, styles.statusCol]}>
          <Text
            variant="headline"
            color={tone === 'success' ? 'successText' : tone === 'warning' ? 'warningText' : 'danger'}>
            {headline}
          </Text>
          <Text variant="caption" color="textSecondary">
            {device.warrantyUntil && device.warrantyUntil === device.protectedUntil ? 'Garantie' : 'Gewährleistung'} bis{' '}
            {formatDate(device.protectedUntil)}
          </Text>
          <ProgressBar progress={device.progress} color={accent} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  meta: { marginTop: spacing.xs },
  statusCol: { gap: spacing.xs },
});
