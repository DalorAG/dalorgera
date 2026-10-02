import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, shadow, spacing, useTheme } from '@/theme';

import { Text } from './text';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Übersicht', icon: 'home-outline', iconActive: 'home' },
  belege: { label: 'Belege', icon: 'document-outline', iconActive: 'document' },
  tresor: { label: 'Tresor', icon: 'lock-closed-outline', iconActive: 'lock-closed' },
  mehr: { label: 'Mehr', icon: 'ellipsis-horizontal', iconActive: 'ellipsis-horizontal' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const items = state.routes.map((route, index) => {
    const config = TABS[route.name];
    if (!config) return null;
    const focused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        style={styles.item}>
        <Ionicons
          name={focused ? config.iconActive : config.icon}
          size={22}
          color={focused ? theme.tabActive : theme.tabInactive}
        />
        <Text
          variant="micro"
          color={focused ? 'tabActive' : 'tabInactive'}
          style={focused && styles.labelActive}>
          {config.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.tabBar, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}>
      {items.slice(0, 2)}
      <View style={styles.item}>
        <Pressable
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
          accessibilityLabel="Beleg scannen"
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: pressed ? theme.brandPressed : theme.brand },
            shadow(theme.shadow),
          ]}>
          <Ionicons name="add" size={30} color={theme.textOnBrand} />
        </Pressable>
      </View>
      {items.slice(2)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: { flex: 1, alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.xs },
  labelActive: { fontWeight: '700' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.lg,
  },
});
