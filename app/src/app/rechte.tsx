import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { InfoBanner } from '@/components/info-banner';
import { Text } from '@/components/text';
import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const COMPARISON: { label: string; statutory: string; warranty: string }[] = [
  { label: 'Grundlage', statutory: 'Gesetz (VGG, § 933 ABGB)', warranty: 'Freiwillige Zusage' },
  { label: 'Gegenüber', statutory: 'Händler', warranty: 'Meist Hersteller' },
  { label: 'Dauer', statutory: '2 Jahre ab Übergabe', warranty: 'Laut Garantieschein' },
  { label: 'Deckt', statutory: 'Mängel, die beim Kauf schon da waren', warranty: 'Was der Garantiegeber festlegt' },
  { label: 'Ausschluss', statutory: 'Nicht möglich beim Kauf vom Unternehmen', warranty: 'Bedingungen frei wählbar' },
];

const STATUTORY_FACTS: { icon: IconName; text: string }[] = [
  { icon: 'calendar-outline', text: 'Der Mangel muss innerhalb von 2 Jahren ab Übergabe auftreten.' },
  {
    icon: 'scale-outline',
    text: 'Im ersten Jahr muss der Händler beweisen, dass der Mangel beim Kauf noch nicht da war. Danach musst du es nachweisen.',
  },
  { icon: 'hourglass-outline', text: 'Nach Ablauf der 2 Jahre hast du noch 3 Monate Zeit, deine Rechte gerichtlich geltend zu machen.' },
  { icon: 'people-outline', text: 'Gilt, wenn ein Unternehmen an Konsumenten verkauft. Beim Kauf von Privat an Privat ist sie nicht zwingend.' },
];

// How a defect gets fixed under the Gewährleistung: always in this order.
const REMEDY_STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'construct-outline',
    title: 'Reparatur oder Austausch',
    text: 'Du wählst, was dir lieber ist, kostenlos und in angemessener Frist. Nur wenn eine Variante unmöglich oder unverhältnismäßig teuer ist, darf der Händler die andere anbieten.',
  },
  {
    icon: 'cash-outline',
    title: 'Preisminderung oder Geld zurück',
    text: 'Wenn die Reparatur scheitert, verweigert wird oder zu lange dauert. Den Vertrag auflösen kannst du nur bei einem nicht bloß geringfügigen Mangel.',
  },
];

const TERMS: { term: string; definition: string }[] = [
  { term: 'Mangel', definition: 'Die Ware ist nicht so, wie vereinbart oder üblich, z. B. defekt, unvollständig oder falsch beschrieben.' },
  { term: 'Übergabe', definition: 'Der Moment, in dem du die Ware bekommst. Ab hier laufen die 2 Jahre.' },
  { term: 'Beweislast', definition: 'Wer beweisen muss, dass der Mangel schon beim Kauf da war. Im ersten Jahr der Händler, danach du.' },
  { term: 'Vertragsauflösung', definition: 'Du gibst die Ware zurück und bekommst den Kaufpreis erstattet.' },
];

const WARRANTY_FACTS: { icon: IconName; text: string }[] = [
  { icon: 'gift-outline', text: 'Ein freiwilliges Extra, meist vom Hersteller, manchmal vom Händler. Niemand ist dazu verpflichtet.' },
  { icon: 'options-outline', text: 'Dauer, abgedeckte Schäden und Ablauf legt der Garantiegeber fest.' },
  { icon: 'swap-vertical-outline', text: 'Sie kann länger laufen als die Gewährleistung, aber auch weniger abdecken.' },
  { icon: 'shield-checkmark-outline', text: 'Sie ersetzt die Gewährleistung nie. Darauf muss die Garantieerklärung hinweisen.' },
];

const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'receipt-outline', text: 'Rechnung aufbewahren: ohne Kaufnachweis wird es schwierig. Dafür ist dein Tresor da.' },
  { icon: 'storefront-outline', text: 'In den ersten 2 Jahren zuerst zum Händler, vor allem im ersten Jahr, solange er die Beweislast trägt.' },
  { icon: 'business-outline', text: 'Die Garantie danach nutzen: sie ist vor allem nach Ablauf der Gewährleistung interessant.' },
  { icon: 'alarm-outline', text: 'Mängel rasch melden und die Fristen im Blick behalten. Wir erinnern dich rechtzeitig.' },
];

const HELP = [
  { label: 'Arbeiterkammer (AK)', url: 'https://www.arbeiterkammer.at' },
  { label: 'Verein für Konsumenteninformation (VKI)', url: 'https://vki.at' },
];

