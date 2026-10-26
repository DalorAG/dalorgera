import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";

import { StatusBadge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { ProgressBar } from "@/components/progress";
import { StateView } from "@/components/state-view";
import { Text } from "@/components/text";
import type { PlanId } from "@/lib/api-types";
import { useGetMeQuery } from "@/store/api";
import { spacing, useTheme } from "@/theme";

/** Same limits as the database (private.device_limit). Prices per month. */
const PLANS: { id: PlanId; devices: number }[] = [
  { id: "trial", devices: 50 },
  { id: "plus", devices: 125 },
  { id: "pro", devices: 1000 },
];

const RANK: Record<PlanId, number> = { trial: 0, plus: 1, pro: 2 };

export default function PricingScreen() {
  const theme = useTheme();
  const { t } = useTranslation("account");
  const { data: me, isLoading, error, refetch } = useGetMeQuery();

  if (isLoading) return <StateView kind="loading" />;
  if (error || !me)
    return <StateView kind="error" error={error} onRetry={refetch} />;

  // Until the backend with the Tarife is deployed: everyone is on the trial.
  const plan = me.plan ?? {
    id: "trial" as const,
    deviceLimit: 50,
    devicesUsed: 0,
  };
  const usage = plan.deviceLimit ? plan.devicesUsed / plan.deviceLimit : 0;

  // In-app purchases are not connected yet (App Store / Google Play products still to be set up).
  const upgrade = () => {
    if (Platform.OS === "web") window.alert(t("pricing.notYet"));
    else Alert.alert(t("pricing.notYetTitle"), t("pricing.notYet"));
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      {me.plan ? (
        <Card style={styles.usage}>
          <Text variant="caption" color="textSecondary">
            {t("pricing.usage")}
          </Text>
          <Text variant="title">
            {t("pricing.usageCount", {
              used: plan.devicesUsed,
              limit: plan.deviceLimit,
            })}
          </Text>
          <ProgressBar
            progress={Math.min(1, usage)}
            color={
              usage >= 1
                ? theme.danger
                : usage >= 0.8
                  ? theme.warning
                  : theme.success
            }
          />
          {usage >= 1 ? (
            <Text variant="caption" color="danger">
              {t("pricing.limitReached")}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {PLANS.map((p) => {
        const current = p.id === plan.id;
        return (
          <Card
            key={p.id}
            style={[
              styles.plan,
              current && { borderColor: theme.brand, borderWidth: 2 },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.flex}>
                <Text variant="title">{t(`pricing.plans.${p.id}.name`)}</Text>
                <Text variant="headline" color="textSecondary">
                  {t(`pricing.plans.${p.id}.price`)}
                </Text>
              </View>
              {current ? (
                <StatusBadge tone="success" label={t("pricing.current")} />
              ) : null}
            </View>
            {[
              t("pricing.devices", { count: p.devices }),
              t("pricing.features.reminders"),
              t("pricing.features.tresor"),
            ].map((f) => (
              <View key={f} style={styles.feature}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={theme.success}
                />
                <Text variant="body" style={styles.flex}>
                  {f}
                </Text>
              </View>
            ))}
            {RANK[p.id] > RANK[plan.id] ? (
              <Button
                label={t("pricing.choose", {
                  name: t(`pricing.plans.${p.id}.name`),
                })}
                onPress={upgrade}
              />
            ) : null}
          </Card>
        );
      })}
      <Text variant="caption" color="textSecondary">
        {t("pricing.footnote")}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  usage: { gap: spacing.xs },
  plan: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
