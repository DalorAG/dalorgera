import { Image } from 'expo-image';
import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

/** Image with pinch-to-zoom, pan while zoomed and double-tap to toggle zoom. */
export function ZoomableImage({ uri }: { uri: string }) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedFocal = useSharedValue({ x: 0, y: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  // Keeps the zoomed image covering the viewport instead of sliding off screen.
  const clamp = (value: number, s: number, length: number) => {
    'worklet';
    const max = ((s - 1) * length) / 2;
    return Math.min(max, Math.max(-max, value));
  };

  const settle = (s: number) => {
    'worklet';
    const target = Math.min(MAX_SCALE, Math.max(1, s));
    scale.value = withTiming(target);
    savedScale.value = target;
    const tx = clamp(x.value, target, size.width);
    const ty = clamp(y.value, target, size.height);
    x.value = withTiming(tx);
    y.value = withTiming(ty);
    savedX.value = tx;
    savedY.value = ty;
  };

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      savedScale.value = scale.value;
      savedX.value = x.value;
      savedY.value = y.value;
      // Focal point relative to the centre, so the spot under the fingers stays put.
      savedFocal.value = { x: e.focalX - size.width / 2, y: e.focalY - size.height / 2 };
    })
    .onUpdate((e) => {
      const next = Math.min(MAX_SCALE * 1.2, Math.max(0.8, savedScale.value * e.scale));
      const ratio = next / savedScale.value;
      scale.value = next;
      x.value = savedFocal.value.x - (savedFocal.value.x - savedX.value) * ratio;
      y.value = savedFocal.value.y - (savedFocal.value.y - savedY.value) * ratio;
    })
    .onEnd(() => settle(scale.value));

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    })
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      x.value = clamp(savedX.value + e.translationX, scale.value, size.width);
      y.value = clamp(savedY.value + e.translationY, scale.value, size.height);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.value > 1) {
        x.value = 0;
        y.value = 0;
        settle(1);
        return;
      }
      // Zoom towards the tapped spot.
      x.value = -(e.x - size.width / 2) * (DOUBLE_TAP_SCALE - 1);
      y.value = -(e.y - size.height / 2) * (DOUBLE_TAP_SCALE - 1);
      settle(DOUBLE_TAP_SCALE);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <View style={styles.flex} onLayout={onLayout} collapsable={false}>
        <Animated.View style={[styles.flex, style]}>
          <Image source={{ uri }} style={styles.flex} contentFit="contain" transition={150} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
