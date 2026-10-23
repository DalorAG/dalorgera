import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { InfoBanner } from '@/components/info-banner';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { DeviceCodeFields, imeiError } from '@/components/device-code-fields';
import type { DeviceKind, ReceiptExtraction } from '@/lib/api-types';
import { hasDeviceCodes, INTERVAL_OPTIONS, WARRANTY_OPTIONS } from '@/lib/device-ui';
import { apiErrorMessage, currencySymbol, formatDate, parseDate, parsePrice } from '@/lib/format';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  currentVignetteYear,
  selectableVignetteYears,
  VIGNETTE_TYPES,
  vignettePeriod,
  type VignetteType,
} from '@/lib/vignette';
import { useCreateDeviceMutation, useUpdateDocumentMutation } from '@/store/api';
import { scanCleared } from '@/store/scan-slice';
import { radius, spacing, useTheme } from '@/theme';

const DEVICE_KINDS: DeviceKind[] = ['statutory', 'warranty', 'maintenance', 'vignette'];
const TITLES: Record<DeviceKind, string> = {
  statutory: 'Gewährleistung hinzufügen',
  warranty: 'Garantie hinzufügen',
  maintenance: 'Wartung hinzufügen',
  vignette: 'Vignette hinzufügen',
};

type Form = {
  name: string;
  category: string;
  brand: string;
  store: string;
  purchaseDate: string;
  price: string;
  warrantyMonths: number;
  intervalMonths: number;
  serialNumber: string;
  imei: string;
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
    warrantyMonths: product?.warrantyMonths || 24,
    intervalMonths: 12,
    serialNumber: '',
    imei: '',
  };
}

