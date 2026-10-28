import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { Deal } from '@/lib/api-types';
import { formatDate } from '@/lib/format';
import { useGetDealsQuery } from '@/store/api';
import { radius, shadow, spacing, useTheme } from '@/theme';

import { Text } from './text';

type IconName = ComponentProps<typeof Ionicons>['name'];

const HERO_HEIGHT = 128;

/** Running Aktionen of Austrian shops, maintained in the deals table; hidden while empty or failing. */
export function DealsList() {
  const { t } = useTranslation('overview');
  const { width } = useWindowDimensions();
  const { data: deals } = useGetDealsQuery();
  // Same peek as the PromoCarousel, a bit narrower so the next card shows more.
  const cardWidth = Math.min(width - spacing.xl * 2 - 64, 280);

  if (!deals?.length) return null;

  return (
    <View style={styles.wrap}>
      <Text variant="title">{t('home.deals.title')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + spacing.md}
        decelerationRate="fast"
        style={styles.scroll}
        contentContainerStyle={styles.row}>
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} width={cardWidth} />
        ))}
      </ScrollView>
      <Text variant="caption" color="textTertiary">
        {t('home.deals.note')}
      </Text>
    </View>
  );
}

function DealCard({ deal, width }: { deal: Deal; width: number }) {
  const theme = useTheme();
  const { t } = useTranslation('overview');
  // Unknown names from the table fall back to a price tag instead of a "?" glyph.
  const icon: IconName = deal.icon in Ionicons.glyphMap ? (deal.icon as IconName) : 'pricetag-outline';

  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(deal.url)}
      accessibilityRole="link"
      accessibilityLabel={`${deal.store}: ${deal.title}`}
      style={({ pressed }) => [
        styles.card,
        { width, backgroundColor: theme.surface, borderColor: theme.border },
        shadow(theme.shadow),
        pressed && styles.pressed,
      ]}>
      <View style={[styles.hero, { backgroundColor: deal.accent }]}>
        {deal.imageUrl ? (
          <>
            <Image source={deal.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            <View style={styles.shade} />
          </>
        ) : (
          <>
            {/* Oversized icon cut off at the corner as the picture, a small one as the mark. */}
            <Ionicons name={icon} size={150} color="rgba(255,255,255,0.14)" style={styles.watermark} />
            <View style={styles.mark}>
              <Ionicons name={icon} size={22} color="#FFFFFF" />
            </View>
          </>
        )}
        <Text variant="headline" style={styles.store} numberOfLines={1}>
          {deal.store}
        </Text>
        {deal.badge ? (
          <View style={styles.badge}>
            <Text variant="captionStrong" style={{ color: deal.accent }} numberOfLines={1}>
              {deal.badge}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {deal.title}
        </Text>
        {deal.description ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {deal.description}
          </Text>
        ) : null}
        <View style={styles.footer}>
          {deal.validUntil ? (
            <View style={styles.until}>
              <Ionicons name="time-outline" size={14} color={theme.textTertiary} />
              <Text variant="caption" color="textTertiary">
                {t('home.deals.until', { date: formatDate(deal.validUntil) })}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <Ionicons name="open-outline" size={16} color={theme.textTertiary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  scroll: { flexGrow: 0, marginHorizontal: -spacing.xl },
  row: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.xs },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  hero: { height: HERO_HEIGHT, padding: spacing.md, justifyContent: 'space-between', overflow: 'hidden' },
  watermark: { position: 'absolute', right: -28, bottom: -36 },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Keeps the white store name readable on light photos.
  shade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  store: { position: 'absolute', left: spacing.md, bottom: spacing.md, right: 96, color: '#FFFFFF' },
  badge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    maxWidth: '60%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  body: { padding: spacing.md, gap: spacing.xxs, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: spacing.sm },
  until: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
