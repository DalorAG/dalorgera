import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import type { DocumentItem } from '@/lib/api-types';
import { useGetDocumentUrlQuery } from '@/store/api';
import { radius, useTheme } from '@/theme';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  size?: number;
  /** Attached photo shown instead of the icon (icon stays while it loads or if it is not an image). */
  photo?: DocumentItem;
};

/** Photos the preview can render (HEIC is converted to JPEG on upload, older uploads fall back to the icon). */
export function isPreviewable(document: DocumentItem): boolean {
  return document.mimeType.startsWith('image/') && document.mimeType !== 'image/heic';
}

export function DeviceThumb({ icon, size = 72, photo }: Props) {
  const theme = useTheme();
  const { data } = useGetDocumentUrlQuery(photo?.id ?? '', { skip: !photo || !isPreviewable(photo) });

  return (
    <View style={[styles.thumb, { width: size, height: size, backgroundColor: theme.surfaceMuted }]}>
      {data ? (
        <Image source={{ uri: data.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Ionicons name={icon} size={size * 0.48} color={theme.text} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
