import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { Deal, DealCategory } from '@/lib/api-types';
import { useGetDealsQuery } from '@/store/api';
import { spacing } from '@/theme';

import { DealCard } from './deals/deal-card';
import { Text } from './text';

/** Order of the rows; everyday shopping first. */
const CATEGORIES: DealCategory[] = ['lebensmittel', 'drogerie', 'technik', 'haushalt', 'moebel', 'mode', 'heimwerken'];

/**
 * Running Aktionen of Austrian shops, one row per category and the user's Merkliste on top;
 * maintained in the deals table, hidden while empty or failing.
 */
export function DealsList() {
  const { t } = useTranslation('overview');
  const { width } = useWindowDimensions();
  const { data: deals } = useGetDealsQuery();
  // Same peek as the PromoCarousel, a bit narrower so the next card shows more.
  const cardWidth = Math.min(width - spacing.xl * 2 - 64, 280);

  if (!deals?.length) return null;

  const saved = deals.filter((d) => d.saved);
  const rows = CATEGORIES.map((c) => [t(`home.deals.categories.${c}`), deals.filter((d) => d.category === c)] as const);

  return (
    <View style={styles.wrap}>
      <Text variant="title">{t('home.deals.title')}</Text>
      {saved.length ? <Row title={t('home.deals.saved')} deals={saved} cardWidth={cardWidth} /> : null}
      {rows.map(([title, list]) =>
        list.length ? <Row key={title} title={title} deals={list} cardWidth={cardWidth} /> : null,
      )}
      <Text variant="caption" color="textTertiary">
        {t('home.deals.note')}
      </Text>
    </View>
  );
}

function Row({ title, deals, cardWidth }: { title: string; deals: Deal[]; cardWidth: number }) {
  return (
    <View style={styles.row}>
      <Text variant="headline">
        {title}{' '}
        <Text variant="headline" color="textTertiary">
          {deals.length}
        </Text>
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + spacing.md}
        decelerationRate="fast"
        style={styles.scroll}
        contentContainerStyle={styles.cards}>
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} width={cardWidth} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  row: { gap: spacing.sm },
  scroll: { flexGrow: 0, marginHorizontal: -spacing.xl },
  cards: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
  },
});
