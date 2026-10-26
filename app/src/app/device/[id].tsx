import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DeviceThumb } from '@/components/device-thumb';
import { ProgressRing } from '@/components/progress';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { shareDocumentsAsPdf } from '@/features/export-pdf';
import { openDocument } from '@/features/open-document';
import { useProductPhoto, type PhotoSource } from '@/features/use-product-photo';
import i18n from '@/i18n';
import type { DocumentItem } from '@/lib/api-types';
import {
  addMonths,
  badgeLabel,
  claimGuidance,
  extensionDaysLabel,
  extensionWindow,
  hasDeviceCodes,
  DEVICE_KIND_LABELS,
  DOCUMENT_KIND_LABELS,
  iconForDevice,
  isReceipt,
  manufacturerSupportUrl,
  toneForStatus,
} from '@/lib/device-ui';
import { apiErrorMessage, formatDate, formatPrice } from '@/lib/format';
import {
  api,
  useDeleteDeviceMutation,
  useDeleteDocumentMutation,
  useGetDeviceQuery,
  useGetDocumentsQuery,
  useUpdateDeviceMutation,
} from '@/store/api';
import { useAppDispatch } from '@/store';
import { radius, spacing, useTheme } from '@/theme';

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: i18n.t('common:actions.cancel'), style: 'cancel' },
    { text: i18n.t('common:actions.delete'), style: 'destructive', onPress: onConfirm },
  ]);
}

