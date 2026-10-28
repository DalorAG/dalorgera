import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Text } from './text';

type Promo = {
  id: 'insurance' | 'extension' | 'plus' | 'scan';
  icon: ComponentProps<typeof Ionicons>['name'];
  href: Href;
  /** Shows home.promos.<id>.badge, e.g. "−10 %" */
  badge?: boolean;
};

/** Aktionen on the Übersicht; texts in overview.json (home.promos.<id>). */
const PROMOS: Promo[] = [
  { id: 'insurance', icon: 'diamond-outline', href: '/tresor', badge: true },
  { id: 'extension', icon: 'shield-half-outline', href: '/warranty-request' },
  { id: 'plus', icon: 'rocket-outline', href: '/pricing', badge: true },
  { id: 'scan', icon: 'receipt-outline', href: '/add' },
];

/** Cards swiped sideways, the next one peeking in at the edge. */
export function PromoCarousel() {
  const theme = useTheme();
  const { t } = useTranslation('overview');
  const { width } = useWindowDimensions();
  // Screen padding on the left, a peek of the next card on the right; capped for tablets and web.
  const cardWidth = Math.min(width - spacing.xl * 2 - 32, 360);
  const interval = cardWidth + spacing.md;
  const [index, setIndex] = useState(0);
  const backgrounds = [theme.brand, theme.brandPressed];

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        style={styles.scroll}
        contentContainerStyle={styles.row}
        scrollEventThrottle={16}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / interval))}>
        {PROMOS.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => router.push(p.href)}
            accessibilityRole="button"
            accessibilityLabel={`${t(`home.promos.${p.id}.title`)}. ${t(`home.promos.${p.id}.text`)}`}
            style={({ pressed }) => [
              styles.card,
              { width: cardWidth, backgroundColor: backgrounds[i % backgrounds.length], opacity: pressed ? 0.9 : 1 },
            ]}>
            <View style={styles.top}>
              <View style={styles.icon}>
                <Ionicons name={p.icon} size={22} color={theme.textOnBrand} />
              </View>
              {p.badge ? (
                <View style={[styles.badge, { backgroundColor: theme.textOnBrand }]}>
                  <Text variant="captionStrong" style={{ color: theme.brand }}>
                    {t(`home.promos.${p.id as 'insurance' | 'plus'}.badge`)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="headline" color="textOnBrand" numberOfLines={2}>
              {t(`home.promos.${p.id}.title`)}
            </Text>
            <Text variant="caption" color="textOnBrand" numberOfLines={3} style={styles.text}>
              {t(`home.promos.${p.id}.text`)}
            </Text>
            <View style={styles.cta}>
              <Text variant="captionStrong" color="textOnBrand">
                {t(`home.promos.${p.id}.cta`)}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={theme.textOnBrand} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {PROMOS.map((p, i) => (
          <View
            key={p.id}
            style={[styles.dot, { backgroundColor: i === index ? theme.brand : theme.borderStrong, width: i === index ? 16 : 6 }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  scroll: { flexGrow: 0, marginHorizontal: -spacing.xl },
  row: { gap: spacing.md, paddingHorizontal: spacing.xl },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs, minHeight: 168 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.pill },
  text: { opacity: 0.9 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 'auto', paddingTop: spacing.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { height: 6, borderRadius: 3 },
});
