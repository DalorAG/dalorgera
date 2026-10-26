import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { MarketValueCard } from '@/components/market-value-card';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { shareDocumentAsPdf } from '@/features/export-pdf';
import i18n from '@/i18n';
import type { PhotoSource } from '@/features/use-product-photo';
import { pickImages, useUploadPhoto } from '@/features/use-request-photo';
import type { DocumentKind, LuxuryDocument } from '@/lib/api-types';
import { apiErrorMessage, formatDate, formatPrice } from '@/lib/format';
import { LUXURY_CATEGORIES, REQUEST_STATUS_LABELS, itemTitle } from '@/lib/luxury';
import { useAppDispatch } from '@/store';
import {
  api,
  useDeleteLuxuryItemMutation,
  useGetDocumentUrlQuery,
  useGetLuxuryItemQuery,
  useGetMeQuery,
  useRequestLuxuryInsuranceMutation,
  useUpdateLuxuryItemMutation,
} from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

const MAX_PHOTOS = 10;

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

function confirm(title: string, message: string, action: string, destructive: boolean, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: i18n.t('common:actions.cancel'), style: 'cancel' },
    { text: action, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/** Camera or gallery; the web has no camera picker, it goes straight to the file dialog. */
function chooseSource(title: string, onPick: (source: PhotoSource) => void) {
  if (Platform.OS === 'web') return onPick('library');
  Alert.alert(title, undefined, [
    { text: i18n.t('common:actions.takePhoto'), onPress: () => onPick('camera') },
    { text: i18n.t('common:actions.fromLibrary'), onPress: () => onPick('library') },
    { text: i18n.t('common:actions.cancel'), style: 'cancel' },
  ]);
}

export default function LuxuryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t } = useTranslation(['tresor', 'common']);
  const dispatch = useAppDispatch();
  const { data: item, isLoading, error, refetch } = useGetLuxuryItemQuery(id);
  const { data: me } = useGetMeQuery();
  const [requestInsurance, { isLoading: requesting }] = useRequestLuxuryInsuranceMutation();
  const [deleteItem, { isLoading: deleting }] = useDeleteLuxuryItemMutation();
  const [updateItem] = useUpdateLuxuryItemMutation();
  const uploadPhoto = useUploadPhoto('product_photo');
  const uploadInvoice = useUploadPhoto('invoice');
  const [adding, setAdding] = useState<DocumentKind | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  if (isLoading) return <StateView kind="loading" />;
  if (error || !item) return <StateView kind="error" error={error} onRetry={refetch} />;

  const title = itemTitle(item);
  const category = LUXURY_CATEGORIES.find((c) => c.value === item.category);
  // A closed request may be followed by a new one, e.g. after the item's value changed.
  const openRequest = item.request && item.request.status !== 'closed' ? item.request : null;
  const canBeReached = !!me?.email;

  /** Uploads straight onto the item, no form in between. */
  const add = (kind: 'product_photo' | 'invoice') =>
    chooseSource(kind === 'invoice' ? t('detail.addInvoice') : t('detail.addPhoto'), async (source) => {
      const limit = kind === 'invoice' ? 1 : MAX_PHOTOS - item.photos.length;
      const assets = await pickImages(source, limit);
      if (!assets.length) return;
      setAdding(kind);
      try {
        const upload = kind === 'invoice' ? uploadInvoice : uploadPhoto;
        const documentIds = [];
        for (const asset of assets) documentIds.push((await upload(asset)).id);
        await updateItem({ id: item.id, documentIds }).unwrap();
      } catch (err) {
        notify(t('detail.uploadFailed'), apiErrorMessage(err));
      } finally {
        setAdding(null);
      }
    });

  const exportPdf = async (doc: LuxuryDocument) => {
    setExportingId(doc.id);
    try {
      const { url } = await dispatch(api.endpoints.getDocumentUrl.initiate(doc.id)).unwrap();
      await shareDocumentAsPdf(doc, url);
    } catch (err) {
      notify(t('detail.pdfFailed'), apiErrorMessage(err));
    } finally {
      setExportingId(null);
    }
  };

  const askForInsurance = () =>
    confirm(
      t('detail.insuranceConfirm.title'),
      t('detail.insuranceConfirm.message', { title, email: me?.email }),
      t('detail.insuranceConfirm.action'),
      false,
      async () => {
        try {
          await requestInsurance({ id: item.id }).unwrap();
        } catch (err) {
          notify(t('detail.requestFailed'), apiErrorMessage(err));
        }
      },
    );

  const remove = () =>
    confirm(
      t('detail.deleteConfirm.title'),
      t('detail.deleteConfirm.message', { title }),
      t('common:actions.delete'),
      true,
      async () => {
        try {
          await deleteItem(item.id).unwrap();
          router.back();
        } catch (err) {
          notify(t('detail.deleteFailed'), apiErrorMessage(err));
        }
      },
    );

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/luxury-request', params: { id: item.id } })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common:actions.edit')}
              style={({ pressed }) => [
                styles.editButton,
                { backgroundColor: pressed ? theme.brandSoft : theme.surface, borderColor: theme.brand },
              ]}>
              <Ionicons name="pencil" size={14} color={theme.brand} />
              <Text variant="captionStrong" color="brand">
                {t('common:actions.edit')}
              </Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.header}>
        <Ionicons name={category?.icon ?? 'diamond-outline'} size={28} color={theme.brand} />
        <View style={styles.flex}>
          <Text variant="caption" color="textSecondary">
            {category?.label} · {item.brand}
          </Text>
          <Text variant="display">{item.model}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
        {item.photos.map((p) => (
          <Photo key={p.id} id={p.id} />
        ))}
        {item.photos.length < MAX_PHOTOS ? (
          <Pressable
            onPress={() => add('product_photo')}
            disabled={adding !== null}
            accessibilityRole="button"
            accessibilityLabel={t('detail.addPhoto')}
            style={({ pressed }) => [
              styles.photo,
              styles.addPhoto,
              { borderColor: theme.brand, backgroundColor: pressed ? theme.brandSoft : theme.surface },
            ]}>
            {adding === 'product_photo' ? (
              <ActivityIndicator color={theme.brand} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={28} color={theme.brand} />
                <Text variant="captionStrong" color="brand">
                  {t('detail.addPhoto')}
                </Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>

      <MarketValueCard item={item} />

      <View style={styles.group}>
        <Text variant="title">{t('detail.invoice')}</Text>
        {item.invoices.map((doc) => (
          <Card key={doc.id} style={styles.invoice}>
            <Pressable
              onPress={() => router.push({ pathname: '/document/[id]', params: { id: doc.id } })}
              accessibilityRole="button"
              accessibilityLabel={t('detail.openInvoice')}
              style={styles.invoiceOpen}>
              <Ionicons name="document-text-outline" size={26} color={theme.brandIcon} />
              <View style={styles.flex}>
                <Text variant="bodyStrong">{t('detail.invoice')}</Text>
                <Text variant="caption" color="textSecondary">
                  {t('detail.uploadedOn', { date: formatDate(doc.createdAt) })}
                </Text>
              </View>
            </Pressable>
            <Button
              label={t('common:actions.downloadPdf')}
              variant="secondary"
              icon="download-outline"
              onPress={() => exportPdf(doc)}
              loading={exportingId === doc.id}
            />
          </Card>
        ))}
        <Button
          label={item.invoices.length ? t('detail.addAnotherInvoice') : t('detail.addInvoice')}
          variant={item.invoices.length ? 'secondary' : 'primary'}
          icon="receipt-outline"
          onPress={() => add('invoice')}
          loading={adding === 'invoice'}
          disabled={adding !== null}
        />
      </View>

      <View style={styles.group}>
        <Text variant="title">{t('detail.details')}</Text>
        <Card style={styles.rows}>
          <Row label={t('detail.purchasePrice')} value={item.purchasePriceCents != null ? formatPrice(item.purchasePriceCents, item.currency) : '–'} />
          <Row label={t('detail.purchaseDate')} value={formatDate(item.purchaseDate)} />
          <Row label={t('detail.store')} value={item.store ?? '–'} />
          <Row label={t('detail.referenceNumber')} value={item.referenceNumber ?? '–'} />
          <Row label={t('detail.serialNumber')} value={item.serialNumber ?? '–'} />
          <Row label={t('detail.boxPapers')} value={item.hasBoxPapers ? t('detail.present') : t('detail.no')} />
          <Row label={t('detail.inVaultSince')} value={formatDate(item.createdAt)} />
          {item.notes ? (
            <View style={styles.notes}>
              <Text variant="caption" color="textSecondary">
                {t('detail.notes')}
              </Text>
              <Text variant="body">{item.notes}</Text>
            </View>
          ) : null}
        </Card>
      </View>

      {openRequest ? (
        <Card style={styles.request}>
          <Ionicons name="shield-checkmark" size={28} color={theme.success} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">{t('detail.insuranceRequested')}</Text>
            <Text variant="caption" color="textSecondary">
              {t('detail.requestStatus', {
                status: REQUEST_STATUS_LABELS[openRequest.status],
                date: formatDate(openRequest.createdAt),
              })}
            </Text>
          </View>
        </Card>
      ) : (
        <View style={styles.group}>
          <Button
            label={t('detail.requestInsurance')}
            icon="shield-checkmark"
            onPress={askForInsurance}
            loading={requesting}
            disabled={!canBeReached}
          />
          <Text variant="caption" color={canBeReached ? 'textSecondary' : 'warningText'}>
            {canBeReached
              ? t('detail.insuranceHint')
              : t('detail.signInHint')}
          </Text>
        </View>
      )}

      <Button label={t('detail.delete')} variant="danger" icon="trash-outline" onPress={remove} loading={deleting} />
    </ScrollView>
  );
}

/** Thumbnail through a short-lived signed URL; opens the full-screen viewer. */
function Photo({ id }: { id: string }) {
  const theme = useTheme();
  const { t } = useTranslation(['tresor', 'common']);
  const { data } = useGetDocumentUrlQuery(id);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/document/[id]', params: { id } })}
      accessibilityRole="button"
      accessibilityLabel={t('detail.openPhoto')}
      style={[styles.photo, { backgroundColor: theme.surfaceMuted }]}>
      {data ? (
        <Image source={{ uri: data.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <ActivityIndicator color={theme.brand} />
      )}
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="body" numberOfLines={1} style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  // Native headers inset headerRight themselves, the web header does not.
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: Platform.OS === 'web' ? spacing.lg : 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photos: { gap: spacing.md },
  photo: {
    width: 140,
    height: 180,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: { borderWidth: 1, borderStyle: 'dashed', gap: spacing.xs },
  group: { gap: spacing.sm },
  invoice: { gap: spacing.md },
  invoiceOpen: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rows: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowValue: { flexShrink: 1 },
  notes: { gap: spacing.xxs },
  request: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
