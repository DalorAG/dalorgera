import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { InboxList } from '@/components/inbox-list';
import { ScreenHeader } from '@/components/screen-header';
import { SearchField } from '@/components/search-field';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { useDebouncedValue } from '@/features/use-debounced-value';
import { isReceipt } from '@/lib/device-ui';
import { useGetDevicesQuery, useGetDocumentsQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

export default function InboxScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);
  // Full-text search in the recognized receipt text (store, products, ...).
  const q = useDebouncedValue(search.trim());
  const { data: documents, isLoading, isFetching, error, refetch } = useGetDocumentsQuery(q ? { q } : undefined);
  // Produktfotos belong to the device, not to the Belege.
  const receipts = documents?.filter(isReceipt);
  const openCount = receipts?.filter((d) => !d.deviceId).length ?? 0;
  const data = onlyOpen ? receipts?.filter((d) => !d.deviceId) : receipts;
  const { data: devices } = useGetDevicesQuery();

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}>
        <ScreenHeader
          icon={<Ionicons name="file-tray-full" size={40} color={theme.brand} />}
          title="Posteingang"
          subtitle={
            openCount
              ? `${openCount} ${openCount === 1 ? 'Beleg wartet' : 'Belege warten'} auf ein Gerät.`
              : 'Alles zugeordnet. Neue Scans landen hier.'
          }
        />
        <Pressable
          onPress={() => router.push('/warranty-request')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.insurance,
            { backgroundColor: pressed ? theme.brandSoft : theme.surface, borderColor: theme.brand },
          ]}>
          <View style={[styles.insuranceIcon, { backgroundColor: theme.brand }]}>
            <Ionicons name="shield-half" size={20} color={theme.textOnBrand} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">Zusatzversicherung anfragen</Text>
            <Text variant="caption" color="textSecondary">
              Foto machen, absenden: Garantieverlängerung oder Versicherung über unseren Partner.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.brand} />
        </Pressable>
        <SearchField value={search} onChangeText={setSearch} placeholder="Belege durchsuchen, z. B. Media Markt" />
        <View style={styles.filters}>
          <Chip label="Alle" selected={!onlyOpen} onPress={() => setOnlyOpen(false)} />
          <Chip label={`Offen (${openCount})`} selected={onlyOpen} onPress={() => setOnlyOpen(true)} />
        </View>
        {isLoading ? (
          <StateView kind="loading" />
        ) : error ? (
          <StateView kind="error" error={error} onRetry={refetch} />
        ) : data?.length ? (
          <InboxList documents={data} devices={devices ?? []} />
        ) : q ? (
          <StateView kind="empty" icon="search-outline" title="Nichts gefunden" message={`Kein Beleg passt zu „${q}“.`} />
        ) : onlyOpen ? (
          <StateView kind="empty" icon="checkmark-done-outline" title="Alles erledigt" message="Jeder Beleg ist einem Gerät zugeordnet." />
        ) : (
          <StateView
            kind="empty"
            icon="file-tray-outline"
            title="Posteingang ist leer"
            message="Fotografiere einen Kassenbon oder Garantieschein."
            action={<Button label="Beleg scannen" icon="camera-outline" onPress={() => router.push('/add')} />}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filters: { flexDirection: 'row', gap: spacing.sm },
  insurance: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  insuranceIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
});
