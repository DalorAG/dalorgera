import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { VaultRow } from '@/components/devices/vault-row';
import { InfoBanner } from '@/components/info-banner';
import { ScreenHeader } from '@/components/screen-header';
import { SearchField } from '@/components/search-field';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { useDevicePhotos } from '@/features/use-device-photos';
import { groupByCategory, matches } from '@/lib/device-groups';
import { useGetDevicesQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

/** Ga-Wa: Garantie und Gewährleistung of every device still covered; expired ones move to the Archiv. */
export default function GaWaScreen() {
  const theme = useTheme();
  const { t } = useTranslation(['overview', 'common']);
  const [search, setSearch] = useState('');
  const { data, isLoading, isFetching, error, refetch } = useGetDevicesQuery();
  const photos = useDevicePhotos();
  // An overdue Wartung stays because it still needs doing.
  const active = (data ?? []).filter((d) => d.status !== 'expired' || d.kind === 'maintenance');
  const archived = (data?.length ?? 0) - active.length;
  const query = search.trim().toLowerCase();
  const shown = query ? active.filter((d) => matches(d, query)) : active;

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}>
        <ScreenHeader
          icon={<Ionicons name="shield-checkmark" size={40} color={theme.brand} />}
          title="Ga-Wa"
          subtitle={t('gawa.subtitle')}
        />

        <InfoBanner
          icon={
            <View style={[styles.docIcon, { backgroundColor: theme.surface }]}>
              <Ionicons name="document-text-outline" size={28} color={theme.brandIcon} />
              <View style={[styles.docCheck, { backgroundColor: theme.success }]}>
                <Ionicons name="checkmark" size={12} color={theme.textOnBrand} />
              </View>
            </View>
          }
          title={t('gawa.bannerTitle')}
          subtitle={t('gawa.bannerSubtitle')}
        />

        <Text variant="title">{t('gawa.devicesCount', { count: active.length })}</Text>
        {active.length ? <SearchField value={search} onChangeText={setSearch} placeholder={t('gawa.searchPlaceholder')} /> : null}

        {isLoading ? (
          <StateView kind="loading" />
        ) : error ? (
          <StateView kind="error" error={error} onRetry={refetch} />
        ) : shown.length ? (
          groupByCategory(shown).map(([category, items]) => (
            <View key={category} style={styles.group}>
              <Text variant="captionStrong" color="textSecondary">
                {category} ({items.length})
              </Text>
              {items.map((d) => (
                <VaultRow key={d.id} device={d} photo={photos.get(d.id)} />
              ))}
            </View>
          ))
        ) : query ? (
          <StateView
            kind="empty"
            icon="search-outline"
            title={t('common:state.nothingFound')}
            message={t('gawa.noMatch', { query: search.trim() })}
          />
        ) : (
          <StateView kind="empty" icon="cube-outline" title={t('gawa.empty.title')} message={t('gawa.empty.message')} />
        )}

        {archived > 0 ? (
          <Card onPress={() => router.push('/archiv')} style={styles.archive}>
            <Ionicons name="archive-outline" size={22} color={theme.brandIcon} />
            <Text variant="body" style={styles.flex}>
              {t('gawa.archive', { count: archived })}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  docIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCheck: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { gap: spacing.md },
  archive: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
