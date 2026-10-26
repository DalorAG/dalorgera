import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { VaultRow } from '@/components/devices/vault-row';
import { DocumentThumb } from '@/components/document-thumb';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { openDocument } from '@/features/open-document';
import i18n from '@/i18n';
import { DOCUMENT_KIND_LABELS } from '@/lib/device-ui';
import { apiErrorMessage, formatDate, formatPrice } from '@/lib/format';
import { useAppDispatch } from '@/store';
import { useDeleteDocumentMutation, useGetDevicesQuery, useGetDocumentsQuery } from '@/store/api';
import { scanCompleted } from '@/store/scan-slice';
import { spacing, useTheme } from '@/theme';

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t } = useTranslation(['overview', 'inbox', 'common']);
  const dispatch = useAppDispatch();
  // There is no single-document endpoint; the list is usually cached already from the Posteingang tab.
  const { data: documents, isLoading, error, refetch } = useGetDocumentsQuery();
  const { data: devices } = useGetDevicesQuery();
  const doc = documents?.find((d) => d.id === id);
  const device = doc?.deviceId ? devices?.find((d) => d.id === doc.deviceId) : undefined;
  const [deleteDocument, { isLoading: deleting }] = useDeleteDocumentMutation();
  // Keeps the screen from flashing "nicht gefunden" while it closes after a delete.
  const [deleted, setDeleted] = useState(false);

  if (isLoading) return <StateView kind="loading" />;
  if (error) return <StateView kind="error" error={error} onRetry={refetch} />;
  if (deleted) return null;
  if (!doc) {
    return <StateView kind="empty" icon="receipt-outline" title={t('overview:receipt.notFound.title')} message={t('overview:receipt.notFound.message')} />;
  }

  const extracted = doc.extracted;
  const products = extracted?.products ?? [];

  const openPhoto = async () => {
    try {
      await openDocument(doc, dispatch);
    } catch (err) {
      Alert.alert(t('overview:receipt.openFailed'), apiErrorMessage(err));
    }
  };

  const remove = () => {
    const title = t('inbox:documents.deleteConfirm.title', { kind: DOCUMENT_KIND_LABELS[doc.kind] });
    const message = device
      ? t('inbox:documents.deleteConfirm.fromDevice', { owner: device.name })
      : t('inbox:documents.deleteConfirm.permanent');
    const run = async () => {
      try {
        await deleteDocument(doc.id).unwrap();
        setDeleted(true);
        router.back();
      } catch (err) {
        Alert.alert(t('inbox:documents.deleteFailed'), apiErrorMessage(err));
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) run();
      return;
    }
    Alert.alert(title, message, [
      { text: i18n.t('common:actions.cancel'), style: 'cancel' },
      { text: i18n.t('common:actions.delete'), style: 'destructive', onPress: run },
    ]);
  };

  const createDevice = () => {
    dispatch(scanCompleted({ documentId: doc.id, kind: doc.kind, extraction: doc.extracted }));
    router.push('/device/new');
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: DOCUMENT_KIND_LABELS[doc.kind] }} />

      <Pressable onPress={openPhoto} accessibilityRole="button" accessibilityLabel={t('overview:receipt.openA11y')} style={styles.photo}>
        <DocumentThumb document={doc} size={180} />
      </Pressable>

      <Card style={styles.rows}>
        {extracted?.merchant ? <Row label={t('overview:receipt.merchant')} value={extracted.merchant} /> : null}
        {extracted?.purchaseDate ? <Row label={t('overview:receipt.purchaseDate')} value={formatDate(extracted.purchaseDate)} /> : null}
        {extracted?.totalCents != null ? (
          <Row label={t('overview:receipt.total')} value={formatPrice(extracted.totalCents, extracted.currency ?? 'EUR')} strong />
        ) : null}
        <Row label={t('overview:receipt.uploadedAt')} value={formatDate(doc.createdAt)} />
      </Card>

      {products.length ? (
        <>
          <Text variant="title">{t('overview:receipt.items')}</Text>
          <Card style={styles.rows}>
            {products.map((p, i) => (
              <Row
                key={`${p.name}-${i}`}
                label={[p.brand, p.name].filter(Boolean).join(' ')}
                value={p.priceCents != null ? formatPrice(p.priceCents, extracted?.currency ?? 'EUR') : ''}
              />
            ))}
          </Card>
        </>
      ) : null}

      <Text variant="title">{t('overview:receipt.device')}</Text>
      {device ? (
        <VaultRow device={device} />
      ) : (
        <>
          <Text variant="body" color="warningText">
            {t('overview:receipt.unassigned')}
          </Text>
          <Button label={t('overview:receipt.createDevice')} icon="add" onPress={createDevice} />
        </>
      )}

      <Button label={t('inbox:documents.delete')} variant="danger" icon="trash-outline" onPress={remove} loading={deleting} />
    </ScrollView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textSecondary" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant={strong ? 'bodyStrong' : 'body'} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  photo: { alignSelf: 'center' },
  rows: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowLabel: { flexShrink: 1 },
});
