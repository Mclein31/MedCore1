import { usePullRefresh } from '../hooks/usePullRefresh';
import { useCallback, useRef } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { paymentAccountNamespace } from '../lib/mobileAccess';
import { useAuth } from '../lib/auth';
import { useResource } from '../hooks/useResource';
import { createNotificationsApi } from '../services/notificationsApi';
import { notificationReadKey, parseReadIds } from '../lib/notificationRead';
import { formatDateTime } from '../lib/format';
import { C, EmptyState, ErrorState, LoadingState, RefreshNotice, Screen, T } from '../components/ui';
export default function NotificationsScreen() {
  const { client, user, selectedPatientId } = useAuth();
  const visitRead = useRef<{ key: string; ids: string[] } | null>(null);
  const load = useCallback(async () => {
    const key = notificationReadKey(paymentAccountNamespace(user!, selectedPatientId || undefined));
    const [res, saved] = await Promise.all([
      createNotificationsApi(client).list(),
      AsyncStorage.getItem(key).catch(() => null),
    ]);
    if (visitRead.current?.key !== key) visitRead.current = { key, ids: parseReadIds(saved) };
    const read = visitRead.current.ids;
    // Preserve the previous read snapshot for this visit's 'new' labels.
    // The next visit and header use the acknowledged IDs.
    await AsyncStorage.setItem(
      key,
      JSON.stringify(
        [...new Set([...parseReadIds(saved), ...res.items.map((item) => item.id)])].slice(-1000),
      ),
    ).catch(() => {});
    return { items: res.items, read };
  }, [client, user, selectedPatientId]);
  const { data, loading, error, refresh } = useResource(load, 5000);
  const pullRefresh = usePullRefresh(refresh);
  if (loading && !data) return <LoadingState message="Loading your updates…" />;
  if (!data) return <ErrorState message={error || 'We could not load your updates.'} onRetry={refresh} />;
  const unread = data.items.filter((item) => !data.read.includes(item.id)).length;
  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <RefreshNotice error={error} onRetry={refresh} />
        <Text style={[T.title, { marginTop: 12 }]}>Hospital updates</Text>
        <Text style={[T.meta, { marginVertical: 8 }]}>
          {unread > 0
            ? `${unread} new update${unread === 1 ? '' : 's'} since your last visit.`
            : 'You are all caught up.'}
        </Text>
        {data.items.length === 0 && (
          <EmptyState
            title="No updates yet"
            detail="Bill updates, approvals and discharge changes will appear here."
          />
        )}
        {data.items.map((item) => {
          const isNew = !data.read.includes(item.id);
          return (
            <View
              key={item.id}
              style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
            >
              {isNew && (
                <Text style={{ fontSize: 12, color: C.brand, fontWeight: '700', marginBottom: 4 }}>
                  New update
                </Text>
              )}
              <Text style={T.section}>{item.title}</Text>
              <Text style={[T.body, { color: C.secondary, marginTop: 6 }]}>{item.message}</Text>
              <Text style={[T.meta, { marginTop: 8 }]}>
                {item.encounterNumber} · {formatDateTime(item.timestamp)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
