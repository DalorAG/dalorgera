import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, useTheme } from '@/theme';

type Props = { icon: ComponentProps<typeof Ionicons>['name']; size?: number };

export function DeviceThumb({ icon, size = 72 }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.thumb, { width: size, height: size, backgroundColor: theme.surfaceMuted }]}>
      <Ionicons name={icon} size={size * 0.48} color={theme.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
