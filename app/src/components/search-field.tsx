import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { PhotoQuery } from '@/features/use-photo-search';
import type { PhotoSource } from '@/features/use-product-photo';
import { radius, spacing, typography, useTheme } from '@/theme';

import { Text } from './text';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  /** Shows a barcode button, e.g. to find a device by its EAN. */
  onScan?: () => void;
  /** Shows a camera button for Suche per Foto. */
  onPhoto?: (source: PhotoSource) => void;
  photoBusy?: boolean;
  /** The active photo search, shown below the field instead of the typed text. */
  photoQuery?: PhotoQuery | null;
  onClearPhoto?: () => void;
};

export function SearchField({ value, onChangeText, placeholder, onScan, onPhoto, photoBusy, photoQuery, onClearPhoto }: Props) {
  const theme = useTheme();
  const { t } = useTranslation(['components', 'common']);

  const pickPhoto = () => {
    if (!onPhoto) return;
    // The browser file dialog offers the camera itself where there is one.
    if (Platform.OS === 'web') return onPhoto('library');
    Alert.alert(t('search.photoTitle'), t('search.photoHint'), [
      { text: t('common:actions.takePhoto'), onPress: () => onPhoto('camera') },
      { text: t('common:actions.fromLibrary'), onPress: () => onPhoto('library') },
      { text: t('common:actions.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.column}>
      <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
        <Ionicons name="search" size={18} color={theme.textTertiary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel={placeholder}
          style={[typography.body, styles.input, { color: theme.text }]}
        />
        {value && Platform.OS === 'android' ? (
          <Ionicons name="close-circle" size={18} color={theme.textTertiary} onPress={() => onChangeText('')} />
        ) : null}
        {onScan ? (
          <Pressable onPress={onScan} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('search.scan')}>
            <Ionicons name="barcode-outline" size={22} color={theme.brandIcon} />
          </Pressable>
        ) : null}
        {onPhoto ? (
          photoBusy ? (
            <ActivityIndicator color={theme.brand} />
          ) : (
            <Pressable onPress={pickPhoto} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('search.photo')}>
              <Ionicons name="camera-outline" size={22} color={theme.brandIcon} />
            </Pressable>
          )
        ) : null}
      </View>
      {photoBusy ? (
        <Text variant="caption" color="textSecondary">
          {t('search.photoSearching')}
        </Text>
      ) : photoQuery ? (
        <View style={[styles.photoQuery, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}>
          <Ionicons name="camera" size={14} color={theme.brand} />
          <Text variant="captionStrong" color="brand" numberOfLines={1} style={styles.flex}>
            {t('search.photoQuery', { label: photoQuery.label })}
          </Text>
          <Pressable onPress={onClearPhoto} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('search.photoClear')}>
            <Ionicons name="close" size={16} color={theme.brand} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { gap: spacing.sm },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  input: { flex: 1, paddingVertical: spacing.sm },
  photoQuery: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