export default function DeviceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t } = useTranslation(['device', 'common', 'inbox']);
  const dispatch = useAppDispatch();
  const { data: device, isLoading, error, refetch } = useGetDeviceQuery(id);
  const { data: documents } = useGetDocumentsQuery({ deviceId: id });
  const [deleteDevice, { isLoading: deleting }] = useDeleteDeviceMutation();
  const [updateDevice, { isLoading: servicing }] = useUpdateDeviceMutation();
  const [downloading, setDownloading] = useState(false);
  const [deleteDocument] = useDeleteDocumentMutation();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const receipts = documents?.filter(isReceipt) ?? [];
  // Newest first, so this is the latest Produktfoto.
  const productPhoto = documents?.find((d) => d.kind === 'product_photo');
  const { choose: chooseProductPhoto, saving: savingPhoto } = useProductPhoto(id, productPhoto);

  if (isLoading) return <StateView kind="loading" />;
  if (error || !device) return <StateView kind="error" error={error} onRetry={refetch} />;

  const tone = toneForStatus(device.status);
  const guidance = device.kind === 'warranty' || device.kind === 'statutory' ? claimGuidance(device) : null;
  const extension = hasDeviceCodes(device.kind) ? extensionWindow(device.purchaseDate) : null;
  const accent = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.danger;

  const openReceipt = async (doc: DocumentItem) => {
    try {
      await openDocument(doc, dispatch);
    } catch (err) {
      notify(t('detail.errors.openReceipt'), apiErrorMessage(err));
    }
  };

  const removeReceipt = (doc: DocumentItem) =>
    confirm(
      t('inbox:documents.deleteConfirm.title', { kind: DOCUMENT_KIND_LABELS[doc.kind] }),
      t('inbox:documents.deleteConfirm.fromDevice', { owner: device.name }),
      async () => {
        setRemovingId(doc.id);
        try {
          await deleteDocument(doc.id).unwrap();
        } catch (err) {
          notify(t('inbox:documents.deleteFailed'), apiErrorMessage(err));
        } finally {
          setRemovingId(null);
        }
      },
    );

  const saveProductPhoto = async (source: PhotoSource) => {
    try {
      await chooseProductPhoto(source);
    } catch (err) {
      notify(t('detail.errors.savePhoto'), apiErrorMessage(err));
    }
  };

  const pickProductPhoto = () => {
    // The browser file dialog offers the camera itself where there is one.
    if (Platform.OS === 'web') return saveProductPhoto('library');
    Alert.alert(t('detail.photo.title'), undefined, [
      { text: t('common:actions.takePhoto'), onPress: () => saveProductPhoto('camera') },
      { text: t('detail.photo.fromLibrary'), onPress: () => saveProductPhoto('library') },
      { text: t('common:actions.cancel'), style: 'cancel' },
    ]);
  };

  const downloadReceipts = async () => {
    setDownloading(true);
    try {
      const files = await Promise.all(
        receipts.map(async (document) => ({
          document,
          url: (await dispatch(api.endpoints.getDocumentUrl.initiate(document.id)).unwrap()).url,
        })),
      );
      await shareDocumentsAsPdf(files, device.name);
    } catch (err) {
      notify(t('detail.errors.createPdf'), apiErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  // Today becomes the last service date; the next one and its reminders follow from the interval.
  const markServiced = async () => {
    try {
      await updateDevice({ id: device.id, purchaseDate: new Date().toISOString().slice(0, 10) }).unwrap();
    } catch (err) {
      Alert.alert(t('detail.errors.saveFailed'), apiErrorMessage(err));
    }
  };

  const remove = () =>
    confirm(t('detail.deleteConfirm.title'), t('detail.deleteConfirm.message'), async () => {
      try {
        await deleteDevice(device.id).unwrap();
        router.back();
      } catch (err) {
        Alert.alert(t('detail.errors.deleteFailed'), apiErrorMessage(err));
      }
    });

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: device.name,
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/device/edit', params: { id: device.id } })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common:actions.edit')}
              style={({ pressed }) => [styles.editButton, { backgroundColor: pressed ? theme.brandSoft : theme.surface, borderColor: theme.brand }]}>
              <Ionicons name="pencil" size={14} color={theme.brand} />
              <Text variant="captionStrong" color="brand">
                {t('common:actions.edit')}
              </Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.header}>
        <Pressable
          onPress={pickProductPhoto}
          disabled={savingPhoto}
          accessibilityRole="button"
          accessibilityLabel={productPhoto ? t('detail.photo.change') : t('detail.photo.add')}>
          <DeviceThumb icon={iconForDevice(device.category, device.name)} size={72} photo={productPhoto} />
          <View style={[styles.photoBadge, { backgroundColor: theme.brand, borderColor: theme.background }]}>
            {savingPhoto ? (
              <ActivityIndicator size="small" color={theme.textOnBrand} />
            ) : (
              <Ionicons name="camera" size={14} color={theme.textOnBrand} />
            )}
          </View>
        </Pressable>
        <View style={styles.flex}>
          <Text variant="title">{device.name}</Text>
          <Text variant="body" color="textSecondary">
            {[DEVICE_KIND_LABELS[device.kind], device.brand, device.category].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <StatusBadge tone={tone} label={badgeLabel(device)} />
      </View>

      <Card style={styles.protection}>
        <ProgressRing progress={device.progress} color={accent} size={84} />
        <View style={[styles.flex, styles.rows]}>
          {device.kind === 'vignette' ? (
            <>
              <Row label={t('detail.rows.validFrom')} value={formatDate(device.purchaseDate)} />
              <Row label={t('detail.rows.validUntil')} value={formatDate(device.protectedUntil)} strong />
            </>
          ) : device.kind === 'maintenance' ? (
            <>
              <Row label={t('detail.rows.lastService')} value={formatDate(device.purchaseDate)} />
              <Row
                label={t('detail.rows.interval')}
                value={t('detail.rows.intervalMonths', { count: device.maintenanceIntervalMonths ?? 0 })}
              />
              <Row label={t('detail.rows.nextService')} value={formatDate(device.protectedUntil)} strong />
            </>
          ) : (
            <>
              {device.kind === 'warranty' ? (
                <Row
                  label={t('detail.rows.warrantyUntil')}
                  value={device.warrantyUntil ? formatDate(device.warrantyUntil) : t('detail.rows.noWarranty')}
                />
              ) : null}
              <Row label={t('detail.rows.burdenOfProofUntil')} value={formatDate(addMonths(device.purchaseDate, 12))} />
              <Row label={t('detail.rows.statutoryUntil')} value={formatDate(device.statutoryUntil)} />
              <Row label={t('detail.rows.protectedUntil')} value={formatDate(device.protectedUntil)} strong />
            </>
          )}
        </View>
      </Card>

      {guidance ? (
        <Card style={styles.guidance}>
          <View style={styles.guidanceHeader}>
            <Ionicons
              name={guidance.contact === 'manufacturer' ? 'business-outline' : guidance.contact === 'store' ? 'storefront-outline' : 'alert-circle-outline'}
              size={22}
              color={theme.brandIcon}
            />
            <Text variant="headline" style={styles.flex}>
              {guidance.title}
            </Text>
          </View>
          <Text variant="body" color="textSecondary">
            {guidance.body}
          </Text>
          <Pressable onPress={() => router.push('/rechte')} accessibilityRole="link" hitSlop={8}>
            <Text variant="captionStrong" color="brand">
              {t('rightsLink')}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {device.kind === 'maintenance' ? (
        <Button label={t('detail.markServiced')} icon="checkmark" onPress={markServiced} loading={servicing} />
      ) : null}

      <Card style={styles.rows}>
        {device.kind === 'warranty' || device.kind === 'statutory' ? <Row label={t('detail.rows.purchaseDate')} value={formatDate(device.purchaseDate)} /> : null}
        {device.store ? <Row label={t('detail.rows.store')} value={device.store} /> : null}
        {device.priceCents != null ? <Row label={t('detail.rows.price')} value={formatPrice(device.priceCents, device.currency)} /> : null}
        {device.serialNumber ? <Row label={t('detail.rows.serialNumber')} value={device.serialNumber} selectable /> : null}
        {device.ean ? <Row label={t('detail.rows.ean')} value={device.ean} selectable /> : null}
        {device.imei ? <Row label={t('detail.rows.imei')} value={device.imei} selectable /> : null}
      </Card>

      {extension ? (
        <Card style={[styles.guidance, { borderColor: theme.brand, borderWidth: 1 }]}>
          <View style={styles.guidanceHeader}>
            <Ionicons name="shield-half-outline" size={22} color={theme.brand} />
            <Text variant="headline" style={styles.flex}>
              {t('detail.extension.title')}
            </Text>
            <Text variant="captionStrong" color="brand">
              {extensionDaysLabel(extension)}
            </Text>
          </View>
          <Text variant="body" color="textSecondary">
            {t('detail.extension.body', { date: formatDate(extension.until) })}
          </Text>
          <Button
            label={t('detail.extension.action')}
            icon="shield-outline"
            onPress={() =>
              router.push({
                pathname: '/warranty-request',
                params: { productName: device.name, ...(receipts[0] ? { documentId: receipts[0].id } : {}) },
              })
            }
          />
        </Card>
      ) : null}

      <Text variant="title">{t('detail.receipts')}</Text>
      {receipts.length ? (
        <Card style={styles.rows}>
          {receipts.map((doc) => (
            <View key={doc.id} style={styles.row}>
              <Pressable
                onPress={() => openReceipt(doc)}
                accessibilityRole="button"
                accessibilityLabel={t('detail.openDocument', { label: DOCUMENT_KIND_LABELS[doc.kind] })}
                style={styles.docOpen}>
                <Ionicons name="document-text-outline" size={20} color={theme.brandIcon} />
                <View style={styles.flex}>
                  <Text variant="body">{DOCUMENT_KIND_LABELS[doc.kind]}</Text>
                  <Text variant="caption" color="textSecondary">
                    {formatDate(doc.createdAt)}
                  </Text>
                </View>
              </Pressable>
              {removingId === doc.id ? (
                <ActivityIndicator color={theme.brand} />
              ) : (
                <Pressable
                  onPress={() => removeReceipt(doc)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('inbox:documents.delete')}>
                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                </Pressable>
              )}
            </View>
          ))}
        </Card>
      ) : (
        <Text variant="body" color="textSecondary">
          {t('detail.noReceipts')}
        </Text>
      )}
      {device.kind !== 'vignette' ? (
        <Button
          label={device.brand ? t('detail.contactBrand', { brand: device.brand }) : t('detail.contactManufacturer')}
          variant="secondary"
          icon="chatbubbles-outline"
          onPress={() => WebBrowser.openBrowserAsync(manufacturerSupportUrl(device))}
        />
      ) : null}
      {receipts.length ? (
        <Button
          label={t('detail.download')}
          variant="secondary"
          icon="download-outline"
          onPress={downloadReceipts}
          loading={downloading}
        />
      ) : null}
      <Button label={t('detail.delete')} variant="danger" icon="trash-outline" onPress={remove} loading={deleting} />
    </ScrollView>
  );
}

function Row({ label, value, strong, selectable }: { label: string; value: string; strong?: boolean; selectable?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textSecondary" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant={strong ? 'bodyStrong' : 'body'} numberOfLines={1} selectable={selectable}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  guidance: { gap: spacing.sm },
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
  guidanceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  protection: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  rows: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowLabel: { flexShrink: 1 },
  docOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photoBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
