import { ScrollView, StyleSheet, View } from 'react-native';

import { InfoBanner } from '@/components/info-banner';
import { Text } from '@/components/text';
import { spacing, useTheme } from '@/theme';

export type LegalSection = { title: string; body: string | string[] };

type Props = { title: string; version: string; sections: LegalSection[] };

/** Long-form legal text (terms, privacy policy). Marked as draft until legally reviewed. */
export function LegalDocument({ title, version, sections }: Props) {
  const theme = useTheme();
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text variant="display">{title}</Text>
      <Text variant="caption" color="textSecondary">
        Stand: {version}
      </Text>
      <InfoBanner title="Entwurf" subtitle="Diese Fassung wird vor dem offiziellen Start rechtlich geprüft." />
      {sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text variant="headline">{s.title}</Text>
          {(Array.isArray(s.body) ? s.body : [s.body]).map((p, i) => (
            <Text key={i} variant="body" color="textSecondary">
              {p}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  section: { gap: spacing.sm },
});
