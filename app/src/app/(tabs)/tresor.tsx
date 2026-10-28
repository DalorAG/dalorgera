import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { DocumentsList } from '@/components/documents-list';
import { ScreenHeader } from '@/components/screen-header';
import { SearchField } from '@/components/search-field';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { useHiddenAmounts } from '@/features/use-hidden-amounts';
import { rankByPhoto, usePhotoSearch, type PhotoQuery } from '@/features/use-photo-search';
import type { PhotoSource } from '@/features/use-product-photo';
import type { Device, DocumentItem, LuxuryItem } from '@/lib/api-types';
import { DOCUMENT_KIND_LABELS } from '@/lib/device-ui';
import { apiErrorMessage, formatDate, formatPrice } from '@/lib/format';
import { LUXURY_CATEGORIES, REQUEST_STATUS_LABELS, currentValue, isRequested, itemTitle, totals, valueChange } from '@/lib/luxury';
import { useGetDevicesQuery, useGetDocumentUrlQuery, useGetDocumentsQuery, useGetLuxuryItemsQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

type Segment = 'items' | 'requested' | 'documents';

const words = (query: string) => query.split(/\s+/).filter(Boolean);

function itemText(item: LuxuryItem): string {
  const category = LUXURY_CATEGORIES.find((c) => c.value === item.category)?.label;
  return [item.brand, item.model, category, item.store, item.referenceNumber, item.serialNumber, item.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function documentText(doc: DocumentItem, owner: string | undefined): string {
  return [DOCUMENT_KIND_LABELS[doc.kind], doc.extracted?.merchant, owner, doc.rawText].filter(Boolean).join(' ').toLowerCase();
}

const matchesAll = (text: string, query: string) => words(query).every((w) => text.includes(w));

/** Tresor: Wertsachen with what they are worth today, and every Beleg in the app. */
export default function TresorScreen() {
  const theme = useTheme();
  const { t } = useTranslation(['tresor', 'common', 'components']);
  const params = useLocalSearchParams<{ segment?: Segment }>();
  const [segment, setSegment] = useState<Segment>(
    params.segment === 'documents' || params.segment === 'requested' ? params.segment : 'items',
  );
  const [search, setSearch] = useState('');
  const items = useGetLuxuryItemsQuery();
  const documents = useGetDocumentsQuery();
  const { data: devices } = useGetDevicesQuery();
  const active = segment === 'items' ? items : documents;
  const query = search.trim().toLowerCase();

  const owners = ownerNames(devices ?? [], items.data ?? []);
  const [photoQuery, setPhotoQuery] = useState<PhotoQuery | null>(null);
  const photoSearch = usePhotoSearch();
  const ownerOf = (d: DocumentItem) => owners.get(d.deviceId ?? d.luxuryItemId ?? '');
  // Angefragt: insurance asked for but not confirmed; these stay out of Dein Vermögen.
  const owned = (items.data ?? []).filter((i) => !isRequested(i));
  const requested = (items.data ?? []).filter(isRequested);
  const allItems = segment === 'requested' ? requested : owned;
  const allDocuments = documents.data ?? [];
  const shownItems = photoQuery
    ? rankByPhoto(allItems, itemText, photoQuery)
    : allItems.filter((i) => !query || matchesAll(itemText(i), query));
  const shownDocuments = photoQuery
    ? rankByPhoto(allDocuments, (d) => documentText(d, ownerOf(d)), photoQuery)
    : allDocuments.filter((d) => !query || matchesAll(documentText(d, ownerOf(d)), query));
  const searched = photoQuery?.label ?? search.trim();

  const searchByPhoto = async (source: PhotoSource) => {
    try {
      const found = await photoSearch.search(source);
      if (found) {
        setSearch('');
        setPhotoQuery(found);
      }
    } catch (err) {
      const message = apiErrorMessage(err);
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert(t('components:search.photoFailed'), message);
    }
  };
  const sum = totals(owned);
  const currency = items.data?.[0]?.currency ?? 'EUR';
  const { hidden, toggle, mask } = useHiddenAmounts();

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
          <View style={styles.wealthRow}>
            <Text variant="caption" color="textOnBrand">
              {t('list.wealth')}
            </Text>
            <Pressable
              onPress={toggle}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={hidden ? t('list.showAmounts') : t('list.hideAmounts')}>
              <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textOnBrand} />
            </Pressable>
          </View>
          <Text variant="display" color="textOnBrand">
            {mask(formatPrice(sum.value, currency))}
          </Text>
          <View style={styles.wealthRow}>
            <Text variant="caption" color="textOnBrand">
              {t('list.itemCount', { count: owned.length })}
            </Text>
            <Text variant="caption" color="textOnBrand">
              {t('list.totalCost', { amount: mask(formatPrice(sum.cost, currency)) })}
            </Text>
          </View>
        </Card>

        <AddCard title={t('list.add')} hint={t('list.addHint')} onPress={() => router.push('/luxury-request')} />
        <AddCard
          title={t('list.insure')}
          hint={t('list.insureHint')}
          onPress={() => router.push({ pathname: '/luxury-request', params: { insure: '1' } })}
        />

        <SearchField
          value={search}
          onChangeText={(v) => {
            setPhotoQuery(null);
            setSearch(v);
          }}
          placeholder={segment === 'documents' ? t('list.searchDocuments') : t('list.searchItems')}
          onPhoto={searchByPhoto}
          photoBusy={photoSearch.busy}
          photoQuery={photoQuery}
          onClearPhoto={() => setPhotoQuery(null)}
        />

        <View style={[styles.segments, { borderBottomColor: theme.border }]}>
          {(
            [
              ['items', t('list.tabItems', { n: owned.length })],
              ['requested', t('list.tabRequested', { n: requested.length })],
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
        ) : segment !== 'documents' ? (
          shownItems.length ? (
            <View style={styles.list}>
              {shownItems.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </View>
          ) : query || photoQuery ? (
            <StateView
              kind="empty"
              icon="search-outline"
              title={t('common:state.nothingFound')}
              message={t('list.noItemMatch', { query: searched })}
            />
          ) : segment === 'requested' ? (
            <StateView
              kind="empty"
              icon="shield-checkmark-outline"
              title={t('list.emptyRequested.title')}
              message={t('list.emptyRequested.message')}
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
        ) : query || photoQuery ? (
          <StateView
            kind="empty"
            icon="search-outline"
            title={t('common:state.nothingFound')}
            message={t('list.noDocumentMatch', { query: searched })}
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

function AddCard({ title, hint, onPress }: { title: string; hint: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: pressed ? theme.brandSoft : theme.surface, borderColor: theme.brand },
      ]}>
      <View style={[styles.ctaIcon, { backgroundColor: theme.brand }]}>
        <Ionicons name="add" size={22} color={theme.textOnBrand} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.brand} />
    </Pressable>
  );
}

function ItemRow({ item }: { item: LuxuryItem }) {
  const theme = useTheme();
  const { t } = useTranslation(['tresor', 'common']);
  const category = LUXURY_CATEGORIES.find((c) => c.value === item.category);
  const cover = item.photos[0];
  const { data: coverUrl } = useGetDocumentUrlQuery(cover?.id ?? '', { skip: !cover });
  const { hidden, mask } = useHiddenAmounts();
  const value = currentValue(item);
  const change = hidden ? null : valueChange(item);
  const { request } = item;
  const status = !request
    ? t('list.notInsured')
    : request.status !== 'closed'
      ? t('list.requestedOn', { status: REQUEST_STATUS_LABELS[request.status], date: formatDate(request.createdAt) })
      : request.closedAt
        ? t('list.confirmedOn', { date: formatDate(request.closedAt) })
        : t('list.insured', { status: REQUEST_STATUS_LABELS[request.status] });

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
        <Text variant="bodyStrong">{value != null ? mask(formatPrice(value, item.currency)) : '–'}</Text>
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
  wealthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
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
