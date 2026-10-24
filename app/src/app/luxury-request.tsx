import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { InfoBanner } from '@/components/info-banner';
import { PhotoStrip } from '@/components/photo-strip';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import type { PhotoSource } from '@/features/use-product-photo';
import { useRequestPhotos } from '@/features/use-request-photo';
import type { LuxuryCategory } from '@/lib/api-types';
import { apiErrorMessage, parsePrice } from '@/lib/format';
import { LUXURY_CATEGORIES } from '@/lib/luxury';
import { useCreateLuxuryItemMutation } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

const MAX_PHOTOS = 10;

const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

/** Adds a watch, jewellery or a bag to the Luxus tab; insurance is requested later from its detail screen. */
export default function LuxuryItemFormScreen() {
  const theme = useTheme();
  const { photos, busy: photoBusy, add: attachPhotos, remove: removePhoto, full } = useRequestPhotos(MAX_PHOTOS);

  const [category, setCategory] = useState<LuxuryCategory | null>(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [value, setValue] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [create, { isLoading }] = useCreateLuxuryItemMutation();

  const addPhotos = async (source: PhotoSource) => {
    setError(null);
    try {
      const added = await attachPhotos(source);
      // A receipt pre-fills what is still empty; a photo of the item itself has nothing to read.
      const extracted = added.find((p) => p.extracted?.products.length)?.extracted;
      const product = extracted?.products[0];
      if (!product) return;
      if (!brand.trim() && product.brand) setBrand(product.brand);
      if (!model.trim()) setModel(product.name);
      const cents = product.priceCents ?? extracted.totalCents;
      if (!value.trim() && cents != null) setValue(centsToInput(cents));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const save = async () => {
    if (!category) return setError('Bitte wähle aus, was du hinzufügen möchtest.');
    if (!brand.trim() || !model.trim()) return setError('Bitte gib Marke und Modell an.');
    const valueCents = value.trim() ? parsePrice(value) : undefined;
    if (valueCents === null) return setError('Bitte gib den Wert als Betrag an, z. B. 12.500');
    setError(null);
    try {
      const item = await create({
        category,
        brand: brand.trim(),
        model: model.trim(),
        valueCents,
        serialNumber: serialNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        documentIds: photos.map((p) => p.id),
      }).unwrap();
      router.replace({ pathname: '/luxury/[id]', params: { id: item.id } });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <InfoBanner
          title="Dein Luxusartikel, an einem Ort."
          subtitle="Fotos, Seriennummer und Wert gespeichert. Eine Versicherung gegen Diebstahl, Verlust und Beschädigung kannst du danach mit einem Tipp anfragen."
          icon={
            <View style={[styles.icon, { backgroundColor: theme.brand }]}>
              <Ionicons name="diamond" size={18} color={theme.textOnBrand} />
            </View>
          }
        />

        <PhotoStrip
          label="Fotos"
          hint={`Artikel, Kaufbeleg, Zertifikat, Seriennummer: bis zu ${MAX_PHOTOS} Fotos. Ein Kaufbeleg füllt die Angaben automatisch aus.`}
          photos={photos}
          busy={photoBusy}
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
        <TextField label="Wert (€)" value={value} onChangeText={setValue} placeholder="z. B. 12.500" keyboardType="decimal-pad" />
        <TextField
          label="Seriennummer"
          value={serialNumber}
          onChangeText={setSerialNumber}
          placeholder="Optional, z. B. vom Gehäuse oder Zertifikat"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={64}
        />
        <TextField
          label="Notiz"
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional, z. B. Kaufjahr oder ob Box und Papiere vorhanden sind"
          multiline
          maxLength={1000}
          style={styles.notes}
        />

        {error ? (
          <Text variant="body" color="danger">
            {error}
          </Text>
        ) : null}
        <Button label="Speichern" icon="checkmark" onPress={save} loading={isLoading} disabled={photoBusy} />
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
  notes: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.md },
});
