import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ProgressBar } from '@/components/progress';
import { Text } from '@/components/text';
import { preparePhoto } from '@/features/prepare-photo';
import { useUploadDocument } from '@/features/use-upload-document';
import type { DocumentKind, DocumentMimeType, ReceiptExtraction } from '@/lib/api-types';
import { apiErrorMessage } from '@/lib/format';
import { useAppDispatch } from '@/store';
import { useRecognizeDocumentMutation } from '@/store/api';
import { scanCompleted } from '@/store/scan-slice';
import { radius, scannerColors, spacing, useTheme } from '@/theme';

const STEPS = ['Scannen', 'Erkennen', 'Speichern'] as const;
const KINDS: { kind: DocumentKind; label: string }[] = [
  { kind: 'receipt', label: 'Kassenbon' },
  { kind: 'warranty_card', label: 'Garantieschein' },
  { kind: 'invoice', label: 'Rechnung' },
];
const UPLOADABLE = new Set<DocumentMimeType>(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

type Phase =
  | { name: 'capture' }
  | { name: 'uploading'; uri: string }
  | { name: 'recognizing'; uri: string }
  | { name: 'done'; uri: string }
  | { name: 'error'; uri: string; message: string; retry: () => void };

export default function ScanScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  // Set when adding a photo to an existing device: no recognition, no form.
  const { deviceId } = useLocalSearchParams<{ deviceId?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [kind, setKind] = useState<DocumentKind>('receipt');
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
      const doc = await upload({ ...photo, kind, deviceId });

      if (deviceId) {
        setPhase({ name: 'done', uri });
        router.back();
        return;
      }

      setPhase({ name: 'recognizing', uri });
      let extraction: ReceiptExtraction | null = null;
      try {
        extraction = await recognize(doc.id).unwrap();
      } catch {
        // Recognition is optional (e.g. no OpenAI key yet): continue with an empty form.
      }
      setPhase({ name: 'done', uri });
      dispatch(scanCompleted({ documentId: doc.id, kind, extraction }));
      router.replace('/device/new');
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

  const previewUri = phase.name === 'capture' ? null : phase.uri;

  return (
    <View style={[styles.flex, { backgroundColor: scannerColors.backdrop }]}>
      <StatusBar style="light" />
      {permission?.granted && !previewUri ? (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} />
      ) : null}
      {previewUri ? <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: scannerColors.overlay }]} />

      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Zurück" disabled={busy}>
            <Ionicons name="chevron-back" size={26} color={scannerColors.text} />
          </Pressable>
          <Text variant="headline" style={{ color: scannerColors.text }}>
            Beleg scannen
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={12} disabled={busy}>
            <Text variant="body" style={{ color: scannerColors.text }}>
              Abbrechen
            </Text>
          </Pressable>
        </View>

        <View style={styles.kinds}>
          {KINDS.map((k) => (
            <Pressable
              key={k.kind}
              onPress={() => setKind(k.kind)}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{ selected: kind === k.kind }}
              style={[styles.kind, { backgroundColor: kind === k.kind ? scannerColors.frame : scannerColors.control }]}>
              <Text variant="captionStrong" style={{ color: kind === k.kind ? scannerColors.ink : scannerColors.text }}>
                {k.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.viewfinder}>
          {permission && !permission.granted && !previewUri ? (
            <View style={styles.permission}>
              <Ionicons name="camera-outline" size={40} color={scannerColors.text} />
              <Text variant="body" style={[styles.center, { color: scannerColors.text }]}>
                Erlaube den Kamerazugriff, um Belege zu fotografieren.
              </Text>
              <Button label="Kamera erlauben" onPress={requestPermission} />
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
              <RoundControl onPress={() => setTorch((t) => !t)} label="Blitz">
                <Ionicons name={torch ? 'flash' : 'flash-off'} size={18} color={scannerColors.text} />
              </RoundControl>
            </View>
          ) : null}
        </View>

        {phase.name === 'capture' ? (
          <>
            <Text variant="caption" style={[styles.hint, { color: scannerColors.textMuted }]}>
              Positioniere den Beleg im Rahmen
            </Text>
            <View style={styles.controls}>
              <RoundControl onPress={pickFromLibrary} label="Aus Galerie wählen" size={52}>
                <Ionicons name="images-outline" size={22} color={scannerColors.text} />
              </RoundControl>
              <Pressable
                onPress={takePhoto}
                disabled={!permission?.granted}
                accessibilityRole="button"
                accessibilityLabel="Foto aufnehmen"
                style={({ pressed }) => [styles.shutter, (pressed || !permission?.granted) && styles.dimmed]}>
                <View style={styles.shutterInner} />
              </Pressable>
              <View style={styles.controlSpacer} />
            </View>
          </>
        ) : null}
      </SafeAreaView>

      {phase.name !== 'capture' ? (
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.surface }]}>
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
                  ? 'Beleg wird hochgeladen …'
                  : phase.name === 'recognizing'
                    ? 'Beleg wird erkannt …'
                    : phase.name === 'done'
                      ? 'Erfolgreich gespeichert'
                      : 'Das hat nicht geklappt'}
              </Text>
              <Text variant="caption" color="textSecondary">
                {phase.name === 'error' ? phase.message : 'Sicher verschlüsselt im Tresor.'}
              </Text>
            </View>
            <View style={[styles.safeTile, { backgroundColor: theme.brandSoft }]}>
              <Ionicons name="lock-closed" size={26} color={theme.brandIcon} />
            </View>
          </View>

          {phase.name === 'error' ? (
            <View style={styles.errorActions}>
              <Button label="Neues Foto" variant="secondary" onPress={() => setPhase({ name: 'capture' })} style={styles.flex} />
              <Button label="Erneut versuchen" onPress={phase.retry} style={styles.flex} />
            </View>
          ) : (
            <>
              <ProgressBar progress={[0.2, 0.65, 1][step] ?? 0} color={theme.success} height={6} />
              <View style={styles.stepper}>
                {STEPS.map((label, i) => {
                  const done = i < step || step === 2;
                  return (
                    <View key={label} style={styles.stepItem}>
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
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </SafeAreaView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  kinds: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  kind: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl },
  frame: { width: '100%', maxWidth: 320, aspectRatio: 0.7 },
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
  controlSpacer: { width: 52 },
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
