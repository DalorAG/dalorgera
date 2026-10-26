import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { LANGUAGES, setLanguage } from '@/i18n';
import { spacing } from '@/theme';

import { Chip } from './chip';
import { Text } from './text';

/**
 * Deutsch · English · Русский; the choice is remembered on this device.
 * The navigator is remounted on a language change (see _layout), which lands on the first tab;
 * `returnTo` brings the user back to the screen they changed it on.
 */
export function LanguagePicker({ returnTo }: { returnTo?: Href }) {
  const { t, i18n } = useTranslation();
  const choose = async (language: (typeof LANGUAGES)[number]['value']) => {
    if (language === i18n.language) return;
    await setLanguage(language);
    if (returnTo) requestAnimationFrame(() => router.navigate(returnTo));
  };
  return (
    <View style={styles.group}>
      <Text variant="captionStrong">{t('language.title')}</Text>
      <View style={styles.chips}>
        {LANGUAGES.map((l) => (
          <Chip key={l.value} label={l.label} selected={i18n.language === l.value} onPress={() => choose(l.value)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
