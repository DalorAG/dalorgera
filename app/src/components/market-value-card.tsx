import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { useHiddenAmounts } from '@/features/use-hidden-amounts';
import type { LuxuryItem, MarketValueEstimate } from '@/lib/api-types';
import { apiErrorMessage, formatPrice, parsePrice } from '@/lib/format';
import { currentValue, valueChange } from '@/lib/luxury';
import { useEstimateMarketValueMutation, useUpdateLuxuryItemMutation } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

const centsToInput = (cents: number | null | undefined) => (cents == null ? '' : (cents / 100).toFixed(2).replace('.', ','));

/** Aktueller Wert of a Wertsache: estimated from today's market prices, or typed in by the owner. */
export function MarketValueCard({ item }: { item: LuxuryItem }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation(['tresor', 'common']);
  const [estimateValue, { isLoading: estimating }] = useEstimateMarketValueMutation();
  const [updateItem, { isLoading: saving }] = useUpdateLuxuryItemMutation();
  const [estimate, setEstimate] = useState<MarketValueEstimate | null>(null);
  // null: not typing a value.
  const [input, setInput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { hidden, toggle, mask } = useHiddenAmounts();
  const value = currentValue(item);
  const change = hidden ? null : valueChange(item);

  const runEstimate = async () => {
    setError(null);
    setInput(null);
    try {
      setEstimate(await estimateValue({ id: item.id, language: i18n.language }).unwrap());
    } catch (err) {
      setError(t('detail.market.estimateFailed', { reason: apiErrorMessage(err) }));
    }
  };

  const save = async (valueCents: number | null) => {
    setError(null);
    try {
      await updateItem({ id: item.id, valueCents }).unwrap();
      setEstimate(null);
      setInput(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const saveInput = () => {
    const text = input?.trim() ?? '';
    const cents = text ? parsePrice(text) : null;
    if (text && cents === null) return setError(t('form.errors.value'));
    save(cents);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.labelRow}>
        <Text variant="caption" color="textSecondary">
          {t('detail.currentValue')}
        </Text>
        <Pressable
          onPress={toggle}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={hidden ? t('list.showAmounts') : t('list.hideAmounts')}>
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.valueRow}>
        <Text variant="display">{value != null ? mask(formatPrice(value, item.currency)) : t('common:state.notSpecified')}</Text>
        {change ? (
          <Text variant="bodyStrong" color={change.startsWith('−') ? 'danger' : 'success'}>
            {change}
          </Text>
        ) : null}
      </View>
      {item.valueCents == null && item.purchasePriceCents != null ? (
        <Text variant="caption" color="textSecondary">
          {t('detail.purchasePriceHint')}
        </Text>
      ) : null}

      {estimate ? (
        <View style={[styles.estimate, { backgroundColor: theme.brandSoft }]}>
          <Text variant="captionStrong">{t('detail.market.estimated')}</Text>
          <Text variant="title">{formatPrice(estimate.valueCents, estimate.currency)}</Text>
          <Text variant="caption" color="textSecondary">
            {t('detail.market.range', {
              low: formatPrice(estimate.lowCents, estimate.currency),
              high: formatPrice(estimate.highCents, estimate.currency),
            })}
            {' · '}
            {t(`detail.market.confidence.${estimate.confidence}`)}
          </Text>
          {estimate.summary ? <Text variant="caption">{estimate.summary}</Text> : null}
          {estimate.sources.map((s) => (
            <Pressable key={s.url} onPress={() => WebBrowser.openBrowserAsync(s.url)} accessibilityRole="link" style={styles.source}>
              <Ionicons name="open-outline" size={14} color={theme.brand} />
              <Text variant="caption" color="brand" numberOfLines={1} style={styles.flex}>
                {s.title}
              </Text>
            </Pressable>
          ))}
          <View style={styles.actions}>
            <Button
              label={t('detail.market.adjust')}
              variant="secondary"
              onPress={() => {
                setInput(centsToInput(estimate.valueCents));
                setEstimate(null);
              }}
              disabled={saving}
              style={styles.flex}
            />
            <Button label={t('detail.market.accept')} onPress={() => save(estimate.valueCents)} loading={saving} style={styles.flex} />
          </View>
        </View>
      ) : input !== null ? (
        <View style={styles.form}>
          <TextField
            label={t('detail.market.label')}
            hint={t('detail.market.hint')}
            error={error}
            value={input}
            onChangeText={setInput}
            placeholder={t('detail.market.placeholder')}
            keyboardType="decimal-pad"
            autoFocus
            onSubmitEditing={saveInput}
          />
          <View style={styles.actions}>
            <Button
              label={t('common:actions.cancel')}
              variant="secondary"
              onPress={() => setInput(null)}
              disabled={saving}
              style={styles.flex}
            />
            <Button label={t('common:actions.save')} onPress={saveInput} loading={saving} style={styles.flex} />
          </View>
        </View>
      ) : (
        <View style={styles.form}>
          <Button
            label={estimating ? t('detail.market.estimating') : t('detail.market.estimate')}
            icon="sparkles-outline"
            onPress={runEstimate}
            loading={estimating}
          />
          {error ? (
            <Text variant="caption" color="danger">
              {error}
            </Text>
          ) : null}
          <Pressable
            onPress={() => {
              setError(null);
              setInput(centsToInput(item.valueCents));
            }}
            disabled={estimating}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.manual}>
            <Text variant="captionStrong" color="brand">
              {t('detail.market.manual')}
            </Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.xxs },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  estimate: { gap: spacing.xs, marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  source: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  form: { gap: spacing.md, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  manual: { alignSelf: 'center' },
});
