import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ProgressBar } from '@/components/progress';
import { Text } from '@/components/text';
import { preparePhoto } from '@/features/prepare-photo';
import { useUploadDocument } from '@/features/use-upload-document';
import type { DeviceKind, DocumentKind, DocumentMimeType, ReceiptExtraction } from '@/lib/api-types';
import { apiErrorMessage } from '@/lib/format';
import { useAppDispatch } from '@/store';
import { useRecognizeDocumentMutation } from '@/store/api';
import { scanCleared, scanCompleted } from '@/store/scan-slice';
import { radius, scannerColors, spacing, useTheme } from '@/theme';

const STEPS = ['scan', 'recognize', 'save'] as const;
const KINDS = [
  { kind: 'receipt', label: 'kinds.receipt' },
  { kind: 'warranty_card', label: 'kinds.warrantyCard' },
  { kind: 'invoice', label: 'kinds.invoice' },
] as const satisfies readonly { kind: DocumentKind; label: string }[];
const UPLOADABLE = new Set<DocumentMimeType>(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

type Phase =
  | { name: 'capture' }
  | { name: 'uploading'; uri: string }
  | { name: 'recognizing'; uri: string }
  | { name: 'done'; uri: string }
  | { name: 'error'; uri: string; message: string; retry: () => void };

export default function ScanScreen() {
  const theme = useTheme();
  // Inside a full-screen modal SafeAreaView can report no inset on iOS; the window insets are reliable.
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['scan', 'common']);
  const dispatch = useAppDispatch();
  // kind: what was picked on "+", handed on to the device form.
  const { kind: deviceKind } = useLocalSearchParams<{ kind?: DeviceKind }>();
  // Wartung has no receipt: a photo of the product (e.g. the boiler) becomes the device's Produktfoto.
  const productOnly = deviceKind === 'maintenance';
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [kind, setKind] = useState<DocumentKind>(productOnly ? 'product_photo' : 'receipt');
  const [torch, setTorch] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: 'capture' });
  const upload = useUploadDocument();
  const [recognize] = useRecognizeDocumentMutation();

  const step = phase.name === 'uploading' ? 0 : phase.name === 'recognizing' ? 1 : phase.name === 'done' ? 2 : -1;
  const busy = phase.name === 'uploading' || phase.name === 'recognizing';

  const process = async (uri: string, mimeType: DocumentMimeType) => {
    const retry = () => process(uri, mimeType);
    try {
      setPhase({ name: 'uploading', uri });
      // Smaller upload; if the image cannot be processed, the original is sent as is.
      const photo = await preparePhoto(uri).catch(() => ({ uri, mimeType }));
      const doc = await upload({ ...photo, kind });

      let extraction: ReceiptExtraction | null = null;
      if (!productOnly) {
        setPhase({ name: 'recognizing', uri });
        try {
          extraction = await recognize(doc.id).unwrap();
        } catch {
          // Recognition is optional (e.g. no OpenAI key yet): continue with an empty form.
        }
      }
      setPhase({ name: 'done', uri });
      dispatch(scanCompleted({ documentId: doc.id, kind, extraction }));
      router.replace({ pathname: '/device/new', params: deviceKind ? { kind: deviceKind } : {} });
    } catch (err) {
      setPhase({ name: 'error', uri, message: apiErrorMessage(err), retry });
    }
  };

  const takePhoto = async () => {
    // Full quality here; preparePhoto() scales down and compresses once.
    const photo = await camera.current?.takePictureAsync({ quality: 1 });
    if (photo) await process(photo.uri, 'image/jpeg');
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      // Asks iOS for JPEG instead of HEIC, which the recognizer cannot read.
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const mime = (asset.mimeType ?? 'image/jpeg') as DocumentMimeType;
    await process(asset.uri, UPLOADABLE.has(mime) ? mime : 'image/jpeg');
  };

  const skipPhoto = () => {
    dispatch(scanCleared());
    router.replace({ pathname: '/device/new', params: deviceKind ? { kind: deviceKind } : {} });
  };

  const previewUri = phase.name === 'capture' ? null : phase.uri;

  return (
    <View style={[styles.flex, { backgroundColor: scannerColors.backdrop }]}>
      <StatusBar style="light" />
      {permission?.granted && !previewUri ? (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: scannerColors.overlay }]} />

      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t('common:actions.back')} disabled={busy}>
            <Ionicons name="chevron-back" size={26} color={scannerColors.text} />
          </Pressable>
          <Text variant="headline" style={{ color: scannerColors.text }}>
            {productOnly ? t('title.product') : t('title.receipt')}
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={12} disabled={busy}>
            <Text variant="body" style={{ color: scannerColors.text }}>
              {t('common:actions.cancel')}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.kinds, productOnly && styles.hidden]}>
          {KINDS.map((k) => (
            <Pressable
              key={k.kind}
              onPress={() => setKind(k.kind)}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{ selected: kind === k.kind }}
              style={[styles.kind, { backgroundColor: kind === k.kind ? scannerColors.frame : scannerColors.control }]}>
              <Text variant="captionStrong" style={{ color: kind === k.kind ? scannerColors.ink : scannerColors.text }}>
                {t(k.label)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.viewfinder}>
          {previewUri ? (
            // The whole photo, not cropped to the screen and not hidden behind the frame or the sheet.
            <Image source={{ uri: previewUri }} style={styles.preview} contentFit="contain" />
          ) : permission && !permission.granted ? (
            <View style={styles.permission}>
              <Ionicons name="camera-outline" size={40} color={scannerColors.text} />
              <Text variant="body" style={[styles.center, { color: scannerColors.text }]}>
                {productOnly ? t('permission.product') : t('permission.receipt')}
              </Text>
              <Button label={t('permission.allow')} onPress={requestPermission} />
            </View>
          ) : (
            <View style={styles.frame}>
              <Corner style={{ top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }} />
              <Corner style={{ top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }} />
              <Corner style={{ bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }} />
              <Corner style={{ bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }} />
            </View>
          )}
          {permission?.granted && !previewUri ? (
            <View style={styles.sideControls}>
              <RoundControl onPress={() => setTorch((t) => !t)} label={t('torch')}>
                <Ionicons name={torch ? 'flash' : 'flash-off'} size={18} color={scannerColors.text} />
              </RoundControl>
            </View>
          ) : null}
        </View>

        {phase.name === 'capture' ? (
          <>
            <Text variant="caption" style={[styles.hint, { color: scannerColors.textMuted }]}>
              {productOnly ? t('hint.product') : t('hint.receipt')}
            </Text>
            <View style={[styles.controls, { marginBottom: spacing.xl + insets.bottom }]}>
              <RoundControl onPress={pickFromLibrary} label={t('pickFromLibrary')} size={52}>
                <Ionicons name="images-outline" size={22} color={scannerColors.text} />
              </RoundControl>
              <Pressable
                onPress={takePhoto}
                disabled={!permission?.granted}
                accessibilityRole="button"
                accessibilityLabel={t('common:actions.takePhoto')}
                style={({ pressed }) => [styles.shutter, (pressed || !permission?.granted) && styles.dimmed]}>
                <View style={styles.shutterInner} />
              </Pressable>
              {productOnly ? (
                <Pressable onPress={skipPhoto} accessibilityRole="button" style={styles.controlSpacer}>
                  <Text variant="captionStrong" style={[styles.center, { color: scannerColors.text }]}>
                    {t('skipPhoto')}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.controlSpacer} />
              )}
            </View>
          </>
        ) : null}
      </View>

      {phase.name !== 'capture' ? (
        <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom }]}>
          <View style={styles.sheetTop}>
            <View style={[styles.docTile, { backgroundColor: theme.surfaceMuted }]}>
              {busy ? (
                <ActivityIndicator color={theme.brand} />
              ) : (
                <Ionicons
                  name={phase.name === 'error' ? 'alert-circle-outline' : 'checkmark-circle'}
                  size={30}
                  color={phase.name === 'error' ? theme.danger : theme.success}
                />
              )}
            </View>
            <View style={styles.flex}>
              <Text variant="headline">
                {phase.name === 'uploading'
                  ? t(productOnly ? 'phase.uploadingPhoto' : 'phase.uploadingReceipt')
                  : phase.name === 'recognizing'
                    ? t('phase.recognizing')
                    : phase.name === 'done'
                      ? t('phase.done')
                      : t('phase.error')}
              </Text>
              <Text variant="caption" color="textSecondary">
                {phase.name === 'error' ? phase.message : t('phase.encrypted')}
              </Text>
            </View>
            <View style={[styles.safeTile, { backgroundColor: theme.brandSoft }]}>
              <Ionicons name="lock-closed" size={26} color={theme.brandIcon} />
            </View>
          </View>

          {phase.name === 'error' ? (
            <View style={styles.errorActions}>
              <Button label={t('newPhoto')} variant="secondary" onPress={() => setPhase({ name: 'capture' })} style={styles.flex} />
              <Button label={t('common:actions.retry')} onPress={phase.retry} style={styles.flex} />
            </View>
          ) : (
            <>
              <ProgressBar progress={[0.2, 0.65, 1][step] ?? 0} color={theme.success} height={6} />
              <View style={styles.stepper}>
                {STEPS.map((key, i) => {
                  const done = i < step || step === 2;
                  return (
                    <View key={key} style={styles.stepItem}>
                      <View
                        style={[
                          styles.stepDot,
                          done
                            ? { backgroundColor: theme.brand, borderColor: theme.brand }
                            : { borderColor: i === step ? theme.brand : theme.borderStrong },
                        ]}>
                        {done ? <Ionicons name="checkmark" size={14} color={theme.textOnBrand} /> : <Text variant="micro">{i + 1}</Text>}
                      </View>
                      <Text variant="micro" color="textSecondary">
                        {t(`steps.${key}`)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
}

function RoundControl({
  children,
  onPress,
  label,
  size = 40,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.round, { width: size, height: size, backgroundColor: scannerColors.control }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  kinds: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  kind: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl },
  frame: { width: '100%', maxWidth: 320, aspectRatio: 0.7 },
  preview: { flex: 1, alignSelf: 'stretch', marginVertical: spacing.lg },
  permission: { alignItems: 'center', gap: spacing.lg, maxWidth: 280 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: scannerColors.frame, borderRadius: 4 },
  sideControls: { position: 'absolute', right: spacing.lg, top: spacing.lg, gap: spacing.md },
  round: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  hint: { textAlign: 'center', marginBottom: spacing.lg },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxxl,
    marginBottom: spacing.xl,
  },
  controlSpacer: { width: 52, alignItems: 'center', justifyContent: 'center' },
  hidden: { display: 'none' },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: scannerColors.frame,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: scannerColors.frame },
  dimmed: { opacity: 0.6 },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  sheetTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  docTile: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  safeTile: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  errorActions: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.md },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: spacing.md },
  stepItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
