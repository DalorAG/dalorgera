/**
 * Theme entry point.
 *
 * - `palette.ts`  raw design tokens (never used in components directly)
 * - `colors.ts`   semantic colors for light/dark + scanner colors
 * - `styles.ts`   spacing, radius, typography, shadow
 *
 * Components import everything from `@/theme`.
 */
import { useColorScheme } from 'react-native';

import { colors, type ColorScheme, type ThemeColors } from './colors';

export * from './colors';
export * from './palette';
export * from './styles';

/**
 * Pin the app to one scheme. Set to `null` to follow the system setting.
 */
export const FORCED_SCHEME: ColorScheme | null = 'light';

export function useScheme(): ColorScheme {
  const system = useColorScheme();
  return FORCED_SCHEME ?? (system === 'dark' ? 'dark' : 'light');
}

export function useTheme(): ThemeColors {
  return colors[useScheme()];
}
