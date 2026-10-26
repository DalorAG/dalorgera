import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import i18n from '@/i18n';
import { CodeScanner } from '@/components/code-scanner';
import { TextField } from '@/components/text-field';
import { isValidEan, isValidImei, type CodeTarget } from '@/lib/device-codes';
import { radius, spacing, useTheme } from '@/theme';

type Props = {
  serialNumber: string;
  imei: string;
  ean: string;
  onChange: (target: CodeTarget, value: string) => void;
  /** IMEI only makes sense for phones, tablets and watches with a SIM. */
  showImei: boolean;
  errors?: { serialNumber?: string; imei?: string; ean?: string };
};

/** Seriennummer, IMEI and EAN, typed in or scanned from the barcode. */
export function DeviceCodeFields({ serialNumber, imei, ean, onChange, showImei, errors }: Props) {
  const { t } = useTranslation('components');
  const [scanning, setScanning] = useState<CodeTarget | null>(null);
  return (
    <>
      <ScannableTextField
        label={t('deviceCodes.serialNumber')}
        value={serialNumber}
        onChangeText={(v) => onChange('serial', v)}
        placeholder={t('deviceCodes.serialPlaceholder')}
        autoCapitalize="characters"
        error={errors?.serialNumber}
        onScan={() => setScanning('serial')}
      />
      {showImei ? (
        <ScannableTextField
          label={t('deviceCodes.imei')}
          value={imei}
          onChangeText={(v) => onChange('imei', v.replace(/\D/g, '').slice(0, 15))}
          placeholder={t('deviceCodes.imeiPlaceholder')}
          keyboardType="number-pad"
          error={errors?.imei}
          onScan={() => setScanning('imei')}
        />
      ) : null}
      <ScannableTextField
        label={t('deviceCodes.ean')}
        value={ean}
        onChangeText={(v) => onChange('ean', v.replace(/\D/g, '').slice(0, 14))}
        placeholder={t('deviceCodes.eanPlaceholder')}
        hint={t('deviceCodes.eanHint')}
        keyboardType="number-pad"
        error={errors?.ean}
        onScan={() => setScanning('ean')}
      />
      <CodeScanner
        target={scanning}
        onScanned={(target, value) => {
          onChange(target, value);
          setScanning(null);
        }}
        onClose={() => setScanning(null)}
      />
    </>
  );
}

/** Validation for the form: empty is fine, otherwise a checksum-valid IMEI. */
export function imeiError(imei: string): string | undefined {
  return imei && !isValidImei(imei) ? i18n.t('components:deviceCodes.imeiInvalid') : undefined;
}

/** Empty is fine, otherwise a checksum-valid EAN/GTIN. */
export function eanError(ean: string): string | undefined {
  return ean && !isValidEan(ean) ? i18n.t('components:deviceCodes.eanInvalid') : undefined;
}

/** A text field with a barcode button beside it; the scanner is up to the caller. */
export function ScannableTextField({
  onScan,
  label,
  ...rest
}: React.ComponentProps<typeof TextField> & { onScan: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation('components');
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <TextField label={label} autoCorrect={false} {...rest} />
      </View>
      <Pressable
        onPress={onScan}
        accessibilityRole="button"
        accessibilityLabel={t('deviceCodes.scan', { label })}
        style={[styles.scan, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}>
        <Ionicons name="barcode-outline" size={24} color={theme.brand} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  // Lines up with the 48 pt input below the label.
  scan: {
    width: 48,
    height: 48,
    marginTop: 22,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
