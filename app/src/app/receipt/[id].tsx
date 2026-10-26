import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { VaultRow } from '@/components/devices/vault-row';
import { DocumentThumb } from '@/components/document-thumb';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { openDocument } from '@/features/open-document';
import { DOCUMENT_KIND_LABELS } from '@/lib/device-ui';
import { apiErrorMessage, formatDate, formatPrice } from '@/lib/format';
import { useAppDispatch } from '@/store';
import { useGetDevicesQuery, useGetDocumentsQuery } from '@/store/api';
import { scanCompleted } from '@/store/scan-slice';
import { spacing, useTheme } from '@/theme';

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t } = useTranslation('overview');
  const dispatch = useAppDispatch();
  // There is no single-document endpoint; the list is usually cached already from the Posteingang tab.
  const { data: documents, isLoading, error, refetch } = useGetDocumentsQuery();
  const { data: devices } = useGetDevicesQuery();
  const doc = documents?.find((d) => d.id === id);
  const device = doc?.deviceId ? devices?.find((d) => d.id === doc.deviceId) : undefined;

  if (isLoading) return <StateView kind="loading" />;
  if (error) return <StateView kind="error" error={error} onRetry={refetch} />;
  if (!doc) {
    return <StateView kind="empty" icon="receipt-outline" title={t('receipt.notFound.title')} message={t('receipt.notFound.message')} />;
  }

  const extracted = doc.extracted;
  const products = extracted?.products ?? [];

  const openPhoto = async () => {
    try {
      await openDocument(doc, dispatch);
    } catch (err) {
      Alert.alert(t('receipt.openFailed'), apiErrorMessage(err));
    }
  };

  const createDevice = () => {
    dispatch(scanCompleted({ documentId: doc.id, kind: doc.kind, extraction: doc.extracted }));
    router.push('/device/new');
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: DOCUMENT_KIND_LABELS[doc.kind] }} />

      <Pressable onPress={openPhoto} accessibilityRole="button" accessibilityLabel={t('receipt.openA11y')} style={styles.photo}>
        <DocumentThumb document={doc} size={180} />
      </Pressable>

      <Card style={styles.rows}>
        {extracted?.merchant ? <Row label={t('receipt.merchant')} value={extracted.merchant} /> : null}
        {extracted?.purchaseDate ? <Row label={t('receipt.purchaseDate')} value={formatDate(extracted.purchaseDate)} /> : null}
        {extracted?.totalCents != null ? (
          <Row label={t('receipt.total')} value={formatPrice(extracted.totalCents, extracted.currency ?? 'EUR')} strong />
        ) : null}
        <Row label={t('receipt.uploadedAt')} value={formatDate(doc.createdAt)} />
      </Card>

      {products.length ? (
        <>
          <Text variant="title">{t('receipt.items')}</Text>
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

      <Text variant="title">{t('receipt.device')}</Text>
      {device ? (
        <VaultRow device={device} />
      ) : (
        <>
          <Text variant="body" color="warningText">
            {t('receipt.unassigned')}
          </Text>
          <Button label={t('receipt.createDevice')} icon="add" onPress={createDevice} />
        </>
      )}

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
