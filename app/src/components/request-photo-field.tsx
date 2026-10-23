import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { RequestPhoto } from '@/features/use-request-photo';
import { radius, spacing, useTheme } from '@/theme';

import { Button } from './button';
import { Text } from './text';

type Props = {
  label: string;
  hint: string;
  photo: RequestPhoto | null;
  busy: boolean;
  onAdd: (source: 'camera' | 'library') => void;
  onRemove: () => void;
};

/** Camera and gallery buttons, then the attached photo while it uploads and after. */
export function RequestPhotoField({ label, hint, photo, busy, onAdd, onRemove }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <Text variant="captionStrong">{label}</Text>
      {photo || busy ? (
        <View style={[styles.photoRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: theme.surfaceMuted }]}>
              <ActivityIndicator color={theme.brand} />
            </View>
          )}
          <View style={styles.flex}>
            <Text variant="bodyStrong">{busy ? 'Foto wird hochgeladen …' : 'Foto angehängt'}</Text>
            <Text variant="caption" color="textSecondary">
              {busy ? 'Einen Moment, wir lesen den Beleg.' : 'Wird mit der Anfrage an unser Team gesendet.'}
            </Text>
          </View>
          {photo && !busy ? (
            <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel="Foto entfernen">
              <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.photoButtons}>
          <Button label="Foto aufnehmen" icon="camera-outline" onPress={() => onAdd('camera')} style={styles.flex} />
          <Button label="Aus Galerie" variant="secondary" icon="images-outline" onPress={() => onAdd('library')} style={styles.flex} />
        </View>
      )}
      <Text variant="caption" color="textSecondary">
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: spacing.sm },
  photoButtons: { flexDirection: 'row', gap: spacing.md },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  photo: { width: 56, height: 56, borderRadius: radius.sm },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
