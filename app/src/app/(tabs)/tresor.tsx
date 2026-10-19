import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VaultRow } from '@/components/devices/vault-row';
import { DocumentsList } from '@/components/documents-list';
import { InfoBanner } from '@/components/info-banner';
import { ScreenHeader } from '@/components/screen-header';
import { SearchField } from '@/components/search-field';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import type { Device } from '@/lib/api-types';
import { useGetDevicesQuery, useGetDocumentsQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

type Segment = 'devices' | 'documents';

const OTHER_CATEGORY = 'Sonstiges';

/** Devices grouped by category (alphabetical, "Sonstiges" last), keeping the deadline order inside a group. */
function groupByCategory(devices: Device[]): [string, Device[]][] {
  const groups = new Map<string, Device[]>();
  for (const d of devices) {
    const category = d.category?.trim() || OTHER_CATEGORY;
    groups.set(category, [...(groups.get(category) ?? []), d]);
  }
  return [...groups].sort(([a], [b]) =>
    a === OTHER_CATEGORY ? 1 : b === OTHER_CATEGORY ? -1 : a.localeCompare(b, 'de'),
  );
}

function matches(device: Device, query: string): boolean {
  const text = [device.name, device.brand, device.category, device.store].filter(Boolean).join(' ').toLowerCase();
  return query.split(/\s+/).every((word) => text.includes(word));
}

export default function VaultScreen() {
  const theme = useTheme();
  const [segment, setSegment] = useState<Segment>('devices');
  const [search, setSearch] = useState('');
  const devices = useGetDevicesQuery();
  const documents = useGetDocumentsQuery();
  const active = segment === 'devices' ? devices : documents;
  const query = search.trim().toLowerCase();
  const shownDevices = query ? (devices.data ?? []).filter((d) => matches(d, query)) : (devices.data ?? []);

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={active.isFetching && !active.isLoading} onRefresh={active.refetch} />
        }>
        <ScreenHeader
          icon={<Ionicons name="lock-closed" size={40} color={theme.brand} />}
          title="Digitaler Tresor"
          subtitle="Alle deine Belege. Sicher an einem Ort."
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
          title="Garantie- und Gewährleistungsfristen werden automatisch berechnet."
          subtitle="Du musst dich um nichts mehr kümmern."
        />

        <View style={[styles.segments, { borderBottomColor: theme.border }]}>
          {(
            [
              ['devices', `Geräte (${devices.data?.length ?? 0})`],
              ['documents', `Alle Belege (${documents.data?.length ?? 0})`],
            ] as const
          ).map(([key, label]) => {
            const selected = segment === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSegment(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.segment, { borderBottomColor: selected ? theme.text : 'transparent' }]}>
                <Text variant={selected ? 'captionStrong' : 'caption'} color={selected ? 'text' : 'textSecondary'}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {segment === 'devices' && devices.data?.length ? (
          <SearchField value={search} onChangeText={setSearch} placeholder="Geräte durchsuchen" />
        ) : null}

        {active.isLoading ? (
          <StateView kind="loading" />
        ) : active.error ? (
          <StateView kind="error" error={active.error} onRetry={active.refetch} />
        ) : segment === 'devices' ? (
          shownDevices.length ? (
            groupByCategory(shownDevices).map(([category, items]) => (
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
            <StateView kind="empty" icon="cube-outline" title="Keine Geräte" message="Füge dein erstes Gerät mit dem + hinzu." />
          )
        ) : documents.data?.length ? (
          <DocumentsList documents={documents.data} devices={devices.data ?? []} />
        ) : (
          <StateView kind="empty" icon="receipt-outline" title="Keine Belege" message="Gescannte Belege erscheinen hier." />
        )}
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
  segments: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    marginBottom: -StyleSheet.hairlineWidth,
  },
});
