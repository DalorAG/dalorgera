import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Chip } from '@/components/chip';
import { InfoBanner } from '@/components/info-banner';
import { PhotoStrip } from '@/components/photo-strip';
import { RequestPhotoField } from '@/components/request-photo-field';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import type { PhotoSource } from '@/features/use-product-photo';
import { useRequestPhoto, useRequestPhotos, type RequestPhoto } from '@/features/use-request-photo';
import type { LuxuryCategory, LuxuryItem } from '@/lib/api-types';
import { apiErrorMessage, formatDate, parseDate, parsePrice } from '@/lib/format';
import { LUXURY_CATEGORIES } from '@/lib/luxury';
import { useCreateLuxuryItemMutation, useGetLuxuryItemQuery, useUpdateLuxuryItemMutation } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

const MAX_PHOTOS = 10;

const centsToInput = (cents: number | null | undefined) => (cents == null ? '' : (cents / 100).toFixed(2).replace('.', ','));

/** Adds a Wertsache to the Tresor, or edits one with ?id=. Insurance is requested from its detail screen. */
export default function LuxuryItemFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: item, isLoading, error, refetch } = useGetLuxuryItemQuery(id ?? '', { skip: !id });
  if (!id) return <LuxuryItemForm />;
  if (isLoading) return <StateView kind="loading" />;
  if (error || !item) return <StateView kind="error" error={error} onRetry={refetch} />;
  return <LuxuryItemForm item={item} />;
}

