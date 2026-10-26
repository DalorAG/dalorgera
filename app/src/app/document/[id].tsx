import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StateView } from '@/components/state-view';
import { ZoomableImage } from '@/components/zoomable-image';
import { useGetDocumentUrlQuery } from '@/store/api';
import { spacing } from '@/theme';

/** Full-screen photo of a Beleg; pinch or double-tap to zoom. */
export default function DocumentViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useGetDocumentUrlQuery(id);

  return (
    <GestureHandlerRootView style={styles.screen}>
      {error ? (
        <StateView kind="error" error={error} onRetry={refetch} />
      ) : isLoading || !data ? (
        <ActivityIndicator color="#fff" style={styles.flex} />
      ) : (
        <ZoomableImage uri={data.url} />
      )}
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        accessibilityLabel={t('actions.close')}
        hitSlop={12}
        style={[styles.close, { top: insets.top + spacing.md }]}>
        <Ionicons name="close" size={24} color="#fff" />
      </Pressable>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  close: {
    position: 'absolute',
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
