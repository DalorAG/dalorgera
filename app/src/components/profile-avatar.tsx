import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useAvatar } from '@/features/use-avatar';
import type { PhotoSource } from '@/features/use-product-photo';
import { apiErrorMessage } from '@/lib/format';
import { radius, useTheme } from '@/theme';

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

/** Profilfoto; tapping it takes, picks or removes the photo right there. */
export function ProfileAvatar({ size = 56 }: { size?: number }) {
  const theme = useTheme();
  const { t } = useTranslation(['account', 'common']);
  const { url, hasPhoto, saving, choose, remove } = useAvatar();

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (err) {
      notify(t('profile.photo.failed'), apiErrorMessage(err));
    }
  };
  const pick = (source: PhotoSource) => run(() => choose(source));

  const open = () => {
    // The browser file dialog offers the camera itself where there is one.
    if (Platform.OS === 'web') return pick('library');
    Alert.alert(t('profile.photo.title'), undefined, [
      { text: t('common:actions.takePhoto'), onPress: () => pick('camera') },
      { text: t('common:actions.fromLibrary'), onPress: () => pick('library') },
      ...(hasPhoto ? [{ text: t('common:actions.remove'), style: 'destructive' as const, onPress: () => run(remove) }] : []),
      { text: t('common:actions.cancel'), style: 'cancel' as const },
    ]);
  };

  return (
    <Pressable
      onPress={open}
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel={hasPhoto ? t('profile.photo.change') : t('profile.photo.add')}
      style={{ width: size, height: size }}>
      <View style={[styles.circle, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}>
        {url ? (
          <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <Ionicons name="person" size={size * 0.5} color={theme.brand} />
        )}
        {saving ? (
          <View style={[StyleSheet.absoluteFill, styles.busy]}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>
      <View style={[styles.badge, { backgroundColor: theme.brand, borderColor: theme.background }]}>
        <Ionicons name="camera" size={12} color={theme.textOnBrand} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busy: { backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
