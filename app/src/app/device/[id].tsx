import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DeviceThumb } from '@/components/device-thumb';
import { DocumentThumb } from '@/components/document-thumb';
import { ProgressRing } from '@/components/progress';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import type { DocumentItem } from '@/lib/api-types';
import { badgeLabel, DEVICE_KIND_LABELS, DOCUMENT_KIND_LABELS, iconForDevice, toneForStatus } from '@/lib/device-ui';
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

  if (isLoading) return <StateView kind="loading" />;
  if (error || !device) return <StateView kind="error" error={error} onRetry={refetch} />;

  const tone = toneForStatus(device.status);
  const accent = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.danger;

  const openDocument = async (doc: DocumentItem) => {
    try {
      const { url } = await dispatch(api.endpoints.getDocumentUrl.initiate(doc.id)).unwrap();
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert('Beleg kann nicht geöffnet werden', apiErrorMessage(err));
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
        <DeviceThumb icon={iconForDevice(device.category, device.name)} size={72} />
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
              <Row label="Gewährleistung bis" value={formatDate(device.statutoryUntil)} />
              <Row label="Geschützt bis" value={formatDate(device.protectedUntil)} strong />
            </>
          )}
        </View>
      </Card>

      {(device.kind === 'warranty' || device.kind === 'statutory') && device.status !== 'expired' ? (
        <Card style={styles.insurance}>
          <View style={styles.insuranceHead}>
            <Ionicons name="umbrella-outline" size={24} color={theme.brandIcon} />
            <Text variant="headline" style={styles.flex}>
              Schutz verlängern
            </Text>
          </View>
          <Text variant="caption" color="textSecondary">
            Verlängere die Garantie oder schließe eine Geräteversicherung ab, bevor der Schutz am{' '}
            {formatDate(device.protectedUntil)} endet.
          </Text>
          <Button
            label="Versicherung ansehen"
            variant="secondary"
            icon="shield-outline"
            onPress={() =>
              notify('Bald verfügbar', 'Angebote zur Garantieverlängerung und Geräteversicherung kommen in Kürze.')
            }
          />
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

      <Text variant="title">Belege</Text>
      <View style={styles.docs}>
        {documents?.map((doc) => (
          <Pressable key={doc.id} onPress={() => openDocument(doc)} style={styles.doc} accessibilityRole="button">
            <DocumentThumb document={doc} size={88} />
            <Text variant="micro" color="textSecondary">
              {DOCUMENT_KIND_LABELS[doc.kind]}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button
        label="Beleg hinzufügen"
        variant="secondary"
        icon="camera-outline"
        onPress={() => router.push({ pathname: '/scan', params: { deviceId: device.id } })}
      />
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
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  protection: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  rows: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowLabel: { flexShrink: 1 },
  insurance: { gap: spacing.md },
  insuranceHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  docs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  doc: { alignItems: 'center', gap: spacing.xs },
});
