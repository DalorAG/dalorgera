import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { Device } from '@/data/devices';
import { radius, useTheme } from '@/theme';

export function DeviceThumb({ icon, size = 72 }: { icon: Device['icon']; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.thumb,
        { width: size, height: size, backgroundColor: theme.surfaceMuted },
      ]}>
      <Ionicons name={icon} size={size * 0.48} color={theme.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
