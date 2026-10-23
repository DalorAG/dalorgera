import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CodeScanner } from '@/components/code-scanner';
import { TextField } from '@/components/text-field';
import { isValidImei, type CodeTarget } from '@/lib/device-codes';
import { radius, spacing, useTheme } from '@/theme';

type Props = {
  serialNumber: string;
  imei: string;
  onChange: (target: CodeTarget, value: string) => void;
  /** IMEI only makes sense for phones, tablets and watches with a SIM. */
  showImei: boolean;
  errors?: { serialNumber?: string; imei?: string };
};

/** Seriennummer and IMEI, typed in or scanned from the barcode. */
export function DeviceCodeFields({ serialNumber, imei, onChange, showImei, errors }: Props) {
  const [scanning, setScanning] = useState<CodeTarget | null>(null);
  return (
    <>
      <CodeRow
        label="Seriennummer"
        value={serialNumber}
        onChangeText={(v) => onChange('serial', v)}
        placeholder="z. B. C02XK1JHJG5J"
        autoCapitalize="characters"
        error={errors?.serialNumber}
        onScan={() => setScanning('serial')}
      />
      {showImei ? (
        <CodeRow
          label="IMEI"
          value={imei}
          onChangeText={(v) => onChange('imei', v.replace(/\D/g, '').slice(0, 15))}
          placeholder="15 Ziffern, Tipp: *#06# wählen"
          keyboardType="number-pad"
          error={errors?.imei}
          onScan={() => setScanning('imei')}
        />
      ) : null}
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
  return imei && !isValidImei(imei) ? 'Ungültige IMEI (15 Ziffern, Prüfziffer stimmt nicht).' : undefined;
}

function CodeRow({
  onScan,
  label,
  ...rest
}: React.ComponentProps<typeof TextField> & { onScan: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <TextField label={label} autoCorrect={false} {...rest} />
      </View>
      <Pressable
        onPress={onScan}
        accessibilityRole="button"
        accessibilityLabel={`${label} scannen`}
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
