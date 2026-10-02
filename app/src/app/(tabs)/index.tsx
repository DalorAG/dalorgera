import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { DeviceThumb } from '@/components/device-thumb';
import { InfoBanner } from '@/components/info-banner';
import { ProgressBar, ProgressRing } from '@/components/progress';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { devices, type Device } from '@/data/devices';
import { radius, spacing, useTheme } from '@/theme';

export default function OverviewScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          icon={
            <View style={[styles.logo, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}>
              <Ionicons name="shield-checkmark" size={34} color={theme.brand} />
            </View>
          }
          title="Garantie-Radar"
          subtitle="Deine Geräte. Deine Sicherheit."
          actions={<Ionicons name="person-outline" size={24} color={theme.text} />}
        />

        <InfoBanner
          title="Wir behalten deine Garantien im Blick."
          subtitle="Einfach, sicher und automatisch."
        />

        {devices.slice(0, 2).map((d) => (
          <WarrantyCard key={d.id} device={d} />
        ))}

        <Pressable
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: pressed ? theme.brandPressed : theme.brand },
          ]}>
          <Ionicons name="add" size={20} color={theme.textOnBrand} />
          <Text variant="bodyStrong" color="textOnBrand">
            Gerät hinzufügen
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function WarrantyCard({ device }: { device: Device }) {
  const theme = useTheme();
  const ok = device.status === 'ok';
  const accent = ok ? theme.success : theme.warning;

  return (
    <Card onPress={() => {}} style={styles.card}>
      <View style={styles.row}>
        <DeviceThumb icon={device.icon} size={80} />
        <View style={styles.flex}>
          <Text variant="headline">{device.name}</Text>
          <Text variant="caption" color="textSecondary">
            {device.category}
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.meta}>
            Gekauft am {device.purchasedAt}
            {'\n'}bei {device.store}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
      </View>

      <View style={styles.row}>
        <ProgressRing progress={device.progress} color={accent} />
        <View style={[styles.flex, styles.statusCol]}>
          <Text variant="headline" color={ok ? 'successText' : 'warningText'}>
            {ok ? `${device.remainingLabel} geschützt` : `Achtung: ${device.remainingLabel}`}
          </Text>
          <Text variant="caption" color="textSecondary">
            Garantie bis {device.warrantyUntil}
          </Text>
          <ProgressBar progress={device.progress} color={accent} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  logo: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  meta: { marginTop: spacing.xs },
  statusCol: { gap: spacing.xs },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.pill,
  },
});
