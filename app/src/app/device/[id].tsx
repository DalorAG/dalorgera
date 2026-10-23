import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DeviceThumb } from '@/components/device-thumb';
import { ProgressRing } from '@/components/progress';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { shareDocumentsAsPdf } from '@/features/export-pdf';
import { useProductPhoto, type PhotoSource } from '@/features/use-product-photo';
import type { DocumentItem } from '@/lib/api-types';
import {
  addMonths,
  badgeLabel,
  claimGuidance,
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
  useGetDeviceQuery,
  useGetDocumentsQuery,
  useUpdateDeviceMutation,
} from '@/store/api';
import { useAppDispatch } from '@/store';
import { spacing, useTheme } from '@/theme';

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
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Löschen', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function DeviceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { data: device, isLoading, error, refetch } = useGetDeviceQuery(id);
  const { data: documents } = useGetDocumentsQuery({ deviceId: id });
  const [deleteDevice, { isLoading: deleting }] = useDeleteDeviceMutation();
  const [updateDevice, { isLoading: servicing }] = useUpdateDeviceMutation();
  const [downloading, setDownloading] = useState(false);
  const receipts = documents?.filter(isReceipt) ?? [];
  // Newest first, so this is the latest Produktfoto.
  const productPhoto = documents?.find((d) => d.kind === 'product_photo');
  const { choose: chooseProductPhoto, saving: savingPhoto } = useProductPhoto(id, productPhoto);

  if (isLoading) return <StateView kind="loading" />;
  if (error || !device) return <StateView kind="error" error={error} onRetry={refetch} />;

  const tone = toneForStatus(device.status);
  const guidance = device.kind === 'warranty' || device.kind === 'statutory' ? claimGuidance(device) : null;
  const accent = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.danger;

  const openDocument = async (doc: DocumentItem) => {
    try {
      const { url } = await dispatch(api.endpoints.getDocumentUrl.initiate(doc.id)).unwrap();
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert('Beleg kann nicht geöffnet werden', apiErrorMessage(err));
    }
  };

  const saveProductPhoto = async (source: PhotoSource) => {
    try {
      await chooseProductPhoto(source);
    } catch (err) {
      notify('Foto konnte nicht gespeichert werden', apiErrorMessage(err));
    }
  };

  const pickProductPhoto = () => {
    // The browser file dialog offers the camera itself where there is one.
    if (Platform.OS === 'web') return saveProductPhoto('library');
    Alert.alert('Produktfoto', undefined, [
      { text: 'Foto aufnehmen', onPress: () => saveProductPhoto('camera') },
      { text: 'Aus Galerie wählen', onPress: () => saveProductPhoto('library') },
      { text: 'Abbrechen', style: 'cancel' },
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
      notify('PDF konnte nicht erstellt werden', apiErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  // Today becomes the last service date; the next one and its reminders follow from the interval.
  const markServiced = async () => {
    try {
      await updateDevice({ id: device.id, purchaseDate: new Date().toISOString().slice(0, 10) }).unwrap();
    } catch (err) {
      Alert.alert('Speichern fehlgeschlagen', apiErrorMessage(err));
    }
  };

  const remove = () =>
    confirm('Gerät löschen?', 'Das Gerät, seine Belege und Erinnerungen werden dauerhaft gelöscht.', async () => {
      try {
        await deleteDevice(device.id).unwrap();
        router.back();
      } catch (err) {
        Alert.alert('Löschen fehlgeschlagen', apiErrorMessage(err));
      }
    });

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: device.name }} />

      <View style={styles.header}>
        <Pressable
          onPress={pickProductPhoto}
          disabled={savingPhoto}
          accessibilityRole="button"
          accessibilityLabel={productPhoto ? 'Produktfoto ändern' : 'Produktfoto hinzufügen'}>
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
              <Row label="Gültig ab" value={formatDate(device.purchaseDate)} />
              <Row label="Gültig bis" value={formatDate(device.protectedUntil)} strong />
            </>
          ) : device.kind === 'maintenance' ? (
            <>
              <Row label="Letzte Wartung" value={formatDate(device.purchaseDate)} />
              <Row label="Intervall" value={`${device.maintenanceIntervalMonths} Monate`} />
              <Row label="Nächste Wartung" value={formatDate(device.protectedUntil)} strong />
            </>
          ) : (
            <>
              {device.kind === 'warranty' ? (
                <Row label="Garantie bis" value={device.warrantyUntil ? formatDate(device.warrantyUntil) : 'keine'} />
              ) : null}
              <Row label="Beweislast beim Händler bis" value={formatDate(addMonths(device.purchaseDate, 12))} />
              <Row label="Gewährleistung bis" value={formatDate(device.statutoryUntil)} />
              <Row label="Geschützt bis" value={formatDate(device.protectedUntil)} strong />
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
              Garantie oder Gewährleistung? Mehr erfahren
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {device.kind === 'maintenance' ? (
        <Button label="Wartung erledigt" icon="checkmark" onPress={markServiced} loading={servicing} />
      ) : null}

      <Card style={styles.rows}>
        {device.kind === 'warranty' || device.kind === 'statutory' ? <Row label="Kaufdatum" value={formatDate(device.purchaseDate)} /> : null}
        {device.store ? <Row label="Gekauft bei" value={device.store} /> : null}
        {device.priceCents != null ? <Row label="Preis" value={formatPrice(device.priceCents, device.currency)} /> : null}
      </Card>

      {(device.kind === 'warranty' || device.kind === 'statutory') && device.status !== 'expired' ? (
        <Button
          label="Garantie verlängern"
          variant="secondary"
          icon="shield-outline"
          onPress={() =>
            router.push({
              pathname: '/warranty-request',
              params: { productName: device.name, ...(receipts[0] ? { documentId: receipts[0].id } : {}) },
            })
          }
        />
      ) : null}

      <Text variant="title">Belege</Text>
      {receipts.length ? (
        <Card style={styles.rows}>
          {receipts.map((doc) => (
            <View key={doc.id} style={styles.row}>
              <Pressable
                onPress={() => openDocument(doc)}
                accessibilityRole="button"
                accessibilityLabel={`${DOCUMENT_KIND_LABELS[doc.kind]} öffnen`}
                style={styles.docOpen}>
                <Ionicons name="document-text-outline" size={20} color={theme.brandIcon} />
                <View style={styles.flex}>
                  <Text variant="body">{DOCUMENT_KIND_LABELS[doc.kind]}</Text>
                  <Text variant="caption" color="textSecondary">
                    {formatDate(doc.createdAt)}
                  </Text>
                </View>
              </Pressable>
            </View>
          ))}
        </Card>
      ) : (
        <Text variant="body" color="textSecondary">
          Keine Belege gespeichert.
        </Text>
      )}
      {device.kind !== 'vignette' ? (
        <Button
          label={device.brand ? `${device.brand} kontaktieren` : 'Hersteller kontaktieren'}
          variant="secondary"
          icon="chatbubbles-outline"
          onPress={() => WebBrowser.openBrowserAsync(manufacturerSupportUrl(device))}
        />
      ) : null}
      {receipts.length ? (
        <Button
          label="Herunterladen"
          variant="secondary"
          icon="download-outline"
          onPress={downloadReceipts}
          loading={downloading}
        />
      ) : null}
      <Button label="Gerät löschen" variant="danger" icon="trash-outline" onPress={remove} loading={deleting} />
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
  guidance: { gap: spacing.sm },
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
