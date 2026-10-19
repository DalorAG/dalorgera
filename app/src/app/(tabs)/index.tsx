import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
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
import { DEVICE_KIND_OPTIONS } from '@/lib/device-ui';
import { formatPrice, spentInMonth } from '@/lib/format';
import { isPreviewable } from '@/components/device-thumb';
import { useGetDevicesQuery, useGetDocumentsQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

export default function OverviewScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<DeviceKind | 'all'>('all');
  const { data: devices, isLoading, isFetching, error, refetch } = useGetDevicesQuery();

  const { data: documents } = useGetDocumentsQuery();
  // Newest photo per device (documents come newest first).
  const photos = new Map<string, NonNullable<typeof documents>[number]>();
  for (const doc of documents ?? []) {
    if (doc.deviceId && isPreviewable(doc) && !photos.has(doc.deviceId)) photos.set(doc.deviceId, doc);
  }

  // Sorted by deadline on the server; expired devices live in the Tresor,
  // an overdue Wartung stays here because it still needs doing.
  const current = devices?.filter((d) => d.status !== 'expired' || d.kind === 'maintenance') ?? [];
  const expiring = current.filter((d) => (d.kind === 'warranty' || d.kind === 'statutory') && d.status === 'expiring').length;
  const shown = filter === 'all' ? current : current.filter((d) => d.kind === filter);
  const now = new Date();
  const spent = spentInMonth(devices ?? [], now);

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
          title="Garantie-Radar"
          subtitle="Deine Geräte. Deine Sicherheit."
          actions={
            <Ionicons name="person-outline" size={24} color={theme.text} onPress={() => router.push('/mehr')} />
          }
        />

        <InfoBanner
          title={
            expiring > 0
              ? `${expiring} ${expiring === 1 ? 'Garantie läuft' : 'Garantien laufen'} bald ab`
              : 'Wir behalten deine Garantien im Blick.'
          }
          subtitle="Einfach, sicher und automatisch."
        />

        {devices?.length ? (
          <Card style={styles.spent}>
            <Ionicons name="wallet-outline" size={26} color={theme.brandIcon} />
            <View style={styles.flex}>
              <Text variant="caption" color="textSecondary">
                Im {now.toLocaleDateString('de-DE', { month: 'long' })} ausgegeben
              </Text>
              <Text variant="headline">{formatPrice(spent.cents)}</Text>
            </View>
            <Text variant="caption" color="textSecondary">
              {spent.count} {spent.count === 1 ? 'Kauf' : 'Käufe'}
            </Text>
          </Card>
        ) : null}

        {current.length > 0 ? (
          <View style={styles.chips}>
            <Chip label="Alle" selected={filter === 'all'} onPress={() => setFilter('all')} />
            {DEVICE_KIND_OPTIONS.map((o) => (
              <Chip key={o.kind} label={o.label} selected={filter === o.kind} onPress={() => setFilter(o.kind)} />
            ))}
          </View>
        ) : null}

        {isLoading ? (
          <StateView kind="loading" />
        ) : error ? (
          <StateView kind="error" error={error} onRetry={refetch} />
        ) : current.length === 0 ? (
          <StateView
            kind="empty"
            icon="receipt-outline"
            title="Noch keine Geräte"
            message="Scanne deinen ersten Kassenbon oder Garantieschein. Wir erinnern dich, bevor der Schutz endet."
          />
        ) : shown.length === 0 ? (
          <StateView kind="empty" icon="file-tray-outline" title="Nichts in dieser Kategorie" message="Füge etwas mit dem + hinzu." />
        ) : (
          shown.map((d) => <WarrantyCard key={d.id} device={d} photo={photos.get(d.id)} />)
        )}

        <Button label="Hinzufügen" icon="add" onPress={() => router.push('/add')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  spent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
