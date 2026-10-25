import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { VaultRow } from '@/components/devices/vault-row';
import { SearchField } from '@/components/search-field';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { groupByCategory, matches } from '@/lib/device-groups';
import { useGetDevicesQuery } from '@/store/api';
import { spacing, useTheme } from '@/theme';

/** Devices whose Garantie, Gewährleistung or Vignette has run out; kept with their Belege. */
export default function ArchiveScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const { data, isLoading, isFetching, error, refetch } = useGetDevicesQuery();
  const archived = (data ?? []).filter((d) => d.status === 'expired' && d.kind !== 'maintenance');
  const query = search.trim().toLowerCase();
  const shown = query ? archived.filter((d) => matches(d, query)) : archived;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}>
      <Text variant="body" color="textSecondary">
        Abgelaufene Geräte. Belege und Angaben bleiben erhalten, z. B. für die Steuer oder einen Weiterverkauf.
      </Text>
      {archived.length ? <SearchField value={search} onChangeText={setSearch} placeholder="Archiv durchsuchen" /> : null}

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
              <VaultRow key={d.id} device={d} />
            ))}
          </View>
        ))
      ) : query ? (
        <StateView kind="empty" icon="search-outline" title="Nichts gefunden" message={`Kein Gerät passt zu „${search.trim()}“.`} />
      ) : (
        <StateView kind="empty" icon="archive-outline" title="Archiv ist leer" message="Abgelaufene Geräte landen automatisch hier." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  group: { gap: spacing.md },
});
