// i18next's default export is the instance; its methods are also named exports.
/* eslint-disable import/no-named-as-default-member */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { namespaces, resources } from './resources';

export type Language = keyof typeof resources;

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
];

const STORAGE_KEY = 'language';

const isLanguage = (value: string | null | undefined): value is Language =>
  !!value && Object.prototype.hasOwnProperty.call(resources, value);

/** The first device language we support; English for everyone else. */
function deviceLanguage(): Language {
  for (const locale of getLocales()) if (isLanguage(locale.languageCode)) return locale.languageCode;
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  ns: namespaces,
  defaultNS: 'common',
  lng: deviceLanguage(),
  // German is the source language, every key exists there.
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** A language picked in the app wins over the device language. */
export async function restoreLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored) && stored !== i18n.language) await i18n.changeLanguage(stored);
  } catch {
    // Storage unavailable (private browsing): stay with the device language.
  }
}

export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(STORAGE_KEY, language).catch(() => undefined);
}

/** BCP 47 tag for Intl number and date formatting. */
export function formatLocale(): string {
  return { de: 'de-DE', en: 'en-GB', ru: 'ru-RU' }[i18n.language as Language] ?? 'de-DE';
}

export default i18n;
