import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/progress';
import { Text } from '@/components/text';
import { radius, scannerColors, spacing, useTheme } from '@/theme';

const STEPS = ['Scannen', 'Erkennen', 'Speichern'] as const;

export default function ScanScreen() {
  const theme = useTheme();
  // 0 = scanning, 1 = recognized, 2 = saved
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (step !== 2) return;
    const t = setTimeout(() => router.back(), 900);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <View style={[styles.flex, { backgroundColor: scannerColors.backdrop }]}>
      <StatusBar style="light" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: scannerColors.backdropWood, opacity: 0.6 }]} />

      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Zurück">
            <Ionicons name="chevron-back" size={26} color={scannerColors.text} />
          </Pressable>
          <Text variant="headline" style={{ color: scannerColors.text }}>
            Beleg scannen
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text variant="body" style={{ color: scannerColors.text }}>
              Abbrechen
            </Text>
          </Pressable>
        </View>

        <View style={styles.viewfinder}>
          <View style={styles.frame}>
            <Corner style={{ top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }} />
            <Corner style={{ top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }} />
            <Corner style={{ bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }} />
            <Corner style={{ bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }} />
            <Receipt />
          </View>

          <View style={styles.sideControls}>
            <RoundControl>
              <Ionicons name="flash" size={18} color={scannerColors.text} />
            </RoundControl>
            <RoundControl>
              <Text variant="captionStrong" style={{ color: scannerColors.text }}>
                1×
              </Text>
            </RoundControl>
          </View>
        </View>

        <Text variant="caption" style={[styles.hint, { color: scannerColors.textMuted }]}>
          Positioniere den Beleg im Rahmen
        </Text>

        <Pressable
          onPress={() => setStep((s) => Math.min(s + 1, 2))}
          accessibilityRole="button"
          accessibilityLabel="Foto aufnehmen"
          style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.94 }] }]}>
          <View style={styles.shutterInner} />
        </Pressable>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={styles.sheetTop}>
          <View style={[styles.docTile, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name="document-text-outline" size={30} color={theme.textSecondary} />
            <View style={[styles.docCheck, { backgroundColor: theme.success }]}>
              <Ionicons name="checkmark" size={12} color={theme.textOnBrand} />
            </View>
          </View>
          <View style={styles.flex}>
            <Text variant="headline">
              {step === 2 ? 'Gespeichert' : 'Erfolgreich erkannt'}
            </Text>
            <Text variant="caption" color="textSecondary">
              {step === 2 ? 'Im Tresor abgelegt.' : 'Beleg wird sicher gespeichert …'}
            </Text>
          </View>
          <Ionicons name="paper-plane" size={18} color={theme.brand} style={styles.plane} />
          <View style={[styles.safeTile, { backgroundColor: theme.brandSoft }]}>
            <Ionicons name="lock-closed" size={26} color={theme.brandIcon} />
          </View>
        </View>

        <ProgressBar progress={[0.15, 0.65, 1][step]} color={theme.success} height={6} />

        <View style={styles.stepper}>
          {STEPS.map((label, i) => {
            const done = i < step || (i === step && step === 2);
            return (
              <View key={label} style={styles.stepItem}>
                <View style={styles.stepDotRow}>
                  {i > 0 && <View style={[styles.stepLine, { backgroundColor: theme.borderStrong }]} />}
                  <View
                    style={[
                      styles.stepDot,
                      done
                        ? { backgroundColor: theme.brand, borderColor: theme.brand }
                        : { borderColor: theme.borderStrong },
                    ]}>
                    {done ? (
                      <Ionicons name="checkmark" size={14} color={theme.textOnBrand} />
                    ) : (
                      <Text variant="micro">{i + 1}</Text>
                    )}
                  </View>
                  {i < STEPS.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: theme.borderStrong }]} />
                  )}
                </View>
                <Text variant="micro" color="textSecondary">
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
}

function RoundControl({ children }: { children: React.ReactNode }) {
  return <View style={[styles.round, { backgroundColor: scannerColors.control }]}>{children}</View>;
}

function Receipt() {
  const ink = { color: scannerColors.ink };
  const mono = { fontFamily: 'Courier', ...ink } as const;
  const line = (l: string, r: string, bold = false) => (
    <View style={styles.receiptLine}>
      <Text variant="micro" style={[mono, bold && styles.bold]}>{l}</Text>
      <Text variant="micro" style={[mono, bold && styles.bold]}>{r}</Text>
    </View>
  );

  return (
    <View style={[styles.receipt, { backgroundColor: scannerColors.paper }]}>
      <Text variant="headline" style={[ink, styles.centerText, styles.bold]}>TECHNIKMARKT</Text>
      <Text variant="micro" style={[ink, styles.centerText]}>Besser. Für morgen.</Text>
      <Text variant="micro" style={[mono, styles.centerText, styles.gapTop]}>
        Hauptstraße 42{'\n'}80331 München
      </Text>
      <View style={styles.gapTop}>
        {line('Datum: 12.09.2023', '14:37')}
        {line('Kasse: 3', 'Bon-Nr.: 44821')}
      </View>
      <View style={[styles.dash, { borderColor: scannerColors.ink }]} />
      {line('iPhone 15 128 GB', '949,00 €')}
      {line('Zubehör', '29,99 €')}
      <View style={[styles.dash, { borderColor: scannerColors.ink }]} />
      {line('Total', '978,99 €', true)}
      {line('inkl. 19% MwSt.', '156,31 €')}
      <View style={styles.barcode}>
        {Array.from({ length: 34 }, (_, i) => (
          <View key={i} style={{ width: (i * 7) % 3 + 1, backgroundColor: scannerColors.ink }} />
        ))}
      </View>
      <Text variant="micro" style={[mono, styles.centerText]}>
        VIELEN DANK{'\n'}FÜR DEINEN EINKAUF!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl },
  frame: { width: '100%', maxWidth: 300, padding: spacing.lg },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: scannerColors.frame, borderRadius: 4 },
  sideControls: { position: 'absolute', right: spacing.lg, top: spacing.lg, gap: spacing.md },
  round: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  receipt: { padding: spacing.lg, gap: spacing.xxs, transform: [{ rotate: '-1.5deg' }] },
  receiptLine: { flexDirection: 'row', justifyContent: 'space-between' },
  centerText: { textAlign: 'center' },
  bold: { fontWeight: '800' },
  gapTop: { marginTop: spacing.sm },
  dash: { borderTopWidth: 1, borderStyle: 'dashed', marginVertical: spacing.sm },
  barcode: { flexDirection: 'row', justifyContent: 'center', gap: 1.5, height: 32, marginVertical: spacing.md },
  hint: { textAlign: 'center', marginBottom: spacing.lg },
  shutter: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: scannerColors.frame,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  shutterInner: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: scannerColors.frame },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  sheetTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  docTile: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  docCheck: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plane: { transform: [{ rotate: '-20deg' }] },
  safeTile: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', paddingBottom: spacing.md },
  stepItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  stepDotRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  stepLine: { flex: 1, height: 1 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