function LuxuryItemForm({ item }: { item?: LuxuryItem }) {
  const theme = useTheme();
  const { photos, busy: photosBusy, add: attachPhotos, remove: removePhoto, full } = useRequestPhotos(
    MAX_PHOTOS - (item?.photos.length ?? 0),
  );
  const invoice = useRequestPhoto('invoice');

  const [category, setCategory] = useState<LuxuryCategory | null>(item?.category ?? null);
  const [brand, setBrand] = useState(item?.brand ?? '');
  const [model, setModel] = useState(item?.model ?? '');
  const [referenceNumber, setReferenceNumber] = useState(item?.referenceNumber ?? '');
  const [serialNumber, setSerialNumber] = useState(item?.serialNumber ?? '');
  const [purchasePrice, setPurchasePrice] = useState(centsToInput(item?.purchasePriceCents));
  const [purchaseDate, setPurchaseDate] = useState(item?.purchaseDate ? formatDate(item.purchaseDate) : '');
  const [store, setStore] = useState(item?.store ?? '');
  const [value, setValue] = useState(centsToInput(item?.valueCents));
  const [hasBoxPapers, setHasBoxPapers] = useState(item?.hasBoxPapers ?? false);
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [create, { isLoading: creating }] = useCreateLuxuryItemMutation();
  const [update, { isLoading: updating }] = useUpdateLuxuryItemMutation();

  /** A Rechnung or Kaufbeleg fills in what is still empty; a photo of the item itself has nothing to read. */
  const prefill = (added: RequestPhoto[]) => {
    const extracted = added.find((p) => p.extracted)?.extracted;
    if (!extracted) return;
    const product = extracted.products[0];
    if (product) {
      if (!brand.trim() && product.brand) setBrand(product.brand);
      if (!model.trim()) setModel(product.name);
    }
    const cents = product?.priceCents ?? extracted.totalCents;
    if (!purchasePrice.trim() && cents != null) setPurchasePrice(centsToInput(cents));
    if (!store.trim() && extracted.merchant) setStore(extracted.merchant);
    if (!purchaseDate.trim() && extracted.purchaseDate) setPurchaseDate(formatDate(extracted.purchaseDate));
  };

  const addInvoice = async (source: PhotoSource) => {
    setError(null);
    try {
      const added = await invoice.add(source);
      if (added) prefill([added]);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const addPhotos = async (source: PhotoSource) => {
    setError(null);
    try {
      prefill(await attachPhotos(source));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const save = async () => {
    if (!category) return setError('Bitte wähle aus, was du hinzufügen möchtest.');
    if (!brand.trim() || !model.trim()) return setError('Bitte gib Marke und Modell an.');
    const purchasePriceCents = purchasePrice.trim() ? parsePrice(purchasePrice) : null;
    if (purchasePriceCents === null && purchasePrice.trim()) return setError('Bitte gib den Kaufpreis als Betrag an, z. B. 9.800');
    const valueCents = value.trim() ? parsePrice(value) : null;
    if (valueCents === null && value.trim()) return setError('Bitte gib den aktuellen Wert als Betrag an, z. B. 12.500');
    const date = purchaseDate.trim() ? parseDate(purchaseDate) : null;
    if (date === null && purchaseDate.trim()) return setError('Bitte gib das Kaufdatum als TT.MM.JJJJ an.');
    setError(null);

    const body = {
      category,
      brand: brand.trim(),
      model: model.trim(),
      referenceNumber: referenceNumber.trim() || null,
      serialNumber: serialNumber.trim() || null,
      purchasePriceCents,
      purchaseDate: date,
      store: store.trim() || null,
      valueCents,
      hasBoxPapers,
      notes: notes.trim() || null,
      documentIds: [...(invoice.photo ? [invoice.photo.id] : []), ...photos.map((p) => p.id)],
    };
    try {
      if (item) {
        await update({ id: item.id, ...body }).unwrap();
        router.back();
      } else {
        const created = await create(body).unwrap();
        router.replace({ pathname: '/luxury/[id]', params: { id: created.id } });
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const busy = photosBusy || invoice.busy;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {item ? <Stack.Screen options={{ title: 'Wertsache bearbeiten' }} /> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!item ? (
          <InfoBanner
            title="Deine Wertsache, sicher im Tresor."
            subtitle="Rechnung, Fotos und Wert an einem Ort. Eine Versicherung gegen Diebstahl, Verlust und Beschädigung kannst du danach mit einem Tipp anfragen."
            icon={
              <View style={[styles.icon, { backgroundColor: theme.brand }]}>
                <Ionicons name="lock-closed" size={18} color={theme.textOnBrand} />
              </View>
            }
          />
        ) : null}

        <RequestPhotoField
          label={item?.invoices.length ? 'Weitere Rechnung' : 'Rechnung'}
          hint="Foto der Rechnung oder des Kaufbelegs. Marke, Modell, Preis, Händler und Datum werden automatisch ausgefüllt."
          photo={invoice.photo}
          busy={invoice.busy}
          onAdd={addInvoice}
          onRemove={invoice.clear}
        />

        <PhotoStrip
          label={item?.photos.length ? 'Weitere Fotos' : 'Fotos'}
          hint={`Artikel, Zertifikat, Seriennummer: bis zu ${MAX_PHOTOS} Fotos.`}
          photos={photos}
          busy={photosBusy}
          full={full}
          onAdd={addPhotos}
          onRemove={removePhoto}
        />

        <View style={styles.group}>
          <Text variant="captionStrong">Was ist es? *</Text>
          <View style={styles.chips}>
            {LUXURY_CATEGORIES.map((c) => (
              <Chip key={c.value} label={c.label} selected={category === c.value} onPress={() => setCategory(c.value)} />
            ))}
          </View>
        </View>
        <TextField label="Marke *" value={brand} onChangeText={setBrand} placeholder="z. B. Rolex, Cartier, Hermès" maxLength={60} />
        <TextField label="Modell *" value={model} onChangeText={setModel} placeholder="z. B. Submariner, Love Ring, Birkin 30" maxLength={120} />
        <TextField
          label="Referenznummer"
          value={referenceNumber}
          onChangeText={setReferenceNumber}
          placeholder="Optional, z. B. 126610LN"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={64}
        />
        <TextField
          label="Seriennummer"
          value={serialNumber}
          onChangeText={setSerialNumber}
          placeholder="Optional, z. B. vom Gehäuse oder Zertifikat"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={64}
        />

        <Text variant="title">Kauf</Text>
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField
              label="Kaufpreis (€)"
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              placeholder="z. B. 9.800"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Kaufdatum"
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="TT.MM.JJJJ"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
        <TextField label="Händler" value={store} onChangeText={setStore} placeholder="Optional, z. B. Wempe Hamburg" maxLength={120} />
        <TextField
          label="Aktueller Wert (€)"
          value={value}
          onChangeText={setValue}
          placeholder="z. B. 12.500, sonst gilt der Kaufpreis"
          keyboardType="decimal-pad"
        />
        <Checkbox checked={hasBoxPapers} onChange={setHasBoxPapers}>
          <Text variant="body">Box und Papiere vorhanden</Text>
        </Checkbox>
        <TextField
          label="Notiz"
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional, z. B. Zustand, Gravur, letzte Revision"
          multiline
          maxLength={1000}
          style={styles.notes}
        />

        {error ? (
          <Text variant="body" color="danger">
            {error}
          </Text>
        ) : null}
        <Button label="Speichern" icon="checkmark" onPress={save} loading={creating || updating} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  icon: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pair: { flexDirection: 'row', gap: spacing.md },
  notes: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.md },
});
