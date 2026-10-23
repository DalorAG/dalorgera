import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { InfoBanner } from '@/components/info-banner';
import { RequestPhotoField } from '@/components/request-photo-field';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { useRequestPhoto } from '@/features/use-request-photo';
import type { LuxuryCategory } from '@/lib/api-types';
import { apiErrorMessage, formatDate, formatPrice, parsePrice } from '@/lib/format';
import { LUXURY_CATEGORIES } from '@/lib/luxury';
import { useCreateWarrantyRequestMutation, useGetMeQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

/** Luxus-Versicherung: asks our insurance team to cover a watch, jewellery or a bag. */
export default function LuxuryRequestScreen() {
  const theme = useTheme();
  const { data: me } = useGetMeQuery();
  const { photo, busy: photoBusy, add: attachPhoto, clear: clearPhoto } = useRequestPhoto();
  const extracted = photo?.extracted ?? null;

  const [category, setCategory] = useState<LuxuryCategory | null>(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [value, setValue] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [create, { isLoading }] = useCreateWarrantyRequestMutation();
  const canBeReached = !!me?.email;
  const title = [brand.trim(), model.trim()].filter(Boolean).join(' ');

  const addPhoto = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      const added = await attachPhoto(source);
      // A receipt pre-fills what is still empty; a photo of the item itself has nothing to read.
      const product = added?.extracted?.products[0];
      if (!product) return;
      if (!brand.trim() && product.brand) setBrand(product.brand);
      if (!model.trim()) setModel(product.name);
      const cents = product.priceCents ?? added?.extracted?.totalCents;
      if (!value.trim() && cents != null) setValue(centsToInput(cents));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const send = async () => {
    if (!category) return setError('Bitte wähle aus, was du versichern möchtest.');
    if (!brand.trim() || !model.trim()) return setError('Bitte gib Marke und Modell an.');
    const valueCents = value.trim() ? parsePrice(value) : undefined;
    if (valueCents === null) return setError('Bitte gib den Wert als Betrag an, z. B. 12.500');
    setError(null);
    try {
      await create({
        kind: 'luxury',
        documentId: photo?.id,
        category,
        brand: brand.trim(),
        productName: model.trim(),
        valueCents,
        serialNumber: serialNumber.trim() || undefined,
        message: message.trim() || undefined,
      }).unwrap();
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (sent) {
    return (
      <View style={[styles.flex, styles.done, { backgroundColor: theme.background }]}>
        <Ionicons name="shield-checkmark" size={56} color={theme.success} />
        <Text variant="title" style={styles.center}>
          Anfrage gesendet
        </Text>
        <Text variant="body" color="textSecondary" style={styles.center}>
          Unser Versicherungspartner prüft dein Angebot für „{title}“. Wir melden uns per E-Mail an {me?.email}.
        </Text>
        <Button label="Fertig" onPress={() => router.back()} style={styles.fullWidth} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <InfoBanner
          title="Dein Luxusartikel, gut versichert."
          subtitle="Über unseren Versicherungspartner gegen Diebstahl, Verlust und Beschädigung, auch für ältere oder gebraucht gekaufte Stücke."
          icon={
            <View style={[styles.icon, { backgroundColor: theme.brand }]}>
              <Ionicons name="diamond" size={18} color={theme.textOnBrand} />
            </View>
          }
        />

        <RequestPhotoField
          label="Beleg oder Artikel fotografieren"
          hint="Am besten den Kaufbeleg oder das Zertifikat, sonst ein Foto vom Artikel. Optional, hilft aber bei einem schnellen Angebot."
          photo={photo}
          busy={photoBusy}
          onAdd={addPhoto}
          onRemove={clearPhoto}
        />

        {extracted ? (
          <View style={[styles.receipt, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="captionStrong">Vom Beleg</Text>
            <Text variant="caption" color="textSecondary">
              {[
                extracted.merchant,
                extracted.purchaseDate ? formatDate(extracted.purchaseDate) : null,
                formatPrice(extracted.totalCents, extracted.currency ?? 'EUR'),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        ) : null}

        <View style={styles.group}>
          <Text variant="captionStrong">Was möchtest du versichern? *</Text>
          <View style={styles.chips}>
            {LUXURY_CATEGORIES.map((c) => (
              <Chip key={c.value} label={c.label} selected={category === c.value} onPress={() => setCategory(c.value)} />
            ))}
          </View>
        </View>
        <TextField label="Marke *" value={brand} onChangeText={setBrand} placeholder="z. B. Rolex, Cartier, Hermès" maxLength={60} />
        <TextField label="Modell *" value={model} onChangeText={setModel} placeholder="z. B. Submariner, Love Ring, Birkin 30" maxLength={120} />
        <TextField
          label="Wert (€)"
          value={value}
          onChangeText={setValue}
          placeholder="z. B. 12.500"
          keyboardType="decimal-pad"
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
        <TextField
          label="Nachricht"
          value={message}
          onChangeText={setMessage}
          placeholder="Optional, z. B. Kaufjahr oder ob Box und Papiere vorhanden sind"
          multiline
          maxLength={1000}
          style={styles.message}
        />

        {!canBeReached ? (
          <Text variant="caption" color="warningText">
            Damit wir dir ein Angebot schicken können, melde dich bitte mit deiner E-Mail-Adresse an (Profil).
          </Text>
        ) : (
          <Text variant="caption" color="textSecondary">
            Wir senden deine Angaben und das Foto an unser Team und melden uns an {me?.email}. Unverbindlich und kostenlos.
          </Text>
        )}
        {error ? (
          <Text variant="body" color="danger">
            {error}
          </Text>
        ) : null}
        <Button label="Anfrage senden" icon="paper-plane" onPress={send} loading={isLoading} disabled={!canBeReached || photoBusy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  done: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  icon: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  receipt: { gap: spacing.xxs, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  message: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.md },
});
