import { Text as RNText, type TextProps } from 'react-native';

import { typography, useTheme, type ThemeColor, type TypographyVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: ThemeColor;
};

export function Text({ variant = 'body', color = 'text', style, ...rest }: Props) {
  const theme = useTheme();
  return <RNText style={[typography[variant], { color: theme[color] }, style]} {...rest} />;
}
