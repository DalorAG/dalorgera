import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { DocumentThumb } from '@/components/document-thumb';
import { Text } from '@/components/text';
import { shareDocumentAsPdf } from '@/features/export-pdf';
import { useHiddenAmounts } from '@/features/use-hidden-amounts';
import i18n from '@/i18n';
import type { Device, DocumentItem, LuxuryItem } from '@/lib/api-types';
import { DOCUMENT_KIND_LABELS } from '@/lib/device-ui';
import { apiErrorMessage, formatDate, formatPrice } from '@/lib/format';
import { itemTitle } from '@/lib/luxury';
import { useAppDispatch } from '@/store';
import { api, useDeleteDocumentMutation } from '@/store/api';
import { scanCompleted } from '@/store/scan-slice';
import { spacing, useTheme } from '@/theme';

type Props = { documents: DocumentItem[]; devices: Device[]; luxuryItems?: LuxuryItem[] };

function confirmDelete(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: i18n.t('common:actions.cancel'), style: 'cancel' },
    { text: i18n.t('common:actions.delete'), style: 'destructive', onPress: onConfirm },
  ]);
}

/** Assigned documents open their detail page, unassigned photos start a new device. */
export function useOpenDocument() {
  const dispatch = useAppDispatch();
  return (doc: DocumentItem) => {
    if (doc.luxuryItemId) return router.push({ pathname: '/luxury/[id]', params: { id: doc.luxuryItemId } });
    if (doc.deviceId) return router.push(`/receipt/${doc.id}`);
    dispatch(scanCompleted({ documentId: doc.id, kind: doc.kind, extraction: doc.extracted }));
    router.push('/device/new');
  };
}

export function DocumentsList({ documents, devices, luxuryItems = [] }: Props) {
  const theme = useTheme();
  const { t } = useTranslation(['inbox', 'common']);
  const dispatch = useAppDispatch();
  const deviceNames = new Map(devices.map((d) => [d.id, d.name]));
  const itemNames = new Map(luxuryItems.map((i) => [i.id, itemTitle(i)]));
  const owner = (doc: DocumentItem) =>
    doc.luxuryItemId
      ? (itemNames.get(doc.luxuryItemId) ?? t('documents.valuable'))
      : doc.deviceId
        ? (deviceNames.get(doc.deviceId) ?? t('documents.device'))
        : null;
  const [busyId, setBusyId] = useState<string | null>(null);
  const open = useOpenDocument();
  // Totals follow the eye in the Tresor, where this list is shown.
  const { mask } = useHiddenAmounts();
  const [deleteDocument] = useDeleteDocumentMutation();

  const exportPdf = async (doc: DocumentItem) => {
    setBusyId(doc.id);
    try {
      const { url } = await dispatch(api.endpoints.getDocumentUrl.initiate(doc.id)).unwrap();
      await shareDocumentAsPdf(doc, url);
    } catch (err) {
      Alert.alert(t('documents.pdfFailed'), apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = (doc: DocumentItem) =>
    confirmDelete(
      t('documents.deleteConfirm.title', { kind: DOCUMENT_KIND_LABELS[doc.kind] }),
      owner(doc)
        ? t(doc.luxuryItemId ? 'documents.deleteConfirm.fromValuable' : 'documents.deleteConfirm.fromDevice', { owner: owner(doc) })
        : t('documents.deleteConfirm.permanent'),
      async () => {
        setBusyId(doc.id);
        try {
          await deleteDocument(doc.id).unwrap();
        } catch (err) {
          Alert.alert(t('documents.deleteFailed'), apiErrorMessage(err));
        } finally {
          setBusyId(null);
        }
      },
    );

  return (
    <View style={styles.list}>
      {documents.map((doc) => (
        <Card key={doc.id} onPress={() => open(doc)} style={styles.row}>
          <DocumentThumb document={doc} size={52} />
          <View style={styles.flex}>
            <Text variant="headline">{DOCUMENT_KIND_LABELS[doc.kind]}</Text>
            <Text variant="caption" color="textSecondary">
              {[
                doc.extracted?.merchant,
                doc.extracted?.totalCents != null
                  ? mask(formatPrice(doc.extracted.totalCents, doc.extracted.currency ?? 'EUR'))
                  : null,
              ]
                .filter(Boolean)
                .join(' · ') || t('documents.uploadedAt', { date: formatDate(doc.createdAt) })}
            </Text>
            <Text variant="captionStrong" color={owner(doc) ? 'textSecondary' : 'warningText'} numberOfLines={1}>
              {owner(doc)
                ? t(doc.luxuryItemId ? 'documents.savedInTresor' : 'documents.savedInGawa', { name: owner(doc) })
                : t('documents.draft')}
            </Text>
          </View>
          {busyId === doc.id ? (
            <ActivityIndicator color={theme.brand} />
          ) : (
            <View style={styles.actions}>
              <Action icon="download-outline" label={t('common:actions.downloadPdf')} onPress={() => exportPdf(doc)} />
              <Action icon="trash-outline" label={t('documents.delete')} onPress={() => remove(doc)} danger />
            </View>
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
  actions: { flexDirection: 'row', gap: spacing.xxs },
  action: { padding: spacing.xs },
});
