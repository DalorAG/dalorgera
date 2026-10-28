import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DealHero, SaveButton } from '@/components/deals/deal-card';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { formatDate } from '@/lib/format';
import { useGetDealsQuery, useSetDealSavedMutation } from '@/store/api';
import { spacing, useTheme } from '@/theme';

/** One Aktion inside the app: picture, conditions and validity; the shop opens in the in-app browser. */
export default function DealScreen() {
  const theme = useTheme();
  const { t } = useTranslation('overview');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: deals, isLoading, error, refetch } = useGetDealsQuery();
  const [setSaved] = useSetDealSavedMutation();
  const deal = deals?.find((d) => d.id === id);

  if (isLoading) return <StateView kind="loading" />;
  if (error) return <StateView kind="error" error={error} onRetry={refetch} />;
  // Expired since the list was loaded, or an old link.
  if (!deal)
    return (
      <StateView
        kind="empty"
        icon="time-outline"
        title={t('home.deals.detail.gone')}
        message={t('home.deals.detail.goneMessage')}
      />
    );

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: deal.store }} />
      <DealHero deal={deal} height={240}>
        <SaveButton deal={deal} style={styles.save} />
      </DealHero>

      <View style={styles.body}>
        <View style={styles.head}>
          <Text variant="caption" color="textSecondary">
            {deal.store} · {t(`home.deals.categories.${deal.category}`)}
          </Text>
          <Text variant="title">{deal.title}</Text>
          {deal.description ? <Text color="textSecondary">{deal.description}</Text> : null}
        </View>

        <View style={styles.validity}>
          <Ionicons name="time-outline" size={18} color={theme.brandIcon} />
          <Text variant="bodyStrong">
            {deal.validUntil
              ? t('home.deals.detail.validUntil', {
                  date: formatDate(deal.validUntil),
                })
              : t('home.deals.detail.untilRevoked')}
          </Text>
        </View>

        {deal.conditions ? (
          <Card style={styles.conditions}>
            <Text variant="captionStrong" color="textSecondary">
              {t('home.deals.detail.conditions')}
            </Text>
            <Text>{deal.conditions}</Text>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <Button
            label={t('home.deals.detail.open')}
            icon="open-outline"
            onPress={() => WebBrowser.openBrowserAsync(deal.url)}
          />
          <Button
            label={deal.saved ? t('home.deals.saved') : t('home.deals.save')}
            icon={deal.saved ? 'heart' : 'heart-outline'}
            variant="secondary"
            onPress={() => setSaved({ id: deal.id, saved: !deal.saved })}
          />
        </View>

        <Text variant="caption" color="textTertiary">
          {t('home.deals.note')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxxl },
  save: { position: 'absolute', top: spacing.md, right: spacing.md },
  body: { padding: spacing.xl, gap: spacing.lg },
  head: { gap: spacing.xs },
  validity: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  conditions: { gap: spacing.xs },
  actions: { gap: spacing.sm },
});
