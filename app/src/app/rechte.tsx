import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import type { ParseKeys } from 'i18next';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { InfoBanner } from '@/components/info-banner';
import { Text } from '@/components/text';
import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Texts live in legal.json under rights.*; these lists only fix order and icons.
const COMPARISON = ['basis', 'party', 'duration', 'covers', 'exclusion'] as const;

type Fact = { icon: IconName; key: ParseKeys<'legal'> };

const STATUTORY_FACTS: Fact[] = [
  { icon: 'calendar-outline', key: 'rights.statutory.facts.period' },
  { icon: 'scale-outline', key: 'rights.statutory.facts.burdenOfProof' },
  { icon: 'hourglass-outline', key: 'rights.statutory.facts.lawsuit' },
  { icon: 'people-outline', key: 'rights.statutory.facts.scope' },
];

// How a defect gets fixed under the Gewährleistung: always in this order.
const REMEDY_STEPS: { icon: IconName; key: 'repair' | 'refund' }[] = [
  { icon: 'construct-outline', key: 'repair' },
  { icon: 'cash-outline', key: 'refund' },
];

const TERMS = ['defect', 'handover', 'burdenOfProof', 'rescission'] as const;

const WARRANTY_FACTS: Fact[] = [
  { icon: 'gift-outline', key: 'rights.warranty.facts.voluntary' },
  { icon: 'options-outline', key: 'rights.warranty.facts.conditions' },
  { icon: 'swap-vertical-outline', key: 'rights.warranty.facts.difference' },
  { icon: 'shield-checkmark-outline', key: 'rights.warranty.facts.noReplacement' },
];

const TIPS: Fact[] = [
  { icon: 'receipt-outline', key: 'rights.tips.facts.keepInvoice' },
  { icon: 'storefront-outline', key: 'rights.tips.facts.retailerFirst' },
  { icon: 'business-outline', key: 'rights.tips.facts.warrantyLater' },
  { icon: 'alarm-outline', key: 'rights.tips.facts.reportQuickly' },
];

const HELP = [
  { key: 'ak', url: 'https://www.arbeiterkammer.at' },
  { key: 'vki', url: 'https://vki.at' },
] as const;

/** Garantie vs. Gewährleistung in Austria, in plain words. */
export default function RightsScreen() {
  const theme = useTheme();
  const { t } = useTranslation('legal');
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text variant="display">{t('rights.title')}</Text>
      <Text variant="body" color="textSecondary">
        {t('rights.intro')}
      </Text>
      <InfoBanner title={t('rights.summary.title')} subtitle={t('rights.summary.text')} />

      <Card style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableLabel} />
          <Text variant="captionStrong" style={styles.tableCell}>
            {t('rights.comparison.statutory')}
          </Text>
          <Text variant="captionStrong" style={styles.tableCell}>
            {t('rights.comparison.warranty')}
          </Text>
        </View>
        {COMPARISON.map((row) => (
          <View key={row} style={[styles.tableRow, { borderTopColor: theme.border }, styles.tableDivider]}>
            <Text variant="caption" color="textSecondary" style={styles.tableLabel}>
              {t(`rights.comparison.rows.${row}.label`)}
            </Text>
            <Text variant="caption" style={styles.tableCell}>
              {t(`rights.comparison.rows.${row}.statutory`)}
            </Text>
            <Text variant="caption" style={styles.tableCell}>
              {t(`rights.comparison.rows.${row}.warranty`)}
            </Text>
          </View>
        ))}
      </Card>

      <Section title={t('rights.statutory.title')} facts={STATUTORY_FACTS} />
      <Remedies />
      <Section title={t('rights.warranty.title')} facts={WARRANTY_FACTS} />
      <Section title={t('rights.tips.title')} facts={TIPS} />
      <Terms />

      <View style={styles.section}>
        <Text variant="headline">{t('rights.help.title')}</Text>
        {HELP.map((h) => (
          <Pressable
            key={h.url}
            onPress={() => WebBrowser.openBrowserAsync(h.url)}
            accessibilityRole="link"
            style={[styles.link, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="body" style={styles.flex}>
              {t(`rights.help.${h.key}`)}
            </Text>
            <Ionicons name="open-outline" size={18} color={theme.brandIcon} />
          </Pressable>
        ))}
      </View>

      <Text variant="caption" color="textSecondary">
        {t('rights.disclaimer')}
      </Text>
    </ScrollView>
  );
}

function Section({ title, facts }: { title: string; facts: Fact[] }) {
  const theme = useTheme();
  const { t } = useTranslation('legal');
  return (
    <View style={styles.section}>
      <Text variant="headline">{title}</Text>
      {facts.map((f) => (
        <View key={f.key} style={styles.fact}>
          <Ionicons name={f.icon} size={20} color={theme.brandIcon} />
          <Text variant="body" color="textSecondary" style={styles.flex}>
            {t(f.key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Remedies() {
  const theme = useTheme();
  const { t } = useTranslation('legal');
  return (
    <View style={styles.section}>
      <Text variant="headline">{t('rights.remedies.title')}</Text>
      <Card style={styles.steps}>
        {REMEDY_STEPS.map((step, i) => (
          <View key={step.key} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={[styles.stepBadge, { backgroundColor: i === 0 ? theme.brand : theme.brandSoft }]}>
                <Ionicons name={step.icon} size={18} color={i === 0 ? theme.textOnBrand : theme.brand} />
              </View>
              {i < REMEDY_STEPS.length - 1 ? <View style={[styles.stepLine, { backgroundColor: theme.border }]} /> : null}
            </View>
            <View style={[styles.flex, styles.stepCopy, i < REMEDY_STEPS.length - 1 && styles.stepGap]}>
              <Text variant="captionStrong" color="brand">
                {t('rights.remedies.step', { number: i + 1 })}
              </Text>
              <Text variant="bodyStrong">{t(`rights.remedies.${step.key}.title`)}</Text>
              <Text variant="caption" color="textSecondary">
                {t(`rights.remedies.${step.key}.text`)}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

function Terms() {
  const theme = useTheme();
  const { t } = useTranslation('legal');
  return (
    <View style={styles.section}>
      <Text variant="headline">{t('rights.terms.title')}</Text>
      <Card style={styles.table}>
        {TERMS.map((term, i) => (
          <View key={term} style={[styles.term, i > 0 && [styles.tableDivider, { borderTopColor: theme.border }]]}>
            <Text variant="bodyStrong">{t(`rights.terms.${term}.term`)}</Text>
            <Text variant="caption" color="textSecondary">
              {t(`rights.terms.${term}.definition`)}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },
  section: { gap: spacing.md },
  fact: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  table: { gap: 0, paddingVertical: spacing.sm },
  tableRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  tableDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  tableLabel: { width: 84 },
  tableCell: { flex: 1 },
  steps: { gap: 0 },
  step: { flexDirection: 'row', gap: spacing.md },
  stepRail: { alignItems: 'center' },
  stepBadge: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 2, flex: 1, minHeight: spacing.lg, marginVertical: spacing.xs },
  stepCopy: { gap: spacing.xxs },
  stepGap: { paddingBottom: spacing.lg },
  term: { gap: spacing.xxs, paddingVertical: spacing.sm },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
