import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DocumentsList } from '@/components/documents-list';
import { ScreenHeader } from '@/components/screen-header';
import { SearchField } from '@/components/search-field';
import { StateView } from '@/components/state-view';
import { useDebouncedValue } from '@/features/use-debounced-value';
import { useGetDevicesQuery, useGetDocumentsQuery } from '@/store/api';
import { spacing, useTheme } from '@/theme';

export default function ReceiptsScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  // Full-text search in the recognized receipt text (store, products, ...).
  const q = useDebouncedValue(search.trim());
  const { data, isLoading, isFetching, error, refetch } = useGetDocumentsQuery(q ? { q } : undefined);
  const { data: devices } = useGetDevicesQuery();

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}>
        <ScreenHeader
          icon={<Ionicons name="document-text" size={40} color={theme.brand} />}
          title="Belege"
          subtitle="Kassenbons, Rechnungen und Garantiescheine."
        />
        <SearchField value={search} onChangeText={setSearch} placeholder="Belege durchsuchen, z. B. Media Markt" />
        {isLoading ? (
          <StateView kind="loading" />
        ) : error ? (
          <StateView kind="error" error={error} onRetry={refetch} />
        ) : data?.length ? (
          <DocumentsList documents={data} devices={devices ?? []} />
        ) : q ? (
          <StateView kind="empty" icon="search-outline" title="Nichts gefunden" message={`Kein Beleg passt zu „${q}“.`} />
        ) : (
          <StateView
            kind="empty"
            icon="receipt-outline"
            title="Noch keine Belege"
            message="Fotografiere einen Kassenbon oder Garantieschein."
            action={<Button label="Beleg scannen" icon="camera-outline" onPress={() => router.push('/add')} />}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
});
