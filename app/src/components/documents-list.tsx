import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { DocumentThumb } from '@/components/document-thumb';
import { Text } from '@/components/text';
import { shareDocumentAsPdf } from '@/features/export-pdf';
import type { Device, DocumentItem } from '@/lib/api-types';
import { DOCUMENT_KIND_LABELS } from '@/lib/device-ui';
import { apiErrorMessage, formatDate, formatPrice } from '@/lib/format';
import { useAppDispatch } from '@/store';
import { api } from '@/store/api';
import { scanCompleted } from '@/store/scan-slice';
import { spacing, useTheme } from '@/theme';

type Props = { documents: DocumentItem[]; devices: Device[] };

/** Assigned documents open their detail page, unassigned photos start a new device. */
export function useOpenDocument() {
  const dispatch = useAppDispatch();
  return (doc: DocumentItem) => {
    if (doc.deviceId) return router.push(`/receipt/${doc.id}`);
    dispatch(scanCompleted({ documentId: doc.id, kind: doc.kind, extraction: doc.extracted }));
    router.push('/device/new');
  };
}

export function DocumentsList({ documents, devices }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const deviceNames = new Map(devices.map((d) => [d.id, d.name]));
  const [busyId, setBusyId] = useState<string | null>(null);
  const open = useOpenDocument();

  const exportPdf = async (doc: DocumentItem) => {
    setBusyId(doc.id);
    try {
      const { url } = await dispatch(api.endpoints.getDocumentUrl.initiate(doc.id)).unwrap();
      await shareDocumentAsPdf(doc, url);
    } catch (err) {
      Alert.alert('PDF konnte nicht erstellt werden', apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
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
          {busyId === doc.id ? (
            <ActivityIndicator color={theme.brand} />
          ) : (
            <Action icon="download-outline" label="Als PDF herunterladen" onPress={() => exportPdf(doc)} />
          )}
        </Card>
      ))}
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={styles.action}>
      <Ionicons name={icon} size={22} color={danger ? theme.danger : theme.brandIcon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xxs },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  action: { padding: spacing.xs },
});
