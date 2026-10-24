import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { apiErrorMessage, formatDate, formatPrice } from '@/lib/format';
import { LUXURY_CATEGORIES, REQUEST_STATUS_LABELS } from '@/lib/luxury';
import {
  useDeleteLuxuryItemMutation,
  useGetDocumentUrlQuery,
  useGetLuxuryItemQuery,
  useGetMeQuery,
  useRequestLuxuryInsuranceMutation,
} from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

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
    { text: 'Abbrechen', style: 'cancel' },
    { text: action, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

export default function LuxuryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data: item, isLoading, error, refetch } = useGetLuxuryItemQuery(id);
  const { data: me } = useGetMeQuery();
  const [requestInsurance, { isLoading: requesting }] = useRequestLuxuryInsuranceMutation();
  const [deleteItem, { isLoading: deleting }] = useDeleteLuxuryItemMutation();

  if (isLoading) return <StateView kind="loading" />;
  if (error || !item) return <StateView kind="error" error={error} onRetry={refetch} />;

  const title = `${item.brand} ${item.model}`;
  const category = LUXURY_CATEGORIES.find((c) => c.value === item.category);
  // A closed request may be followed by a new one, e.g. after the item's value changed.
  const openRequest = item.request && item.request.status !== 'closed' ? item.request : null;
  const canBeReached = !!me?.email;

  const askForInsurance = () =>
    confirm(
      'Versicherung anfragen?',
      `Wir senden „${title}“ mit allen Fotos an unser Team und melden uns an ${me?.email}. Unverbindlich und kostenlos.`,
      'Anfrage senden',
      false,
      async () => {
        try {
          await requestInsurance({ id: item.id }).unwrap();
        } catch (err) {
          notify('Anfrage fehlgeschlagen', apiErrorMessage(err));
        }
      },
    );

  const remove = () =>
    confirm('Artikel löschen?', `„${title}“ und seine Fotos werden dauerhaft gelöscht.`, 'Löschen', true, async () => {
      try {
        await deleteItem(item.id).unwrap();
        router.back();
      } catch (err) {
        notify('Löschen fehlgeschlagen', apiErrorMessage(err));
      }
    });

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title }} />

      {item.photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {item.photos.map((p) => (
            <Photo key={p.id} id={p.id} />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.header}>
        <Ionicons name={category?.icon ?? 'diamond-outline'} size={28} color={theme.brand} />
        <View style={styles.flex}>
          <Text variant="caption" color="textSecondary">
            {category?.label} · {item.brand}
          </Text>
          <Text variant="title">{item.model}</Text>
        </View>
      </View>

      <Card style={styles.rows}>
        <Row label="Wert" value={item.valueCents != null ? formatPrice(item.valueCents, item.currency) : 'Nicht angegeben'} strong />
        {item.serialNumber ? <Row label="Seriennummer" value={item.serialNumber} /> : null}
        <Row label="Hinzugefügt am" value={formatDate(item.createdAt)} />
        {item.notes ? (
          <View style={styles.notes}>
            <Text variant="caption" color="textSecondary">
              Notiz
            </Text>
            <Text variant="body">{item.notes}</Text>
          </View>
        ) : null}
      </Card>

      {openRequest ? (
        <Card style={styles.request}>
          <Ionicons name="shield-checkmark" size={28} color={theme.success} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">Versicherung angefragt</Text>
            <Text variant="caption" color="textSecondary">
              {REQUEST_STATUS_LABELS[openRequest.status]} · am {formatDate(openRequest.createdAt)}. Wir melden uns per E-Mail.
            </Text>
          </View>
        </Card>
      ) : (
        <View style={styles.group}>
          <Button
            label="Versicherung anfragen"
            icon="shield-checkmark"
            onPress={askForInsurance}
            loading={requesting}
            disabled={!canBeReached}
          />
          <Text variant="caption" color={canBeReached ? 'textSecondary' : 'warningText'}>
            {canBeReached
              ? 'Unser Versicherungspartner schickt dir ein Angebot gegen Diebstahl, Verlust und Beschädigung.'
              : 'Damit wir dir ein Angebot schicken können, melde dich bitte mit deiner E-Mail-Adresse an (Profil).'}
          </Text>
        </View>
      )}

      <Button label="Artikel löschen" variant="danger" icon="trash-outline" onPress={remove} loading={deleting} />
    </ScrollView>
  );
}

/** Thumbnail through a short-lived signed URL; opens the full-screen viewer. */
function Photo({ id }: { id: string }) {
  const theme = useTheme();
  const { data } = useGetDocumentUrlQuery(id);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/document/[id]', params: { id } })}
      accessibilityRole="button"
      accessibilityLabel="Foto öffnen"
      style={[styles.photo, { backgroundColor: theme.surfaceMuted }]}>
      {data ? (
        <Image source={{ uri: data.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <ActivityIndicator color={theme.brand} />
      )}
    </Pressable>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant={strong ? 'bodyStrong' : 'body'} numberOfLines={1} style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  photos: { gap: spacing.md },
  photo: {
    width: 140,
    height: 180,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rows: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowValue: { flexShrink: 1 },
  notes: { gap: spacing.xxs },
  request: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  group: { gap: spacing.sm },
});