export default function NewDeviceScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = DEVICE_KINDS.find((k) => k === params.kind) ?? 'warranty';
  const scan = useAppSelector((s) => s.scan);
  const products = scan.extraction?.products ?? [];

  const [productIndex, setProductIndex] = useState(0);
  // A receipt can list several products: the user ticks the ones to add (e.g. not the groceries),
  // each ticked one is saved on its own, the photo goes to the first.
  const [included, setIncluded] = useState<number[]>(() => products.map((_, i) => i));
  const [savedProducts, setSavedProducts] = useState<number[]>([]);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [firstDeviceId, setFirstDeviceId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(() => formFromExtraction(scan.extraction));
  const [vignetteType, setVignetteType] = useState<VignetteType>('year');
  const [vignetteYear, setVignetteYear] = useState(currentVignetteYear);
  const vignetteLabel = VIGNETTE_TYPES.find((v) => v.type === vignetteType)!.label;
  const defaultVignetteName = vignetteType === 'year' ? `${vignetteLabel} ${vignetteYear}` : vignetteLabel;
  // For a vignette purchaseDate is the first valid day; the Jahresvignette has fixed dates.
  const vignetteStart = vignetteType === 'year' ? null : parseDate(form.purchaseDate);
  const vignette =
    vignetteType === 'year' || vignetteStart ? vignettePeriod(vignetteType, vignetteStart ?? '', vignetteYear) : null;
  const [errors, setErrors] = useState<Partial<Record<keyof Form | 'submit', string>>>({});
  const [createDevice, { isLoading: creating }] = useCreateDeviceMutation();
  const [updateDocument, { isLoading: linking }] = useUpdateDocumentMutation();

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const pickProduct = (index: number) => {
    setProductIndex(index);
    setForm(formFromExtraction(scan.extraction, index));
  };

  /** Ticked products not saved yet, in receipt order. */
  const pending = (selection: number[], saved = savedProducts) =>
    products.map((_, i) => i).filter((i) => selection.includes(i) && !saved.includes(i));
  const remaining = pending(included);

  const setSelection = (selection: number[]) => {
    setIncluded(selection);
    if (selection.includes(productIndex)) return;
    // The product being edited was unticked: move on to the next ticked one, else enter it by hand.
    pickProduct(pending(selection)[0] ?? -1);
  };
  const toggleProduct = (index: number) =>
    setSelection(included.includes(index) ? included.filter((i) => i !== index) : [...included, index]);

  const save = async () => {
    const purchaseDate = kind === 'vignette' ? (vignette?.validFrom ?? null) : parseDate(form.purchaseDate);
    const name = form.name.trim() || (kind === 'vignette' ? defaultVignetteName : '');
    const priceCents = form.price.trim() ? parsePrice(form.price) : undefined;
    const next: typeof errors = {};
    if (!name) next.name = 'Bitte gib einen Namen ein.';
    if (!purchaseDate) next.purchaseDate = 'Format: TT.MM.JJJJ';
    // A vignette can be bought in advance; purchases and services cannot lie in the future.
    else if (kind !== 'vignette' && purchaseDate > new Date().toISOString().slice(0, 10))
      next.purchaseDate = 'Das Datum liegt in der Zukunft.';
    if (priceCents === null) next.price = 'Ungültiger Betrag';
    if (hasDeviceCodes(kind)) next.imei = imeiError(form.imei);
    if (!next.imei) delete next.imei;
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      const device = await createDevice({
        kind,
        name,
        category: kind === 'vignette' ? 'Vignette' : form.category.trim() || undefined,
        brand: form.brand.trim() || undefined,
        store: form.store.trim() || undefined,
        purchaseDate: purchaseDate!,
        priceCents: priceCents ?? undefined,
        currency: scan.extraction?.currency ?? undefined,
        warrantyMonths: kind === 'warranty' ? form.warrantyMonths : undefined,
        maintenanceIntervalMonths: kind === 'maintenance' ? form.intervalMonths : undefined,
        validUntil: kind === 'vignette' ? vignette?.validUntil : undefined,
        serialNumber: hasDeviceCodes(kind) ? form.serialNumber.trim() || undefined : undefined,
        imei: hasDeviceCodes(kind) ? form.imei || undefined : undefined,
      }).unwrap();
      if (scan.documentId && !firstDeviceId) await updateDocument({ id: scan.documentId, deviceId: device.id }).unwrap();

      const saved = [...savedProducts, productIndex];
      const next = pending(included, saved)[0];
      if (next === undefined) {
        dispatch(scanCleared());
        router.dismissAll();
        router.push(`/device/${firstDeviceId ?? device.id}`);
        return;
      }
      setSavedProducts(saved);
      setFirstDeviceId(firstDeviceId ?? device.id);
      setLastSaved(device.name);
      setErrors({});
      pickProduct(next);
    } catch (err) {
      setErrors({ submit: apiErrorMessage(err) });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: TITLES[kind] }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {scan.extraction ? (
          <InfoBanner title="Automatisch erkannt" subtitle="Bitte prüfe die Angaben, bevor du speicherst." />
        ) : scan.documentId ? (
          <InfoBanner title="Beleg gespeichert" subtitle="Ergänze die Angaben zum Gerät." />
        ) : null}

        {products.length > 1 ? (
          <View style={styles.group}>
            <View style={styles.groupHeader}>
              <Text variant="captionStrong">Welche Produkte übernehmen?</Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  setSelection(remaining.length ? savedProducts : products.map((_, i) => i))
                }>
                <Text variant="captionStrong" color="brand">
                  {remaining.length ? 'Keine' : 'Alle'}
                </Text>
              </Pressable>
            </View>
            {products.map((p, i) => {
              const saved = savedProducts.includes(i);
              const checked = saved || included.includes(i);
              return (
                <Pressable
                  key={`${p.name}-${i}`}
                  onPress={() => !saved && toggleProduct(i)}
                  disabled={saved}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked, disabled: saved }}
                  style={[
                    styles.product,
                    { borderColor: i === productIndex ? theme.brand : theme.border, backgroundColor: theme.surface },
                  ]}>
                  <Ionicons
                    name={saved ? 'checkmark-circle' : checked ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={saved ? theme.success : checked ? theme.brand : theme.textSecondary}
                  />
                  <Text variant="body" numberOfLines={1} style={styles.flex} color={checked ? 'text' : 'textSecondary'}>
                    {p.name}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {saved ? 'Gespeichert' : i === productIndex ? 'Wird bearbeitet' : ''}
                  </Text>
                </Pressable>
              );
            })}
            <Text variant="caption" color="textSecondary">
              Nicht benötigte Positionen (z. B. Lebensmittel) einfach abwählen.
            </Text>
          </View>
        ) : null}
        {lastSaved ? <InfoBanner title={`„${lastSaved}“ gespeichert`} subtitle="Jetzt das nächste Produkt prüfen." /> : null}

        {kind === 'vignette' ? (
          <>
            <View style={styles.group}>
              <Text variant="captionStrong">Art der Vignette</Text>
              <View style={styles.chips}>
                {VIGNETTE_TYPES.map((v) => (
                  <Chip key={v.type} label={v.label} selected={vignetteType === v.type} onPress={() => setVignetteType(v.type)} />
                ))}
              </View>
            </View>
            {vignetteType === 'year' ? (
              <View style={styles.group}>
                <Text variant="captionStrong">Jahr</Text>
                <View style={styles.chips}>
                  {selectableVignetteYears().map((y) => (
                    <Chip key={y} label={String(y)} selected={vignetteYear === y} onPress={() => setVignetteYear(y)} />
                  ))}
                </View>
              </View>
            ) : (
              <TextField
                label="Gültig ab *"
                value={form.purchaseDate}
                onChangeText={(v) => set('purchaseDate', v)}
                placeholder="TT.MM.JJJJ"
                keyboardType="numbers-and-punctuation"
                error={errors.purchaseDate}
              />
            )}
            {vignette ? (
              <InfoBanner
                title={`Gültig von ${formatDate(vignette.validFrom)} bis ${formatDate(vignette.validUntil)}`}
                subtitle="Wir erinnern dich 30 und 7 Tage vor Ablauf."
              />
            ) : null}
            <TextField
              label="Bezeichnung"
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder={defaultVignetteName}
              hint="Optional, z. B. mit Kennzeichen: „Vignette W-12345“"
              error={errors.name}
            />
            <Text variant="caption" color="textSecondary">
              Digitale Vignetten, die online gekauft werden, gelten für Privatkunden erst ab dem 18. Tag nach dem Kauf.
            </Text>
          </>
        ) : (
          <>
          <TextField
            label={kind === 'maintenance' ? 'Was wird gewartet? *' : 'Gerät *'}
            value={form.name}
            onChangeText={(v) => set('name', v)}
            placeholder={kind === 'maintenance' ? 'z. B. Auto (Pickerl)' : 'z. B. iPhone 15'}
            error={errors.name}
          />
          <TextField label="Kategorie" value={form.category} onChangeText={(v) => set('category', v)} placeholder="z. B. Smartphone" />
          <TextField label="Marke" value={form.brand} onChangeText={(v) => set('brand', v)} />
          <TextField label={kind === 'maintenance' ? 'Werkstatt / Firma' : 'Gekauft bei'} value={form.store} onChangeText={(v) => set('store', v)} placeholder="z. B. TechnikMarkt" />
          <TextField
            label={kind === 'maintenance' ? 'Letzte Wartung *' : 'Kaufdatum *'}
            value={form.purchaseDate}
            onChangeText={(v) => set('purchaseDate', v)}
            placeholder="TT.MM.JJJJ"
            keyboardType="numbers-and-punctuation"
            error={errors.purchaseDate}
          />
          </>
        )}
        <TextField
          label={`Preis (${currencySymbol(scan.extraction?.currency)})`}
          value={form.price}
          onChangeText={(v) => set('price', v)}
          placeholder="0,00"
          keyboardType="decimal-pad"
          error={errors.price}
        />
        {hasDeviceCodes(kind) ? (
          <DeviceCodeFields
            serialNumber={form.serialNumber}
            imei={form.imei}
            showImei
            onChange={(target, value) => set(target === 'imei' ? 'imei' : 'serialNumber', value)}
            errors={{ imei: errors.imei }}
          />
        ) : null}

        {kind === 'warranty' ? (
          <View style={styles.group}>
            <Text variant="captionStrong">Herstellergarantie</Text>
            <View style={styles.chips}>
              {WARRANTY_OPTIONS.map((o) => (
                <Chip key={o.months} label={o.label} selected={form.warrantyMonths === o.months} onPress={() => set('warrantyMonths', o.months)} />
              ))}
            </View>
            <Text variant="caption" color="textSecondary">
              Die gesetzliche Gewährleistung von 2 Jahren wird automatisch berücksichtigt (beim Kauf von einem Unternehmen).
            </Text>
            <RightsLink />
          </View>
        ) : kind === 'maintenance' ? (
          <View style={styles.group}>
            <Text variant="captionStrong">Intervall</Text>
            <View style={styles.chips}>
              {INTERVAL_OPTIONS.map((o) => (
                <Chip key={o.months} label={o.label} selected={form.intervalMonths === o.months} onPress={() => set('intervalMonths', o.months)} />
              ))}
            </View>
            <Text variant="caption" color="textSecondary">
              Wir erinnern dich 30 und 7 Tage vor der nächsten Wartung.
            </Text>
          </View>
        ) : kind === 'statutory' ? (
          <View style={styles.group}>
            <Text variant="caption" color="textSecondary">
              Gesetzliche Gewährleistung: 2 Jahre ab Kaufdatum, im ersten Jahr trägt der Händler die Beweislast. Gilt beim Kauf von einem
              Unternehmen, nicht von Privat an Privat.
            </Text>
            <RightsLink />
          </View>
        ) : null}

        {errors.submit ? (
          <Text variant="body" color="danger">
            {errors.submit}
          </Text>
        ) : null}
        <Button
          label={remaining.length > 1 ? `Speichern & weiter (${remaining.length - 1} übrig)` : 'Speichern'}
          icon="checkmark"
          onPress={save}
          loading={creating || linking}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RightsLink() {
  return (
    <Pressable onPress={() => router.push('/rechte')} accessibilityRole="link" hitSlop={8}>
      <Text variant="captionStrong" color="brand">
        Garantie oder Gewährleistung? Mehr erfahren
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  group: { gap: spacing.sm },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  product: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
