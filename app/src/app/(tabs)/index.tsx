import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { WarrantyCard } from '@/components/devices/warranty-card';
import { InfoBanner } from '@/components/info-banner';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { useGetDevicesQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

export default function OverviewScreen() {
  const theme = useTheme();
  const { data: devices, isLoading, isFetching, error, refetch } = useGetDevicesQuery();

  // Sorted by deadline on the server; expired devices live in the Tresor.
  const protectedDevices = devices?.filter((d) => d.status !== 'expired') ?? [];
  const expiring = protectedDevices.filter((d) => d.status === 'expiring').length;

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

        {isLoading ? (
          <StateView kind="loading" />
        ) : error ? (
          <StateView kind="error" error={error} onRetry={refetch} />
        ) : protectedDevices.length === 0 ? (
          <StateView
            kind="empty"
            icon="receipt-outline"
            title="Noch keine Geräte"
            message="Scanne deinen ersten Kassenbon oder Garantieschein. Wir erinnern dich, bevor der Schutz endet."
          />
        ) : (
          protectedDevices.map((d) => <WarrantyCard key={d.id} device={d} />)
        )}

        <Button label="Gerät hinzufügen" icon="add" onPress={() => router.push('/scan')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  logo: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
