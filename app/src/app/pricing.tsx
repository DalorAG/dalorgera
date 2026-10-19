import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/badge';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { spacing, useTheme } from '@/theme';

// Prices and in-app purchases are not decided yet: the screen only shows what each plan includes.
const PLANS = [
  {
    name: 'Basis',
    price: 'Kostenlos',
    current: true,
    features: ['Unbegrenzt Belege scannen', 'Erinnerungen an Garantie, Gewährleistung und Wartung', 'Digitaler Tresor'],
  },
  {
    name: 'Premium',
    price: 'Demnächst',
    current: false,
    features: [
      'Alles aus Basis',
      'Familienkonto für mehrere Personen',
      'Angebote zur Garantieverlängerung',
    ],
  },
];

export default function PricingScreen() {
  const theme = useTheme();
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {PLANS.map((plan) => (
        <Card key={plan.name} style={[styles.plan, plan.current && { borderColor: theme.brand, borderWidth: 2 }]}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text variant="title">{plan.name}</Text>
              <Text variant="headline" color="textSecondary">
                {plan.price}
              </Text>
            </View>
            {plan.current ? <StatusBadge tone="success" label="Dein Tarif" /> : null}
          </View>
          {plan.features.map((f) => (
            <View key={f} style={styles.feature}>
              <Ionicons name="checkmark-circle" size={18} color={theme.success} />
              <Text variant="body" style={styles.flex}>
                {f}
              </Text>
            </View>
          ))}
        </Card>
      ))}
      <Text variant="caption" color="textSecondary">
        Premium ist noch nicht verfügbar. Wir informieren dich, sobald es losgeht.
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
