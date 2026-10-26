import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/badge';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { spacing, useTheme } from '@/theme';

// Prices and in-app purchases are not decided yet: the screen only shows what each plan includes.
const PLANS = [
  {
    id: 'basic',
    current: true,
    features: ['pricing.basic.features.scan', 'pricing.basic.features.reminders', 'pricing.basic.features.vault'],
  },
  {
    id: 'premium',
    current: false,
    features: ['pricing.premium.features.basic', 'pricing.premium.features.family', 'pricing.premium.features.extension'],
  },
] as const;

export default function PricingScreen() {
  const theme = useTheme();
  const { t } = useTranslation('account');
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {PLANS.map((plan) => (
        <Card key={plan.id} style={[styles.plan, plan.current && { borderColor: theme.brand, borderWidth: 2 }]}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text variant="title">{t(`pricing.${plan.id}.name`)}</Text>
              <Text variant="headline" color="textSecondary">
                {t(`pricing.${plan.id}.price`)}
              </Text>
            </View>
            {plan.current ? <StatusBadge tone="success" label={t('pricing.current')} /> : null}
          </View>
          {plan.features.map((f) => (
            <View key={f} style={styles.feature}>
              <Ionicons name="checkmark-circle" size={18} color={theme.success} />
              <Text variant="body" style={styles.flex}>
                {t(f)}
              </Text>
            </View>
          ))}
        </Card>
      ))}
      <Text variant="caption" color="textSecondary">
        {t('pricing.comingSoon')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  plan: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
