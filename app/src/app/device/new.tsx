import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { InfoBanner } from '@/components/info-banner';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import type { ReceiptExtraction } from '@/lib/api-types';
import { apiErrorMessage, formatDate, parseDate, parsePrice } from '@/lib/format';
import { useAppDispatch, useAppSelector } from '@/store';
import { useCreateDeviceMutation, useUpdateDocumentMutation } from '@/store/api';
import { scanCleared } from '@/store/scan-slice';
import { radius, spacing, useTheme } from '@/theme';

const WARRANTY_OPTIONS = [
  { months: 0, label: 'Keine' },
  { months: 12, label: '1 Jahr' },
  { months: 24, label: '2 Jahre' },
  { months: 36, label: '3 Jahre' },
  { months: 60, label: '5 Jahre' },
];

type Form = {
  name: string;
  category: string;
  brand: string;
  store: string;
  purchaseDate: string;
  price: string;
  warrantyMonths: number;
};

function formFromExtraction(extraction: ReceiptExtraction | null, productIndex = 0): Form {
  const product = extraction?.products[productIndex];
  const cents = product?.priceCents ?? (extraction?.products.length === 1 ? extraction.totalCents : null);
  return {
    name: product?.name ?? '',
    category: product?.category ?? '',
    brand: product?.brand ?? '',
    store: extraction?.merchant ?? '',
    purchaseDate: extraction?.purchaseDate ? formatDate(extraction.purchaseDate) : '',
    price: cents != null ? (cents / 100).toFixed(2).replace('.', ',') : '',
    warrantyMonths: product?.warrantyMonths ?? 24,
  };
}

export default function NewDeviceScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const scan = useAppSelector((s) => s.scan);
  const products = scan.extraction?.products ?? [];

  const [productIndex, setProductIndex] = useState(0);
  const [form, setForm] = useState<Form>(() => formFromExtraction(scan.extraction));
  const [errors, setErrors] = useState<Partial<Record<keyof Form | 'submit', string>>>({});
  const [createDevice, { isLoading: creating }] = useCreateDeviceMutation();
  const [updateDocument, { isLoading: linking }] = useUpdateDocumentMutation();

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const pickProduct = (index: number) => {
    setProductIndex(index);
    setForm(formFromExtraction(scan.extraction, index));
  };

  const save = async () => {
    const purchaseDate = parseDate(form.purchaseDate);
    const priceCents = form.price.trim() ? parsePrice(form.price) : undefined;
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Bitte gib einen Namen ein.';
    if (!purchaseDate) next.purchaseDate = 'Format: TT.MM.JJJJ';
    else if (purchaseDate > new Date().toISOString().slice(0, 10)) next.purchaseDate = 'Das Datum liegt in der Zukunft.';
    if (priceCents === null) next.price = 'Ungültiger Betrag';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      const device = await createDevice({
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        brand: form.brand.trim() || undefined,
        store: form.store.trim() || undefined,
        purchaseDate: purchaseDate!,
        priceCents: priceCents ?? undefined,
        currency: scan.extraction?.currency ?? undefined,
        warrantyMonths: form.warrantyMonths,
      }).unwrap();
      if (scan.documentId) await updateDocument({ id: scan.documentId, deviceId: device.id }).unwrap();
      dispatch(scanCleared());
      router.dismissAll();
      router.push(`/device/${device.id}`);
    } catch (err) {
      setErrors({ submit: apiErrorMessage(err) });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {scan.extraction ? (
          <InfoBanner title="Automatisch erkannt" subtitle="Bitte prüfe die Angaben, bevor du speicherst." />
        ) : scan.documentId ? (
          <InfoBanner title="Beleg gespeichert" subtitle="Ergänze die Angaben zum Gerät." />
        ) : null}

        {products.length > 1 ? (
          <View style={styles.group}>
            <Text variant="captionStrong">Welches Gerät?</Text>
            <View style={styles.chips}>
              {products.map((p, i) => (
                <Chip key={`${p.name}-${i}`} label={p.name} selected={i === productIndex} onPress={() => pickProduct(i)} />
              ))}
            </View>
          </View>
        ) : null}

        <TextField label="Gerät *" value={form.name} onChangeText={(v) => set('name', v)} placeholder="z. B. iPhone 15" error={errors.name} />
        <TextField label="Kategorie" value={form.category} onChangeText={(v) => set('category', v)} placeholder="z. B. Smartphone" />
        <TextField label="Marke" value={form.brand} onChangeText={(v) => set('brand', v)} />
        <TextField label="Gekauft bei" value={form.store} onChangeText={(v) => set('store', v)} placeholder="z. B. TechnikMarkt" />
        <TextField
          label="Kaufdatum *"
          value={form.purchaseDate}
          onChangeText={(v) => set('purchaseDate', v)}
          placeholder="TT.MM.JJJJ"
          keyboardType="numbers-and-punctuation"
          error={errors.purchaseDate}
        />
        <TextField
          label="Preis (€)"
          value={form.price}
          onChangeText={(v) => set('price', v)}
          placeholder="0,00"
          keyboardType="decimal-pad"
          error={errors.price}
        />

        <View style={styles.group}>
          <Text variant="captionStrong">Herstellergarantie</Text>
          <View style={styles.chips}>
            {WARRANTY_OPTIONS.map((o) => (
              <Chip key={o.months} label={o.label} selected={form.warrantyMonths === o.months} onPress={() => set('warrantyMonths', o.months)} />
            ))}
          </View>
          <Text variant="caption" color="textSecondary">
            Die gesetzliche Gewährleistung von 2 Jahren wird automatisch berücksichtigt.
          </Text>
        </View>

        {errors.submit ? (
          <Text variant="body" color="danger">
            {errors.submit}
          </Text>
        ) : null}
        <Button label="Speichern" icon="checkmark" onPress={save} loading={creating || linking} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.brand, borderColor: theme.brand }
          : { backgroundColor: theme.surface, borderColor: theme.borderStrong },
      ]}>
      <Text variant="captionStrong" color={selected ? 'textOnBrand' : 'text'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: '100%',
  },
});
