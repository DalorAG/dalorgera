import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import type { LuxuryItem } from '@/lib/api-types';
import { formatPrice } from '@/lib/format';
import { LUXURY_CATEGORIES, REQUEST_STATUS_LABELS } from '@/lib/luxury';
import { useGetDocumentUrlQuery, useGetLuxuryItemsQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

/** Luxusartikel: watches, jewellery and bags; insurance is requested per item from its detail screen. */
export default function LuxuryScreen() {
  const theme = useTheme();
  const { data: items, isLoading, isFetching, error, refetch } = useGetLuxuryItemsQuery();

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}>
        <ScreenHeader
          icon={<Ionicons name="diamond" size={40} color={theme.brand} />}
          title="Luxus"
          subtitle="Uhren, Schmuck und Taschen an einem Ort, mit einem Tipp versichert."
        />

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
            <Text variant="bodyStrong">Luxusartikel hinzufügen</Text>
            <Text variant="caption" color="textSecondary">
              Fotos und Angaben speichern, Versicherung später anfragen.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.brand} />
        </Pressable>

        <Text variant="title">Meine Artikel</Text>
        {isLoading ? (
          <StateView kind="loading" />
        ) : error ? (
          <StateView kind="error" error={error} onRetry={refetch} />
        ) : items?.length ? (
          <View style={styles.list}>
            {items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </View>
        ) : (
          <Text variant="body" color="textSecondary">
            Noch keine Artikel. Füge deine Uhr, deinen Schmuck oder deine Tasche hinzu.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ItemRow({ item }: { item: LuxuryItem }) {
  const theme = useTheme();
  const category = LUXURY_CATEGORIES.find((c) => c.value === item.category);
  const cover = item.photos[0];
  const { data: coverUrl } = useGetDocumentUrlQuery(cover?.id ?? '', { skip: !cover });
  const status = item.request ? `Versicherung: ${REQUEST_STATUS_LABELS[item.request.status]}` : 'Nicht versichert';

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
          {item.brand} {item.model}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {[item.valueCents != null ? formatPrice(item.valueCents, item.currency) : null, status].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  ctaIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
