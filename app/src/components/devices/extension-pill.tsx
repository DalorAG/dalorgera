import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import type { Device } from '@/lib/api-types';
import { extensionDaysLabel, extensionWindow, hasDeviceCodes, isReceipt } from '@/lib/device-ui';
import { useGetDocumentsQuery, useGetWarrantyRequestsQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

/** "Garantie verlängern · noch 24 Tage" on a device row while the 4-week window is open. */
export function ExtensionPill({ device }: { device: Device }) {
  const theme = useTheme();
  const { t } = useTranslation('inbox');
  const { data: documents } = useGetDocumentsQuery();
  const { data: requests } = useGetWarrantyRequestsQuery();

  const extension = hasDeviceCodes(device.kind) ? extensionWindow(device.purchaseDate) : null;
  if (!extension) return null;

  const own = documents?.filter((d) => d.deviceId === device.id) ?? [];
  const ids = new Set(own.map((d) => d.id));
  const requested = requests?.some((r) => r.kind === 'extension' && r.documentId && ids.has(r.documentId));
  if (requested) {
    return (
      <View style={styles.line}>
        <Ionicons name="shield-checkmark-outline" size={14} color={theme.brand} />
        <Text variant="caption" color="brand">
          {t('list.extensionRequested')}
        </Text>
      </View>
    );
  }

  const receipt = own.find(isReceipt);
  const days = extensionDaysLabel(extension);
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/warranty-request',
          params: { productName: device.name, ...(receipt ? { documentId: receipt.id } : {}) },
        })
      }
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={t('list.extendA11y', { days })}
      style={[styles.pill, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}>
      <Ionicons name="shield-half-outline" size={14} color={theme.brand} />
      <Text variant="micro" color="brand" style={styles.label}>
        {t('list.extend', { days })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: { fontWeight: '600' },
});
