import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import type { Deal } from '@/lib/api-types';
import { formatDate } from '@/lib/format';
import { useSetDealSavedMutation } from '@/store/api';
import { radius, shadow, spacing, useTheme } from '@/theme';

import { Text } from '../text';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Unknown names from the table fall back to a price tag instead of a "?" glyph. */
export const dealIcon = (deal: Deal): IconName =>
  deal.icon in Ionicons.glyphMap ? (deal.icon as IconName) : 'pricetag-outline';

/** Photo, or the icon on the shop's colour, with the badge on top; shared by the card and the detail screen. */
export function DealHero({ deal, height, children }: { deal: Deal; height: number; children?: ReactNode }) {
  const icon = dealIcon(deal);
  return (
    <View style={[styles.hero, { height, backgroundColor: deal.accent }]}>
      {deal.imageUrl ? (
        <>
          <Image source={deal.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          <View style={styles.shade} />
        </>
      ) : (
        <>
          {/* Oversized icon cut off at the corner as the picture, a small one as the mark. */}
          <Ionicons name={icon} size={height * 1.2} color="rgba(255,255,255,0.14)" style={styles.watermark} />
          <View style={styles.mark}>
            <Ionicons name={icon} size={22} color="#FFFFFF" />
          </View>
        </>
      )}
      {deal.badge ? (
        <View style={styles.badge}>
          <Text variant="captionStrong" style={{ color: deal.accent }} numberOfLines={1}>
            {deal.badge}
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function SaveButton({ deal, style }: { deal: Deal; style?: ViewStyle }) {
  const { t } = useTranslation('overview');
  const [setSaved] = useSetDealSavedMutation();
  return (
    <Pressable
      onPress={() => setSaved({ id: deal.id, saved: !deal.saved })}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: deal.saved }}
      accessibilityLabel={deal.saved ? t('home.deals.unsave') : t('home.deals.save')}
      style={({ pressed }) => [styles.save, pressed && styles.pressed, style]}>
      <Ionicons name={deal.saved ? 'heart' : 'heart-outline'} size={20} color={deal.saved ? '#E11D48' : '#1F2937'} />
    </Pressable>
  );
}

/** Card in the Aktionen rows on the Übersicht; opens the deal inside the app. */
export function DealCard({ deal, width }: { deal: Deal; width: number }) {
  const theme = useTheme();
  const { t } = useTranslation('overview');

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/deal/[id]', params: { id: deal.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${deal.store}: ${deal.title}`}
      style={({ pressed }) => [
        styles.card,
        { width, backgroundColor: theme.surface, borderColor: theme.border },
        shadow(theme.shadow),
        pressed && styles.pressed,
      ]}>
      <DealHero deal={deal} height={128}>
        <SaveButton deal={deal} style={styles.cardSave} />
        <Text variant="headline" style={styles.store} numberOfLines={1}>
          {deal.store}
        </Text>
      </DealHero>
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {deal.title}
        </Text>
        {deal.description ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {deal.description}
          </Text>
        ) : null}
        {deal.validUntil ? (
          <View style={styles.until}>
            <Ionicons name="time-outline" size={14} color={theme.textTertiary} />
            <Text variant="caption" color="textTertiary">
              {t('home.deals.until', { date: formatDate(deal.validUntil) })}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  hero: { padding: spacing.md, overflow: 'hidden' },
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
  shade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  badge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    maxWidth: '70%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  save: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSave: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  store: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    right: spacing.md,
    color: '#FFFFFF',
  },
  body: { padding: spacing.md, gap: spacing.xxs, flex: 1 },
  until: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: 'auto',
    paddingTop: spacing.sm,
  },
});
