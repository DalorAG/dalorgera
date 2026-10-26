import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { LANGUAGES, setLanguage } from '@/i18n';
import { spacing } from '@/theme';

import { Chip } from './chip';
import { Text } from './text';

/** Deutsch · English · Русский; the choice is remembered on this device. */
export function LanguagePicker() {
  const { t, i18n } = useTranslation();
  return (
    <View style={styles.group}>
      <Text variant="captionStrong">{t('language.title')}</Text>
      <View style={styles.chips}>
        {LANGUAGES.map((l) => (
          <Chip key={l.value} label={l.label} selected={i18n.language === l.value} onPress={() => setLanguage(l.value)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
