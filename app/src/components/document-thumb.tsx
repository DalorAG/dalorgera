import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { DocumentItem } from '@/lib/api-types';
import { useGetDocumentUrlQuery } from '@/store/api';
import { radius, useTheme } from '@/theme';

/** Photo preview loaded through a short-lived signed URL. */
export function DocumentThumb({ document, size = 72 }: { document: DocumentItem; size?: number }) {
  const theme = useTheme();
  const isImage = document.mimeType.startsWith('image/') && document.mimeType !== 'image/heic';
  const { data } = useGetDocumentUrlQuery(document.id, { skip: !isImage });

  return (
    <View style={[styles.thumb, { width: size, height: size * 1.3, backgroundColor: theme.surfaceMuted }]}>
      {isImage && data ? (
        <Image source={{ uri: data.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Ionicons name="document-text-outline" size={size * 0.4} color={theme.textSecondary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
