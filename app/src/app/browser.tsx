import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useTheme } from '@/theme';

/**
 * A shop's page inside the app (native only; the web app opens a new tab instead, since shops
 * refuse to be framed). Only https pages load; anything else, e.g. an app link, goes to the system.
 */
export default function BrowserScreen() {
  const theme = useTheme();
  const { t } = useTranslation('overview');
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(url);

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: title ?? '',
          headerRight: () => (
            <Pressable
              onPress={() => Linking.openURL(current)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('home.deals.detail.openExternal')}>
              <Ionicons name="open-outline" size={22} color={theme.brand} />
            </Pressable>
          ),
        }}
      />
      {progress < 1 ? (
        <View style={[styles.progress, { width: `${Math.max(progress, 0.05) * 100}%`, backgroundColor: theme.brand }]} />
      ) : null}
      <WebView
        source={{ uri: url }}
        style={styles.flex}
        onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
        onNavigationStateChange={(s) => setCurrent(s.url)}
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith('https://') || req.url === 'about:blank') return true;
          Linking.openURL(req.url).catch(() => null);
          return false;
        }}
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { height: 2 },
});
