/**
 * Color tokens.
 *
 * `palette` holds raw values and should never be used in components directly.
 * Components consume the semantic tokens from `colors.light` / `colors.dark`
 * through the `useTheme()` hook.
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

export const colors = {
  light: {
    // Surfaces
    background: palette.gray25,
    surface: palette.white,
    surfaceMuted: palette.gray50,
    surfaceBrand: palette.green50,
    border: palette.gray100,
    borderStrong: palette.gray200,

    // Text
    text: palette.gray900,
    textSecondary: palette.gray500,
    textTertiary: palette.gray400,
    textOnBrand: palette.white,

    // Brand
    brand: palette.teal700,
    brandPressed: palette.teal800,
    brandSoft: palette.teal50,
    brandIcon: palette.teal500,

    // Status
    success: palette.green500,
    successText: palette.green600,
    successSoft: palette.green50,
    successSoftBorder: palette.green100,
    warning: palette.amber500,
    warningText: palette.amber600,
    warningSoft: palette.amber50,
    warningSoftBorder: palette.amber100,
    danger: palette.red500,
    dangerSoft: palette.red50,

    // Components
    track: palette.gray100,
    tabBar: palette.white,
    tabActive: palette.gray900,
    tabInactive: palette.gray500,
    shadow: palette.teal900,
  },
  dark: {
    background: palette.gray950,
    surface: palette.gray900,
    surfaceMuted: palette.gray850,
    surfaceBrand: '#12261B',
    border: palette.gray800,
    borderStrong: palette.gray700,

    text: palette.gray50,
    textSecondary: palette.gray400,
    textTertiary: palette.gray500,
    textOnBrand: palette.white,

    brand: palette.teal500,
    brandPressed: palette.teal700,
    brandSoft: '#132A29',
    brandIcon: palette.teal300,

    success: palette.green400,
    successText: palette.green400,
    successSoft: '#12261B',
    successSoftBorder: '#1C3B28',
    warning: palette.amber400,
    warningText: palette.amber400,
    warningSoft: '#2B210D',
    warningSoftBorder: '#3F3012',
    danger: palette.red500,
    dangerSoft: '#2C1414',

    track: palette.gray800,
    tabBar: palette.gray900,
    tabActive: palette.gray50,
    tabInactive: palette.gray500,
    shadow: palette.black,
  },
} as const;

/** Fixed tokens for the camera screen – always dark, independent of scheme. */
export const scannerColors = {
  backdrop: '#2B1E14',
  backdropWood: '#3D2B1E',
  overlay: 'rgba(0,0,0,0.35)',
  control: 'rgba(20,20,20,0.55)',
  frame: palette.white,
  text: palette.white,
  textMuted: 'rgba(255,255,255,0.8)',
  paper: '#F7F5F0',
  ink: '#1E1E1E',
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = { [K in keyof typeof colors.light]: string };
export type ThemeColor = keyof ThemeColors;
