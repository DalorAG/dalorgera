import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { radius, useTheme } from '@/theme';

import { Text } from './text';

type RingProps = { progress: number; color: string; size?: number; stroke?: number };

export function ProgressRing({ progress, color, size = 72, stroke = 8 }: RingProps) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Text variant="captionStrong">{Math.round(progress * 100)}%</Text>
        </View>
      </View>
    </View>
  );
}

type BarProps = { progress: number; color: string; height?: number };

export function ProgressBar({ progress, color, height = 6 }: BarProps) {
  const theme = useTheme();
  return (
    <View style={[styles.track, { height, backgroundColor: theme.track }]}>
      <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  track: { borderRadius: radius.pill, overflow: 'hidden', width: '100%' },
  fill: { height: '100%', borderRadius: radius.pill },
});
