import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Text } from '@/components/text';
import type { DeviceKind } from '@/lib/api-types';
import { DEVICE_KIND_OPTIONS } from '@/lib/device-ui';
import { useAppDispatch } from '@/store';
import { useGetMeQuery } from '@/store/api';
import { scanCleared } from '@/store/scan-slice';
import { radius, spacing, useTheme } from '@/theme';

/**
 * "+" first asks what to track, then scans the receipt (Wartung: a product photo; Vignette goes straight
 * to the form). A Rechnung of a Wertsache goes into the Tresor.
 */
export default function AddScreen() {
  const theme = useTheme();
  const { t } = useTranslation(['overview', 'account', 'labels']);
  const dispatch = useAppDispatch();
  const { data: me } = useGetMeQuery();
  // Wertsachen do not count, so only devices are held back.
  const full = !!me?.plan && me.plan.devicesUsed >= me.plan.deviceLimit;

  const pick = (kind: DeviceKind) => {
    if (full) return router.push('/pricing');
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
        {t('overview:add.question')}
      </Text>
      {full ? (
        <Card onPress={() => router.push('/pricing')} style={[styles.row, { borderColor: theme.danger, borderWidth: 1 }]}>
          <Ionicons name="alert-circle-outline" size={24} color={theme.danger} />
          <Text variant="body" color="danger" style={styles.flex}>
            {t('labels:apiError.deviceLimit')}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.danger} />
        </Card>
      ) : null}
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
          <Text variant="headline">{t('overview:add.luxury.title')}</Text>
          <Text variant="caption" color="textSecondary">
            {t('overview:add.luxury.description')}
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
