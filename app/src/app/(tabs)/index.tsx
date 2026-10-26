import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { WarrantyCard } from '@/components/devices/warranty-card';
import { InfoBanner } from '@/components/info-banner';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import type { DeviceKind } from '@/lib/api-types';
import { DEVICE_KIND_OPTIONS, isReceipt } from '@/lib/device-ui';
import { formatPrice, spentInMonth } from '@/lib/format';
import { useDevicePhotos } from '@/features/use-device-photos';
import { formatLocale } from '@/i18n';
import { useGetDevicesQuery, useGetDocumentsQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

export default function OverviewScreen() {
  const theme = useTheme();
  const { t } = useTranslation(['overview', 'common']);
  const [filter, setFilter] = useState<DeviceKind | 'all'>('all');
  const { data: devices, isLoading, isFetching, error, refetch } = useGetDevicesQuery();

  const { data: documents } = useGetDocumentsQuery();
  const photos = useDevicePhotos();

  // Sorted by deadline on the server; expired devices live in the Tresor,
  // an overdue Wartung stays here because it still needs doing.
  const current = devices?.filter((d) => d.status !== 'expired' || d.kind === 'maintenance') ?? [];
  const expiring = current.filter((d) => (d.kind === 'warranty' || d.kind === 'statutory') && d.status === 'expiring').length;
  const shown = filter === 'all' ? current : current.filter((d) => d.kind === filter);
  const now = new Date();
  const spent = spentInMonth(devices ?? [], now);
  const receiptsCount = documents?.filter(isReceipt).length ?? 0;
  // Scanned receipts not yet saved as a device or Wertsache.
  const draftsCount = documents?.filter((d) => isReceipt(d) && !d.deviceId && !d.luxuryItemId).length ?? 0;

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}>
        <ScreenHeader
          icon={
            <View style={[styles.logo, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}>
              <Ionicons name="shield-checkmark" size={34} color={theme.brand} />
            </View>
          }
          title={t('home.title')}
          subtitle={t('home.subtitle')}
          actions={
            <Ionicons name="person-outline" size={24} color={theme.text} onPress={() => router.push('/mehr')} />
          }
        />

        <InfoBanner
          title={expiring > 0 ? t('home.expiring', { count: expiring }) : t('home.watching')}
          subtitle={t('home.bannerSubtitle')}
        />

        {devices?.length ? (
          <Card style={styles.spent}>
            <Ionicons name="wallet-outline" size={26} color={theme.brandIcon} />
            <View style={styles.flex}>
              <Text variant="caption" color="textSecondary">
                {t('home.spentIn', { month: now.toLocaleDateString(formatLocale(), { month: 'long' }) })}
              </Text>
              <Text variant="headline">{formatPrice(spent.cents)}</Text>
            </View>
            <Text variant="caption" color="textSecondary">
              {t('home.purchases', { count: spent.count })}
            </Text>
          </Card>
        ) : null}

        {draftsCount > 0 ? (
          <Card
            onPress={() => router.push({ pathname: '/posteingang', params: { open: '1' } })}
            style={[styles.tile, { borderColor: theme.warningSoftBorder, backgroundColor: theme.warningSoft }]}>
            <Ionicons name="create-outline" size={22} color={theme.warningText} />
            <View style={styles.flex}>
              <Text variant="bodyStrong" color="warningText">
                {t('home.drafts.title', { count: draftsCount })}
              </Text>
              <Text variant="caption" color="warningText">
                {t('home.drafts.message')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.warningText} />
          </Card>
        ) : null}

        <Text variant="title">{t('home.actions.title')}</Text>
        <View style={styles.actions}>
          <Action icon="receipt-outline" label={t('home.actions.add')} onPress={() => router.push('/add')} />
          <Action icon="shield-half-outline" label={t('home.actions.extend')} onPress={() => router.push('/warranty-request')} />
          <Action icon="diamond-outline" label={t('home.actions.luxury')} onPress={() => router.push('/luxury-request')} />
          <Action icon="file-tray-outline" label={t('home.actions.inbox')} onPress={() => router.push('/posteingang')} />
        </View>

        {devices?.length ? (
          <View style={styles.tiles}>
            <Card onPress={() => router.push('/gawa')} style={[styles.flex, styles.tile]}>
              <Ionicons name="cube-outline" size={22} color={theme.brandIcon} />
              <View style={styles.flex}>
                <Text variant="caption" color="textSecondary">
                  {t('home.devices')}
                </Text>
                <Text variant="headline">{devices.length}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </Card>
            <Card onPress={() => router.push({ pathname: '/tresor', params: { segment: 'documents' } })} style={[styles.flex, styles.tile]}>
              <Ionicons name="document-text-outline" size={22} color={theme.brandIcon} />
              <View style={styles.flex}>
                <Text variant="caption" color="textSecondary">
                  {t('home.allReceipts')}
                </Text>
                <Text variant="headline">{receiptsCount}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </Card>
          </View>
        ) : null}

        {current.length > 0 ? (
          // One row; longer labels (en, ru) scroll sideways, edge to edge.
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chips}>
            <Chip label={t('home.filterAll')} selected={filter === 'all'} onPress={() => setFilter('all')} />
            {DEVICE_KIND_OPTIONS.map((o) => (
              <Chip key={o.kind} label={o.label} selected={filter === o.kind} onPress={() => setFilter(o.kind)} />
            ))}
          </ScrollView>
        ) : null}

        {isLoading ? (
          <StateView kind="loading" />
        ) : error ? (
          <StateView kind="error" error={error} onRetry={refetch} />
        ) : current.length === 0 ? (
          <StateView
            kind="empty"
            icon="receipt-outline"
            title={t('home.empty.title')}
            message={t('home.empty.message')}
          />
        ) : shown.length === 0 ? (
          <StateView kind="empty" icon="file-tray-outline" title={t('home.emptyCategory.title')} message={t('home.emptyCategory.message')} />
        ) : (
          shown.map((d) => <WarrantyCard key={d.id} device={d} photo={photos.get(d.id)} />)
        )}

        <Button label={t('common:actions.add')} icon="add" onPress={() => router.push('/add')} />

        <Text variant="micro" color="textTertiary" style={styles.poweredBy}>
          {t('home.poweredBy')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({ icon, label, onPress }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={styles.action}>
      <View style={[styles.actionIcon, { backgroundColor: theme.brandSoft }]}>
        <Ionicons name={icon} size={22} color={theme.brand} />
      </View>
      <Text variant="captionStrong" numberOfLines={2} style={styles.actionLabel}>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  chipsRow: { flexGrow: 0, marginHorizontal: -spacing.xl },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  spent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  // Two per row.
  action: { flexBasis: '45%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1 },
  poweredBy: { textAlign: 'center' },
  logo: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