/** Garantie vs. Gewährleistung in Austria, in plain words. */
export default function RightsScreen() {
  const theme = useTheme();
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text variant="display">Garantie oder Gewährleistung?</Text>
      <Text variant="body" color="textSecondary">
        Der Fernseher flackert, das Handy lädt nicht mehr, und schon fällt das Wort „Garantie“. Oft ist aber die Gewährleistung
        gemeint. Der Unterschied entscheidet, an wen du dich wendest und welche Rechte du hast.
      </Text>
      <InfoBanner
        title="Kurz gesagt"
        subtitle="Die Gewährleistung ist gesetzlich und gilt gegenüber dem Händler. Die Garantie ist ein freiwilliges Extra, meist vom Hersteller. Beides gilt nebeneinander."
      />

      <Card style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableLabel} />
          <Text variant="captionStrong" style={styles.tableCell}>
            Gewährleistung
          </Text>
          <Text variant="captionStrong" style={styles.tableCell}>
            Garantie
          </Text>
        </View>
        {COMPARISON.map((row) => (
          <View key={row.label} style={[styles.tableRow, { borderTopColor: theme.border }, styles.tableDivider]}>
            <Text variant="caption" color="textSecondary" style={styles.tableLabel}>
              {row.label}
            </Text>
            <Text variant="caption" style={styles.tableCell}>
              {row.statutory}
            </Text>
            <Text variant="caption" style={styles.tableCell}>
              {row.warranty}
            </Text>
          </View>
        ))}
      </Card>

      <Section title="Gewährleistung: dein gesetzliches Recht" facts={STATUTORY_FACTS} />
      <Remedies />
      <Section title="Garantie: ein freiwilliges Extra" facts={WARRANTY_FACTS} />
      <Section title="Praxis-Tipps" facts={TIPS} />
      <Terms />

      <View style={styles.section}>
        <Text variant="headline">Hilfe im Zweifel</Text>
        {HELP.map((h) => (
          <Pressable
            key={h.url}
            onPress={() => WebBrowser.openBrowserAsync(h.url)}
            accessibilityRole="link"
            style={[styles.link, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="body" style={styles.flex}>
              {h.label}
            </Text>
            <Ionicons name="open-outline" size={18} color={theme.brandIcon} />
          </Pressable>
        ))}
      </View>

      <Text variant="caption" color="textSecondary">
        Allgemeine Information für Österreich, ersetzt keine Rechtsberatung. Quellen: RIS (§ 933 ABGB), WKO
        (Verbrauchergewährleistungsgesetz), GTAI (Gewährleistungsrecht Österreich).
      </Text>
    </ScrollView>
  );
}

function Section({ title, facts }: { title: string; facts: { icon: IconName; text: string }[] }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="headline">{title}</Text>
      {facts.map((f) => (
        <View key={f.text} style={styles.fact}>
          <Ionicons name={f.icon} size={20} color={theme.brandIcon} />
          <Text variant="body" color="textSecondary" style={styles.flex}>
            {f.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Remedies() {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="headline">So wird ein Mangel gelöst</Text>
      <Card style={styles.steps}>
        {REMEDY_STEPS.map((step, i) => (
          <View key={step.title} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={[styles.stepBadge, { backgroundColor: i === 0 ? theme.brand : theme.brandSoft }]}>
                <Ionicons name={step.icon} size={18} color={i === 0 ? theme.textOnBrand : theme.brand} />
              </View>
              {i < REMEDY_STEPS.length - 1 ? <View style={[styles.stepLine, { backgroundColor: theme.border }]} /> : null}
            </View>
            <View style={[styles.flex, styles.stepCopy, i < REMEDY_STEPS.length - 1 && styles.stepGap]}>
              <Text variant="captionStrong" color="brand">
                Stufe {i + 1}
              </Text>
              <Text variant="bodyStrong">{step.title}</Text>
              <Text variant="caption" color="textSecondary">
                {step.text}
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
  return (
    <View style={styles.section}>
      <Text variant="headline">Begriffe kurz erklärt</Text>
      <Card style={styles.table}>
        {TERMS.map((t, i) => (
          <View key={t.term} style={[styles.term, i > 0 && [styles.tableDivider, { borderTopColor: theme.border }]]}>
            <Text variant="bodyStrong">{t.term}</Text>
            <Text variant="caption" color="textSecondary">
              {t.definition}
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
