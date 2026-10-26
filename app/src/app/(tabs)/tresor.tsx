import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { DocumentsList } from '@/components/documents-list';
import { ScreenHeader } from '@/components/screen-header';
import { SearchField } from '@/components/search-field';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import type { Device, DocumentItem, LuxuryItem } from '@/lib/api-types';
import { DOCUMENT_KIND_LABELS } from '@/lib/device-ui';
import { formatPrice } from '@/lib/format';
import { LUXURY_CATEGORIES, REQUEST_STATUS_LABELS, currentValue, itemTitle, totals, valueChange } from '@/lib/luxury';
import { useGetDevicesQuery, useGetDocumentUrlQuery, useGetDocumentsQuery, useGetLuxuryItemsQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

type Segment = 'items' | 'documents';

const words = (query: string) => query.split(/\s+/).filter(Boolean);

function itemMatches(item: LuxuryItem, query: string): boolean {
  const category = LUXURY_CATEGORIES.find((c) => c.value === item.category)?.label;
  const text = [item.brand, item.model, category, item.store, item.referenceNumber, item.serialNumber, item.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words(query).every((w) => text.includes(w));
}

function documentMatches(doc: DocumentItem, owner: string | undefined, query: string): boolean {
  const text = [DOCUMENT_KIND_LABELS[doc.kind], doc.extracted?.merchant, owner, doc.rawText]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words(query).every((w) => text.includes(w));
}

/** Tresor: Wertsachen with what they are worth today, and every Beleg in the app. */
export default function TresorScreen() {
  const theme = useTheme();
  const { t } = useTranslation(['tresor', 'common']);
  const params = useLocalSearchParams<{ segment?: Segment }>();
  const [segment, setSegment] = useState<Segment>(params.segment === 'documents' ? 'documents' : 'items');
  const [search, setSearch] = useState('');
  const items = useGetLuxuryItemsQuery();
  const documents = useGetDocumentsQuery();
  const { data: devices } = useGetDevicesQuery();
  const active = segment === 'items' ? items : documents;
  const query = search.trim().toLowerCase();

  const owners = ownerNames(devices ?? [], items.data ?? []);
  const shownItems = (items.data ?? []).filter((i) => !query || itemMatches(i, query));
  const shownDocuments = (documents.data ?? []).filter(
    (d) => !query || documentMatches(d, owners.get(d.deviceId ?? d.luxuryItemId ?? ''), query),
  );
  const sum = totals(items.data ?? []);
  const currency = items.data?.[0]?.currency ?? 'EUR';

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={active.isFetching && !active.isLoading} onRefresh={active.refetch} />}>
        <ScreenHeader
          icon={<Ionicons name="lock-closed" size={40} color={theme.brand} />}
          title={t('list.title')}
          subtitle={t('list.subtitle')}
        />

        <Card style={[styles.wealth, { backgroundColor: theme.brand }]}>
          <Text variant="caption" color="textOnBrand">
            {t('list.wealth')}
          </Text>
          <Text variant="display" color="textOnBrand">
            {formatPrice(sum.value, currency)}
          </Text>
          <View style={styles.wealthRow}>
            <Text variant="caption" color="textOnBrand">
              {t('list.itemCount', { count: items.data?.length ?? 0 })}
            </Text>
            <Text variant="caption" color="textOnBrand">
              {t('list.totalCost', { amount: formatPrice(sum.cost, currency) })}
            </Text>
          </View>
        </Card>

        <Pressable
          onPress={() => router.push('/luxury-request')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: pressed ? theme.brandSoft : theme.surface, borderColor: theme.brand },
          ]}>
          <View style={[styles.ctaIcon, { backgroundColor: theme.brand }]}>
            <Ionicons name="add" size={22} color={theme.textOnBrand} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">{t('list.add')}</Text>
            <Text variant="caption" color="textSecondary">
              {t('list.addHint')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.brand} />
        </Pressable>

        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder={segment === 'items' ? t('list.searchItems') : t('list.searchDocuments')}
        />

        <View style={[styles.segments, { borderBottomColor: theme.border }]}>
          {(
            [
              ['items', t('list.tabItems', { n: items.data?.length ?? 0 })],
              ['documents', t('list.tabDocuments', { n: documents.data?.length ?? 0 })],
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

        {active.isLoading ? (
          <StateView kind="loading" />
        ) : active.error ? (
          <StateView kind="error" error={active.error} onRetry={active.refetch} />
        ) : segment === 'items' ? (
          shownItems.length ? (
            <View style={styles.list}>
              {shownItems.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </View>
          ) : query ? (
            <StateView kind="empty" icon="search-outline" title={t('common:state.nothingFound')}
              message={t('list.noItemMatch', { query: search.trim() })}
             />
          ) : (
            <StateView
              kind="empty"
              icon="diamond-outline"
              title={t('list.emptyItems.title')}
              message={t('list.emptyItems.message')}
            />
          )
        ) : shownDocuments.length ? (
          <DocumentsList documents={shownDocuments} devices={devices ?? []} luxuryItems={items.data ?? []} />
        ) : query ? (
          <StateView kind="empty" icon="search-outline" title={t('common:state.nothingFound')}
            message={t('list.noDocumentMatch', { query: search.trim() })}
           />
        ) : (
          <StateView kind="empty" icon="receipt-outline" title={t('list.emptyDocuments.title')}
            message={t('list.emptyDocuments.message')}
           />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Device and Wertsache names by id, so Belege can be found by what they belong to. */
function ownerNames(devices: Device[], items: LuxuryItem[]) {
  return new Map<string, string>([...devices.map((d) => [d.id, d.name] as const), ...items.map((i) => [i.id, itemTitle(i)] as const)]);
}

function ItemRow({ item }: { item: LuxuryItem }) {
  const theme = useTheme();
  const { t } = useTranslation(['tresor', 'common']);
  const category = LUXURY_CATEGORIES.find((c) => c.value === item.category);
  const cover = item.photos[0];
  const { data: coverUrl } = useGetDocumentUrlQuery(cover?.id ?? '', { skip: !cover });
  const value = currentValue(item);
  const change = valueChange(item);
  const status = item.request
    ? t('list.insured', { status: REQUEST_STATUS_LABELS[item.request.status] })
    : t('list.notInsured');

  return (
    <Card onPress={() => router.push({ pathname: '/luxury/[id]', params: { id: item.id } })} style={styles.row}>
      <View style={[styles.thumb, { backgroundColor: theme.surfaceMuted }]}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <Ionicons name={category?.icon ?? 'diamond-outline'} size={24} color={theme.brandIcon} />
        )}
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {itemTitle(item)}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {category?.label} · {status}
        </Text>
      </View>
      <View style={styles.value}>
        <Text variant="micro" color="textSecondary">
          {t('list.currentValue')}
        </Text>
        <Text variant="bodyStrong">{value != null ? formatPrice(value, item.currency) : '–'}</Text>
        {change ? (
          <Text variant="micro" color={change.startsWith('−') ? 'danger' : 'success'}>
            {change}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  wealth: { gap: spacing.xs },
  wealthRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  ctaIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    marginBottom: -StyleSheet.hairlineWidth,
  },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  value: { alignItems: 'flex-end' },
});
