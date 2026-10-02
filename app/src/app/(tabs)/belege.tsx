import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DocumentsList } from '@/components/documents-list';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { useGetDevicesQuery, useGetDocumentsQuery } from '@/store/api';
import { spacing, useTheme } from '@/theme';

export default function ReceiptsScreen() {
  const theme = useTheme();
  const { data, isLoading, isFetching, error, refetch } = useGetDocumentsQuery();
  const { data: devices } = useGetDevicesQuery();

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}>
        <ScreenHeader
          icon={<Ionicons name="document-text" size={40} color={theme.brand} />}
          title="Belege"
          subtitle="Kassenbons, Rechnungen und Garantiescheine."
        />
        {isLoading ? (
          <StateView kind="loading" />
        ) : error ? (
          <StateView kind="error" error={error} onRetry={refetch} />
        ) : data?.length ? (
          <DocumentsList documents={data} devices={devices ?? []} />
        ) : (
          <StateView
            kind="empty"
            icon="receipt-outline"
            title="Noch keine Belege"
            message="Fotografiere einen Kassenbon oder Garantieschein."
            action={<Button label="Beleg scannen" icon="camera-outline" onPress={() => router.push('/scan')} />}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
});
