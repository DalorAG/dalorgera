import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/badge';
import { Card } from '@/components/card';
import { DeviceThumb } from '@/components/device-thumb';
import { ExtensionPill } from '@/components/devices/extension-pill';
import { Text } from '@/components/text';
import type { Device, DocumentItem } from '@/lib/api-types';
import { badgeLabel, deadlineLabel, iconForDevice, startDateLabel, toneForStatus } from '@/lib/device-ui';
import { formatDate } from '@/lib/format';
import { spacing, useTheme } from '@/theme';

export function VaultRow({ device, photo }: { device: Device; photo?: DocumentItem }) {
  const theme = useTheme();
  const { t } = useTranslation('device');
  const tone = toneForStatus(device.status);
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.danger;

  return (
    <Card onPress={() => router.push(`/device/${device.id}`)} style={styles.row}>
      <DeviceThumb icon={iconForDevice(device.category, device.name)} size={60} photo={photo} />
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
          <StatusBadge tone={tone} label={badgeLabel(device)} />
        </View>
        <View style={styles.metaRow}>
          <View style={styles.flex}>
            <Meta
              icon="calendar-outline"
              text={`${startDateLabel(device.kind)} ${formatDate(device.purchaseDate)}`}
            />
            {device.store ? <Meta icon="storefront-outline" text={device.store} /> : null}
            {device.documentsCount ? (
              <Meta icon="document-attach-outline" text={t('list.documents', { count: device.documentsCount })} />
            ) : null}
            <View style={styles.meta}>
              <Ionicons
                name={device.kind === 'maintenance' ? 'construct' : device.kind === 'vignette' ? 'car' : 'shield-checkmark'}
                size={14}
                color={color}
              />
              <Text
                variant="caption"
                color={tone === 'success' ? 'successText' : tone === 'warning' ? 'warningText' : 'danger'}>
                {device.kind === 'maintenance' || device.kind === 'vignette'
                  ? deadlineLabel(device)
                  : t('list.protectedUntil', { date: formatDate(device.protectedUntil) })}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </View>
        <ExtensionPill device={device} />
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
