/**
 * Raw design tokens – the palette.
 *
 * Never use these in components directly. Components consume the semantic
 * tokens from `colors` (see `colors.ts`) through the `useTheme()` hook.
 */
export const palette = {
  white: '#FFFFFF',
  black: '#000000',

  // Brand – deep teal
  teal50: '#EAF2F1',
  teal100: '#CFE1DF',
  teal300: '#6E9C98',
  teal500: '#2A6662',
  teal700: '#1B4B4A',
  teal800: '#143B3A',
  teal900: '#0C2726',

  // Success – green
  green50: '#EAF6EE',
  green100: '#D3EEDC',
  green400: '#4CBB72',
  green500: '#2EA35A',
  green600: '#238A4A',

  // Warning – amber
  amber50: '#FEF5E4',
  amber100: '#FCE7BD',
  amber400: '#F8B63A',
  amber500: '#F29F12',
  amber600: '#C97F06',

  // Danger – red
  red50: '#FDECEC',
  red500: '#E04646',
  red600: '#BF3030',

  // Neutrals
  gray25: '#FAFBFB',
  gray50: '#F4F6F6',
  gray100: '#E9EDED',
  gray200: '#DCE2E2',
  gray300: '#C3CBCB',
  gray400: '#97A2A2',
  gray500: '#6B7676',
  gray600: '#4F5959',
  gray700: '#363E3E',
  gray800: '#212727',
  gray850: '#181D1D',
  gray900: '#0F1313',
  gray950: '#080A0A',
} as const;

export type PaletteColor = keyof typeof palette;
