import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { formatDate } from '@/lib/format';
import { LUXURY_CATEGORIES, REQUEST_STATUS_LABELS } from '@/lib/luxury';
import { useGetWarrantyRequestsQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

/** Luxus-Versicherung: watches, jewellery and bags, insured through our partner on request. */
export default function LuxuryScreen() {
  const theme = useTheme();
  const { data, isLoading, isFetching, error, refetch } = useGetWarrantyRequestsQuery();
  const requests = data?.filter((r) => r.kind === 'luxury');

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}>
        <ScreenHeader
          icon={<Ionicons name="diamond" size={40} color={theme.brand} />}
          title="Luxus"
          subtitle="Uhren, Schmuck und Taschen gegen Diebstahl, Verlust und Beschädigung versichern."
        />

        <Pressable
          onPress={() => router.push('/luxury-request')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: pressed ? theme.brandSoft : theme.surface, borderColor: theme.brand },
          ]}>
          <View style={[styles.ctaIcon, { backgroundColor: theme.brand }]}>
            <Ionicons name="shield-checkmark" size={20} color={theme.textOnBrand} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">Luxusartikel versichern</Text>
            <Text variant="caption" color="textSecondary">
              Foto machen, Angaben senden: Unser Partner meldet sich mit einem Angebot.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.brand} />
        </Pressable>

        <Text variant="title">Meine Anfragen</Text>
        {isLoading ? (
          <StateView kind="loading" />
        ) : error ? (
          <StateView kind="error" error={error} onRetry={refetch} />
        ) : requests?.length ? (
          <Card style={styles.list}>
            {requests.map((r) => {
              const category = LUXURY_CATEGORIES.find((c) => c.value === r.category);
              return (
                <View key={r.id} style={styles.row}>
                  <Ionicons name={category?.icon ?? 'diamond-outline'} size={20} color={theme.brandIcon} />
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {[r.brand, r.productName].filter(Boolean).join(' ')}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {REQUEST_STATUS_LABELS[r.status]} · {formatDate(r.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        ) : (
          <Text variant="body" color="textSecondary">
            Noch keine Anfragen. Deine Anfragen und ihr Stand erscheinen hier.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  ctaIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
