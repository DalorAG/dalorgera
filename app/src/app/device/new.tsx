import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { InfoBanner } from '@/components/info-banner';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { DeviceCodeFields, eanError, imeiError } from '@/components/device-code-fields';
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
  ean: string;
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
    ean: '',
  };
}

export default function NewDeviceScreen() {
  const theme = useTheme();
  const { t } = useTranslation(['device', 'common']);
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

  // Unsaved edits per product, so switching between products does not lose them.
  const [drafts, setDrafts] = useState<Record<number, Form>>({});
  const pickProduct = (index: number, keepDraft = true) => {
    if (index === productIndex) return;
    if (keepDraft) setDrafts((d) => ({ ...d, [productIndex]: form }));
    setProductIndex(index);
    setForm(drafts[index] ?? formFromExtraction(scan.extraction, index));
    setErrors({});
  };
  /** Tapping a product edits it (and ticks it if needed). */
  const editProduct = (index: number) => {
    if (!included.includes(index)) setIncluded([...included, index]);
    pickProduct(index);
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
    if (!name) next.name = t('form.errors.nameRequired');
    if (!purchaseDate) next.purchaseDate = t('form.errors.dateFormat');
    // A vignette can be bought in advance; purchases and services cannot lie in the future.
    else if (kind !== 'vignette' && purchaseDate > new Date().toISOString().slice(0, 10))
      next.purchaseDate = t('form.errors.dateInFuture');
    if (priceCents === null) next.price = t('form.errors.invalidAmount');
    if (hasDeviceCodes(kind)) {
      next.imei = imeiError(form.imei);
      next.ean = eanError(form.ean);
    }
    if (!next.imei) delete next.imei;
    if (!next.ean) delete next.ean;
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
        ean: hasDeviceCodes(kind) ? form.ean || undefined : undefined,
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
      pickProduct(next, false);
    } catch (err) {
      setErrors({ submit: apiErrorMessage(err) });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t(`new.title.${kind}`) }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {scan.extraction ? (
          <InfoBanner title={t('new.autoDetected.title')} subtitle={t('new.autoDetected.subtitle')} />
        ) : scan.documentId ? (
          <InfoBanner
            title={scan.kind === 'product_photo' ? t('new.photoSaved') : t('new.receiptSaved')}
            subtitle={t('new.completeDetails')}
          />
        ) : null}

        {products.length > 1 ? (
          <View style={styles.group}>
            <View style={styles.groupHeader}>
              <Text variant="captionStrong">{t('new.products.title')}</Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  setSelection(remaining.length ? savedProducts : products.map((_, i) => i))
                }>
                <Text variant="captionStrong" color="brand">
                  {remaining.length ? t('new.products.none') : t('new.products.all')}
                </Text>
              </Pressable>
            </View>
            {products.map((p, i) => {
              const saved = savedProducts.includes(i);
              const checked = saved || included.includes(i);
              const editing = i === productIndex && !saved;
              return (
                <Pressable
                  key={`${p.name}-${i}`}
                  onPress={() => !saved && editProduct(i)}
                  disabled={saved}
                  accessibilityRole="button"
                  accessibilityLabel={
                    saved
                      ? t('new.products.a11ySaved', { name: p.name })
                      : editing
                        ? t('new.products.a11yEditing', { name: p.name })
                        : t('new.products.a11yEdit', { name: p.name })
                  }
                  style={[
                    styles.product,
                    editing
                      ? { borderColor: theme.brand, backgroundColor: theme.brandSoft, borderWidth: 2 }
                      : { borderColor: theme.border, backgroundColor: theme.surface },
                  ]}>
                  <Pressable
                    onPress={() => !saved && toggleProduct(i)}
                    disabled={saved}
                    hitSlop={10}
                    accessibilityRole="checkbox"
                    accessibilityLabel={t('new.products.a11yInclude', { name: p.name })}
                    accessibilityState={{ checked, disabled: saved }}>
                    <Ionicons
                      name={saved ? 'checkmark-circle' : checked ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={saved ? theme.success : checked ? theme.brand : theme.textSecondary}
                    />
                  </Pressable>
                  <Text
                    variant={editing ? 'bodyStrong' : 'body'}
                    numberOfLines={1}
                    style={styles.flex}
                    color={checked ? 'text' : 'textSecondary'}>
                    {p.name}
                  </Text>
                  {saved ? (
                    <Text variant="captionStrong" color="success">
                      {t('new.products.saved')}
                    </Text>
                  ) : editing ? (
                    <View style={[styles.editingBadge, { backgroundColor: theme.brand }]}>
                      <Ionicons name="pencil" size={12} color={theme.textOnBrand} />
                      <Text variant="micro" color="textOnBrand" style={styles.badgeLabel}>
                        {t('new.products.editing')}
                      </Text>
                    </View>
                  ) : checked ? (
                    <View style={[styles.editButton, { borderColor: theme.brand }]}>
                      <Ionicons name="pencil-outline" size={12} color={theme.brand} />
                      <Text variant="micro" color="brand" style={styles.badgeLabel}>
                        {t('common:actions.edit')}
                      </Text>
                    </View>
                  ) : (
                    <Text variant="caption" color="textSecondary">
                      {t('new.products.exclude')}
                    </Text>
                  )}
                </Pressable>
              );
            })}
            <Text variant="caption" color="textSecondary">
              {t('new.products.hint')}
            </Text>
          </View>
        ) : null}
        {lastSaved ? <InfoBanner title={t('new.products.lastSaved', { name: lastSaved })} subtitle={t('new.products.nextProduct')} /> : null}
        {products.length > 1 && products[productIndex] && !savedProducts.includes(productIndex) ? (
          <View style={[styles.formHeader, { borderColor: theme.brand }]}>
            <Ionicons name="pencil" size={16} color={theme.brand} />
            <Text variant="headline" numberOfLines={1} style={styles.flex}>
              {t('new.products.detailsFor', { name: products[productIndex].name })}
            </Text>
            <Text variant="caption" color="textSecondary">
              {t('new.products.position', {
                current: pending(included).indexOf(productIndex) + 1 + savedProducts.length,
                total: pending(included).length + savedProducts.length,
              })}
            </Text>
          </View>
        ) : null}

        {kind === 'vignette' ? (
          <>
            <View style={styles.group}>
              <Text variant="captionStrong">{t('new.vignette.type')}</Text>
              <View style={styles.chips}>
                {VIGNETTE_TYPES.map((v) => (
                  <Chip key={v.type} label={v.label} selected={vignetteType === v.type} onPress={() => setVignetteType(v.type)} />
                ))}
              </View>
            </View>
            {vignetteType === 'year' ? (
              <View style={styles.group}>
                <Text variant="captionStrong">{t('new.vignette.year')}</Text>
                <View style={styles.chips}>
                  {selectableVignetteYears().map((y) => (
                    <Chip key={y} label={String(y)} selected={vignetteYear === y} onPress={() => setVignetteYear(y)} />
                  ))}
                </View>
              </View>
            ) : (
              <TextField
                label={t('new.vignette.validFrom')}
                value={form.purchaseDate}
                onChangeText={(v) => set('purchaseDate', v)}
                placeholder={t('form.datePlaceholder')}
                keyboardType="numbers-and-punctuation"
                error={errors.purchaseDate}
              />
            )}
            {vignette ? (
              <InfoBanner
                title={t('new.vignette.period', { from: formatDate(vignette.validFrom), until: formatDate(vignette.validUntil) })}
                subtitle={t('new.vignette.reminder')}
              />
            ) : null}
            <TextField
              label={t('new.vignette.name')}
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder={defaultVignetteName}
              hint={t('new.vignette.nameHint')}
              error={errors.name}
            />
            <Text variant="caption" color="textSecondary">
              {t('new.vignette.digitalNote')}
            </Text>
          </>
        ) : (
          <>
          <TextField
            label={kind === 'maintenance' ? t('form.maintenanceNameLabel') : t('form.nameLabel')}
            value={form.name}
            onChangeText={(v) => set('name', v)}
            placeholder={kind === 'maintenance' ? t('form.maintenanceNamePlaceholder') : t('form.namePlaceholder')}
            error={errors.name}
          />
          <TextField
            label={t('form.category')}
            value={form.category}
            onChangeText={(v) => set('category', v)}
            placeholder={t('form.categoryPlaceholder')}
          />
          <TextField label={t('form.brand')} value={form.brand} onChangeText={(v) => set('brand', v)} />
          <TextField
            label={kind === 'maintenance' ? t('form.workshop') : t('form.store')}
            value={form.store}
            onChangeText={(v) => set('store', v)}
            placeholder={t('form.storePlaceholder')}
          />
          <TextField
            label={kind === 'maintenance' ? t('form.lastService') : t('form.purchaseDate')}
            value={form.purchaseDate}
            onChangeText={(v) => set('purchaseDate', v)}
            placeholder={t('form.datePlaceholder')}
            keyboardType="numbers-and-punctuation"
            error={errors.purchaseDate}
          />
          </>
        )}
        <TextField
          label={t('form.price', { currency: currencySymbol(scan.extraction?.currency) })}
          value={form.price}
          onChangeText={(v) => set('price', v)}
          placeholder={t('form.pricePlaceholder')}
          keyboardType="decimal-pad"
          error={errors.price}
        />
        {hasDeviceCodes(kind) ? (
          <DeviceCodeFields
            serialNumber={form.serialNumber}
            imei={form.imei}
            ean={form.ean}
            showImei
            onChange={(target, value) => set(target === 'imei' ? 'imei' : target === 'ean' ? 'ean' : 'serialNumber', value)}
            errors={{ imei: errors.imei, ean: errors.ean }}
          />
        ) : null}

        {kind === 'warranty' ? (
          <View style={styles.group}>
            <Text variant="captionStrong">{t('form.manufacturerWarranty')}</Text>
            <View style={styles.chips}>
              {WARRANTY_OPTIONS.map((o) => (
                <Chip key={o.months} label={o.label} selected={form.warrantyMonths === o.months} onPress={() => set('warrantyMonths', o.months)} />
              ))}
            </View>
            <Text variant="caption" color="textSecondary">
              {t('new.warrantyHint')}
            </Text>
            <RightsLink />
          </View>
        ) : kind === 'maintenance' ? (
          <View style={styles.group}>
            <Text variant="captionStrong">{t('form.interval')}</Text>
            <View style={styles.chips}>
              {INTERVAL_OPTIONS.map((o) => (
                <Chip key={o.months} label={o.label} selected={form.intervalMonths === o.months} onPress={() => set('intervalMonths', o.months)} />
              ))}
            </View>
            <Text variant="caption" color="textSecondary">
              {t('new.maintenanceHint')}
            </Text>
          </View>
        ) : kind === 'statutory' ? (
          <View style={styles.group}>
            <Text variant="caption" color="textSecondary">
              {t('new.statutoryHint')}
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
          label={remaining.length > 1 ? t('new.saveAndNext', { left: remaining.length - 1 }) : t('common:actions.save')}
          icon="checkmark"
          onPress={save}
          loading={creating || linking}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RightsLink() {
  const { t } = useTranslation('device');
  return (
    <Pressable onPress={() => router.push('/rechte')} accessibilityRole="link" hitSlop={8}>
      <Text variant="captionStrong" color="brand">
        {t('rightsLink')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  group: { gap: spacing.sm },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeLabel: { fontWeight: '600' },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.sm, borderLeftWidth: 3 },
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
