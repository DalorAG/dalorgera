import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DocumentThumb } from '@/components/document-thumb';
import { useOpenDocument } from '@/components/documents-list';
import { Text } from '@/components/text';
import type { Device, DocumentItem } from '@/lib/api-types';
import { DOCUMENT_KIND_LABELS } from '@/lib/device-ui';
import { formatDate, formatPrice } from '@/lib/format';
import { radius, shadow, spacing, useTheme } from '@/theme';

type Props = { documents: DocumentItem[]; devices: Device[] };

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Mail-style buckets: Heute, Gestern, Diese Woche, then by month. */
function bucketLabel(createdAt: string, today: number): string {
  const created = new Date(createdAt);
  const day = startOfDay(created);
  if (day >= today) return 'Heute';
  if (day >= today - DAY) return 'Gestern';
  if (day >= today - 6 * DAY) return 'Diese Woche';
  return created.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

/** 14:05 for today, "Mo." this week, otherwise 12.09.2026. */
function timeLabel(createdAt: string, today: number): string {
  const created = new Date(createdAt);
  const day = startOfDay(created);
  if (day >= today) return created.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (day >= today - 6 * DAY) return created.toLocaleDateString('de-DE', { weekday: 'short' });
  return formatDate(createdAt);
}

function groupByDay(documents: DocumentItem[]) {
  const today = startOfDay(new Date());
  const sorted = [...documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups: [string, DocumentItem[]][] = [];
  for (const doc of sorted) {
    const label = bucketLabel(doc.createdAt, today);
    const last = groups[groups.length - 1];
    if (last?.[0] === label) last[1].push(doc);
    else groups.push([label, [doc]]);
  }
  return { groups, today };
}

export function InboxList({ documents, devices }: Props) {
  const theme = useTheme();
  const open = useOpenDocument();
  const deviceNames = new Map(devices.map((d) => [d.id, d.name]));
  const { groups, today } = groupByDay(documents);

  return (
    <View style={styles.list}>
      {groups.map(([label, docs]) => (
        <View key={label} style={styles.group}>
          <Text variant="captionStrong" color="textSecondary" style={styles.groupLabel}>
            {label}
          </Text>
          <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }, shadow(theme.shadow)]}>
            {docs.map((doc, i) => {
              const unassigned = !doc.deviceId;
              const sender = doc.extracted?.merchant || DOCUMENT_KIND_LABELS[doc.kind];
              const price = formatPrice(doc.extracted?.totalCents, doc.extracted?.currency ?? 'EUR');
              return (
                <Fragment key={doc.id}>
                  {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
                  <Pressable
                    onPress={() => open(doc)}
                    accessibilityRole="button"
                    accessibilityLabel={`${sender}${unassigned ? ', noch nicht zugeordnet' : ''}`}
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.surfaceMuted }]}>
                    <View style={[styles.dot, { backgroundColor: unassigned ? theme.brand : 'transparent' }]} />
                    <DocumentThumb document={doc} size={40} />
                    <View style={styles.body}>
                      <View style={styles.line}>
                        <Text
                          variant={unassigned ? 'bodyStrong' : 'body'}
                          numberOfLines={1}
                          style={styles.sender}>
                          {sender}
                        </Text>
                        <Text variant="micro" color={unassigned ? 'brand' : 'textSecondary'}>
                          {timeLabel(doc.createdAt, today)}
                        </Text>
                      </View>
                      <Text variant="caption" color="textSecondary" numberOfLines={1}>
                        {[DOCUMENT_KIND_LABELS[doc.kind], price].filter(Boolean).join(' · ')}
                      </Text>
                      {unassigned ? (
                        <View style={[styles.pill, { backgroundColor: theme.warningSoft, borderColor: theme.warningSoftBorder }]}>
                          <Ionicons name="add-circle-outline" size={14} color={theme.warningText} />
                          <Text variant="micro" color="warningText" style={styles.pillLabel}>
                            Gerät zuordnen
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.line}>
                          <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                          <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.sender}>
                            {deviceNames.get(doc.deviceId!) ?? 'Gerät'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                </Fragment>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xl },
  group: { gap: spacing.sm },
  groupLabel: { paddingHorizontal: spacing.xs },
  box: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg + 8 + spacing.sm + 40 + spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingRight: spacing.lg, paddingLeft: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  body: { flex: 1, gap: spacing.xxs },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sender: { flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillLabel: { fontWeight: '600' },
});
