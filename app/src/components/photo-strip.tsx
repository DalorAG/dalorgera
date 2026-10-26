import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { PhotoSource } from '@/features/use-product-photo';
import type { RequestPhoto } from '@/features/use-request-photo';
import { radius, spacing, useTheme } from '@/theme';

import { Button } from './button';
import { Text } from './text';

type Props = {
  label: string;
  hint: string;
  photos: RequestPhoto[];
  busy: boolean;
  full: boolean;
  onAdd: (source: PhotoSource) => void;
  onRemove: (id: string) => void;
};

/** Thumbnails of the attached photos with a remove button each, then camera and gallery buttons. */
export function PhotoStrip({ label, hint, photos, busy, full, onAdd, onRemove }: Props) {
  const theme = useTheme();
  const { t } = useTranslation(['components', 'common']);
  return (
    <View style={styles.group}>
      <Text variant="captionStrong">{label}</Text>
      {photos.length || busy ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {photos.map((p) => (
            <View key={p.id}>
              <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
              <Pressable
                onPress={() => onRemove(p.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('photo.remove')}
                style={[styles.remove, { backgroundColor: theme.surface }]}>
                <Ionicons name="close-circle" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
          ))}
          {busy ? (
            <View style={[styles.thumb, styles.placeholder, { backgroundColor: theme.surfaceMuted }]}>
              <ActivityIndicator color={theme.brand} />
            </View>
          ) : null}
        </ScrollView>
      ) : null}
      {!full ? (
        <View style={styles.buttons}>
          <Button label={t('common:actions.takePhoto')} icon="camera-outline" onPress={() => onAdd('camera')} disabled={busy} style={styles.flex} />
          <Button
            label={t('common:actions.fromLibrary')}
            variant="secondary"
            icon="images-outline"
            onPress={() => onAdd('library')}
            disabled={busy}
            style={styles.flex}
          />
        </View>
      ) : null}
      <Text variant="caption" color="textSecondary">
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: spacing.sm },
  strip: { gap: spacing.md, paddingTop: spacing.sm, paddingRight: spacing.sm },
  thumb: { width: 88, height: 88, borderRadius: radius.md },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  remove: { position: 'absolute', top: -spacing.sm, right: -spacing.sm, borderRadius: radius.pill },
  buttons: { flexDirection: 'row', gap: spacing.md },
});
