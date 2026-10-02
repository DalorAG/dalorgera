import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/badge';
import { Card } from '@/components/card';
import { DeviceThumb } from '@/components/device-thumb';
import { InfoBanner } from '@/components/info-banner';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { devices, type Device } from '@/data/devices';
import { radius, spacing, useTheme } from '@/theme';

type Segment = 'devices' | 'receipts';

export default function VaultScreen() {
  const theme = useTheme();
  const [segment, setSegment] = useState<Segment>('devices');

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          icon={<Ionicons name="lock-closed" size={40} color={theme.brand} />}
          title="Digitaler Tresor"
          subtitle="Alle deine Belege. Sicher an einem Ort."
          actions={
            <>
              <Ionicons name="search-outline" size={24} color={theme.text} />
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
            </>
          }
        />

        <InfoBanner
          icon={
            <View style={[styles.docIcon, { backgroundColor: theme.surface }]}>
              <Ionicons name="document-text-outline" size={28} color={theme.brandIcon} />
              <View style={[styles.docCheck, { backgroundColor: theme.success }]}>
                <Ionicons name="checkmark" size={12} color={theme.textOnBrand} />
              </View>
            </View>
          }
          title="Garantie- und Gewährleistungsfristen werden automatisch berechnet."
          subtitle="Du musst dich um nichts mehr kümmern."
        />

        <View style={[styles.segments, { borderBottomColor: theme.border }]}>
          {(
            [
              ['devices', `Geräte (${devices.length})`],
              ['receipts', `Alle Belege (${devices.length})`],
            ] as const
          ).map(([key, label]) => {
            const active = segment === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSegment(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[
                  styles.segment,
                  { borderBottomColor: active ? theme.text : 'transparent' },
                ]}>
                <Text variant={active ? 'captionStrong' : 'caption'} color={active ? 'text' : 'textSecondary'}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {devices.map((d) => (
          <VaultRow key={d.id} device={d} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function VaultRow({ device }: { device: Device }) {
  const theme = useTheme();
  const ok = device.status === 'ok';

  return (
    <Card onPress={() => {}} style={styles.row}>
      <DeviceThumb icon={device.icon} size={60} />
      <View style={[styles.flex, styles.rowBody]}>
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <Text variant="headline">{device.name}</Text>
            <Text variant="caption" color="textSecondary">
              {device.category}
            </Text>
          </View>
          <StatusBadge status={device.status} label={device.remainingLabel} />
        </View>
        <View style={styles.metaRow}>
          <View style={styles.flex}>
            <Meta icon="calendar-outline" text={`Gekauft am ${device.purchasedAt}`} />
            <Meta icon="storefront-outline" text={device.store} />
            <View style={styles.meta}>
              <Ionicons name="shield-checkmark" size={14} color={ok ? theme.success : theme.warning} />
              <Text variant="caption" color={ok ? 'successText' : 'warningText'}>
                Garantie bis {device.warrantyUntil}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </View>
      </View>
    </Card>
  );
}

function Meta({ icon, text }: { icon: 'calendar-outline' | 'storefront-outline'; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <Text variant="caption" color="textSecondary">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  docIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCheck: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segments: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    marginBottom: -StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  rowBody: { gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs },
});
