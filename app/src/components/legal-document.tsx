import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InfoBanner } from '@/components/info-banner';
import { Text } from '@/components/text';
import { spacing, useTheme } from '@/theme';

export type LegalSection = { title: string; body: string | string[] };

/** notice: shown at the top when set (e.g. that only the German version is binding). */
type Props = { title: string; version: string; sections: readonly LegalSection[]; notice?: string };

/** Long-form legal text (terms, privacy policy). Marked as draft until legally reviewed. */
export function LegalDocument({ title, version, sections, notice }: Props) {
  const theme = useTheme();
  const { t } = useTranslation('legal');
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text variant="display">{title}</Text>
      <Text variant="caption" color="textSecondary">
        {t('document.asOf', { date: version })}
      </Text>
      {notice ? (
        <Text variant="body" color="textSecondary">
          {notice}
        </Text>
      ) : null}
      <InfoBanner title={t('document.draftTitle')} subtitle={t('document.draftSubtitle')} />
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
