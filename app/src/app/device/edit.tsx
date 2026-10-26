import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DeviceCodeFields, imeiError } from '@/components/device-code-fields';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import type { Device, DeviceInput } from '@/lib/api-types';
import { hasDeviceCodes, INTERVAL_OPTIONS, WARRANTY_OPTIONS } from '@/lib/device-ui';
import { apiErrorMessage, currencySymbol, formatDate, parseDate, parsePrice } from '@/lib/format';
import { useGetDeviceQuery, useUpdateDeviceMutation } from '@/store/api';
import { spacing, useTheme } from '@/theme';

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
  notes: string;
};

function formFromDevice(device: Device): Form {
  return {
    name: device.name,
    category: device.category ?? '',
    brand: device.brand ?? '',
    store: device.store ?? '',
    purchaseDate: formatDate(device.purchaseDate),
    price: device.priceCents != null ? (device.priceCents / 100).toFixed(2).replace('.', ',') : '',
    warrantyMonths: device.warrantyMonths || 24,
    intervalMonths: device.maintenanceIntervalMonths ?? 12,
    serialNumber: device.serialNumber ?? '',
    imei: device.imei ?? '',
    notes: device.notes ?? '',
  };
}

export default function EditDeviceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: device, isLoading, error, refetch } = useGetDeviceQuery(id);

  if (isLoading) return <StateView kind="loading" />;
  if (error || !device) return <StateView kind="error" error={error} onRetry={refetch} />;
  return <EditForm device={device} />;
}

function EditForm({ device }: { device: Device }) {
  const theme = useTheme();
  const { t } = useTranslation(['device', 'common']);
  const [form, setForm] = useState(() => formFromDevice(device));
  const [errors, setErrors] = useState<Partial<Record<keyof Form | 'submit', string>>>({});
  const [updateDevice, { isLoading }] = useUpdateDeviceMutation();
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const { kind } = device;
  // A vignette's dates come from its type; only the name and notes can change.
  const isVignette = kind === 'vignette';

  const save = async () => {
    const purchaseDate = isVignette ? device.purchaseDate : parseDate(form.purchaseDate);
    const priceCents = form.price.trim() ? parsePrice(form.price) : null;
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = t('form.errors.nameRequired');
    if (!purchaseDate) next.purchaseDate = t('form.errors.dateFormat');
    else if (!isVignette && purchaseDate > new Date().toISOString().slice(0, 10))
      next.purchaseDate = t('form.errors.dateInFuture');
    if (form.price.trim() && priceCents === null) next.price = t('form.errors.invalidAmount');
    if (hasDeviceCodes(kind) && imeiError(form.imei)) next.imei = imeiError(form.imei);
    setErrors(next);
    if (Object.keys(next).length) return;

    // Empty fields are sent as null so they are cleared, not kept.
    const changes: Partial<DeviceInput> = { name: form.name.trim(), notes: form.notes.trim() || null };
    if (!isVignette) {
      changes.category = form.category.trim() || null;
      changes.brand = form.brand.trim() || null;
      changes.store = form.store.trim() || null;
      changes.purchaseDate = purchaseDate!;
      changes.priceCents = priceCents;
    }
    if (kind === 'warranty') changes.warrantyMonths = form.warrantyMonths;
    // The API only applies the interval together with the kind.
    if (kind === 'maintenance') Object.assign(changes, { kind, maintenanceIntervalMonths: form.intervalMonths });
    if (hasDeviceCodes(kind)) {
      changes.serialNumber = form.serialNumber.trim() || null;
      changes.imei = form.imei || null;
    }

    try {
      await updateDevice({ id: device.id, ...changes }).unwrap();
      router.back();
    } catch (err) {
      setErrors({ submit: apiErrorMessage(err) });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label={kind === 'maintenance' ? t('form.maintenanceNameLabel') : isVignette ? t('form.vignetteNameLabel') : t('form.nameLabel')}
          value={form.name}
          onChangeText={(v) => set('name', v)}
          error={errors.name}
        />
        {!isVignette ? (
          <>
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
            />
            <TextField
              label={kind === 'maintenance' ? t('form.lastService') : t('form.purchaseDate')}
              value={form.purchaseDate}
              onChangeText={(v) => set('purchaseDate', v)}
              placeholder={t('form.datePlaceholder')}
              keyboardType="numbers-and-punctuation"
              error={errors.purchaseDate}
            />
            <TextField
              label={t('form.price', { currency: currencySymbol(device.currency) })}
              value={form.price}
              onChangeText={(v) => set('price', v)}
              placeholder={t('form.pricePlaceholder')}
              keyboardType="decimal-pad"
              error={errors.price}
            />
          </>
        ) : null}

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
            <Text variant="captionStrong">{t('form.manufacturerWarranty')}</Text>
            <View style={styles.chips}>
              {WARRANTY_OPTIONS.map((o) => (
                <Chip key={o.months} label={o.label} selected={form.warrantyMonths === o.months} onPress={() => set('warrantyMonths', o.months)} />
              ))}
            </View>
          </View>
        ) : kind === 'maintenance' ? (
          <View style={styles.group}>
            <Text variant="captionStrong">{t('form.interval')}</Text>
            <View style={styles.chips}>
              {INTERVAL_OPTIONS.map((o) => (
                <Chip key={o.months} label={o.label} selected={form.intervalMonths === o.months} onPress={() => set('intervalMonths', o.months)} />
              ))}
            </View>
          </View>
        ) : null}

        <TextField
          label={t('form.notes')}
          value={form.notes}
          onChangeText={(v) => set('notes', v)}
          placeholder={t('common:state.optional')}
          multiline
          maxLength={2000}
          style={styles.notes}
        />

        {errors.submit ? (
          <Text variant="body" color="danger">
            {errors.submit}
          </Text>
        ) : null}
        <Button label={t('common:actions.save')} icon="checkmark" onPress={save} loading={isLoading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  notes: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.md },
});
