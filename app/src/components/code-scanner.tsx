import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { CODE_BARCODE_TYPES, readScannedCode, type CodeTarget } from '@/lib/device-codes';
import { radius, scannerColors, spacing } from '@/theme';

type Props = { target: CodeTarget | null; onScanned: (target: CodeTarget, value: string) => void; onClose: () => void };

/** Full-screen barcode scanner for the IMEI or Seriennummer; other codes on the box are ignored. */
export function CodeScanner({ target, onScanned, onClose }: Props) {
  const { t } = useTranslation(['components', 'common']);
  // A Modal is its own native window, SafeAreaView there can report no inset on iOS.
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [ignored, setIgnored] = useState(false);
  // The camera keeps reporting the same code until the modal is gone.
  const done = useRef(false);

  const handle = ({ data, type }: BarcodeScanningResult) => {
    if (!target || done.current) return;
    const value = readScannedCode(target, data, type);
    if (!value) return setIgnored(true);
    done.current = true;
    onScanned(target, value);
  };

  return (
    <Modal
      visible={!!target}
      animationType="slide"
      presentationStyle="fullScreen"
      onShow={() => {
        done.current = false;
        setIgnored(false);
      }}
      onRequestClose={onClose}>
      <View style={[styles.flex, { backgroundColor: scannerColors.backdrop }]}>
        {permission?.granted && target ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: CODE_BARCODE_TYPES }}
            onBarcodeScanned={handle}
          />
        ) : null}
        <View style={[styles.flex, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('common:actions.close')}>
              <Ionicons name="close" size={28} color={scannerColors.text} />
            </Pressable>
            <Text variant="headline" style={{ color: scannerColors.text }}>
              {target ? t(`codeScanner.${target}.title`) : ''}
            </Text>
            <Pressable onPress={() => setTorch((t) => !t)} hitSlop={12} accessibilityLabel={t('codeScanner.torch')}>
              <Ionicons name={torch ? 'flash' : 'flash-off'} size={24} color={scannerColors.text} />
            </Pressable>
          </View>

          <View style={styles.center}>
            {permission && !permission.granted ? (
              <View style={styles.permission}>
                <Ionicons name="camera-outline" size={40} color={scannerColors.text} />
                <Text variant="body" style={[styles.textCenter, { color: scannerColors.text }]}>
                  {t('codeScanner.permission')}
                </Text>
                <Button label={t('codeScanner.allowCamera')} onPress={requestPermission} />
              </View>
            ) : (
              <View style={[styles.window, { borderColor: scannerColors.frame }]} />
            )}
          </View>

          <View style={[styles.footer, { backgroundColor: scannerColors.control }]}>
            <Text variant="body" style={[styles.textCenter, { color: scannerColors.text }]}>
              {target ? t(`codeScanner.${target}.hint`) : ''}
            </Text>
            {ignored ? (
              <Text variant="caption" style={[styles.textCenter, { color: scannerColors.textMuted }]}>
                {t(`codeScanner.${target ?? 'serial'}.ignored`)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  textCenter: { textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  window: { width: '100%', maxWidth: 340, height: 140, borderWidth: 3, borderRadius: radius.md },
  permission: { alignItems: 'center', gap: spacing.lg, maxWidth: 280 },
  footer: { margin: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm },
});
