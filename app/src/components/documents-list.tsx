import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { DocumentThumb } from '@/components/document-thumb';
import { Text } from '@/components/text';
import type { Device, DocumentItem } from '@/lib/api-types';
import { DOCUMENT_KIND_LABELS } from '@/lib/device-ui';
import { formatDate, formatPrice } from '@/lib/format';
import { useAppDispatch } from '@/store';
import { scanCompleted } from '@/store/scan-slice';
import { spacing, useTheme } from '@/theme';

type Props = { documents: DocumentItem[]; devices: Device[] };

export function DocumentsList({ documents, devices }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const deviceNames = new Map(devices.map((d) => [d.id, d.name]));

  const open = (doc: DocumentItem) => {
    if (doc.deviceId) return router.push(`/device/${doc.deviceId}`);
    // Unassigned photo: create a device from it.
    dispatch(scanCompleted({ documentId: doc.id, kind: doc.kind, extraction: doc.extracted }));
    router.push('/device/new');
  };

  return (
    <View style={styles.list}>
      {documents.map((doc) => (
        <Card key={doc.id} onPress={() => open(doc)} style={styles.row}>
          <DocumentThumb document={doc} size={52} />
          <View style={styles.flex}>
            <Text variant="headline">{DOCUMENT_KIND_LABELS[doc.kind]}</Text>
            <Text variant="caption" color="textSecondary">
              {[doc.extracted?.merchant, formatPrice(doc.extracted?.totalCents, doc.extracted?.currency ?? 'EUR')]
                .filter(Boolean)
                .join(' · ') || `Hochgeladen am ${formatDate(doc.createdAt)}`}
            </Text>
            <Text variant="caption" color={doc.deviceId ? 'textSecondary' : 'warningText'}>
              {doc.deviceId ? (deviceNames.get(doc.deviceId) ?? 'Gerät') : 'Keinem Gerät zugeordnet'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xxs },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
