import { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useResource } from '../hooks/useResource';
import { useAuth } from '../lib/auth';
import { createClaimsApi } from '../services/claimsApi';
import { describeClaimStatus, formatDateTime, formatPeso } from '../lib/format';
import { Card, EmptyState, ErrorState, LedgerRow, LoadingState, RefreshNotice, Row, Screen, StatusBadge, T } from '../components/ui';

export default function ClaimsScreen() {
  const { client } = useAuth();
  const load = useCallback(() => createClaimsApi(client).list(), [client]);
  const { data, loading, error, refresh: loadList } = useResource(load);
  const claims = data?.items || [];

  if (loading && !data) return <LoadingState message="Loading your insurance claims…" />;
  if (error && !data) return <ErrorState message={error!} onRetry={loadList} />;

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadList} />} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <RefreshNotice error={error} onRetry={loadList} />
        <Text style={[T.meta, { marginTop: 10 }]}>{claims.length === 0 ? 'No claims filed yet.' : `${claims.length} claim${claims.length > 1 ? 's' : ''} across your stays.`}</Text>
        {claims.length === 0 && <EmptyState title="No claims yet" detail="Insurance claims for your stays will appear here." />}
        {claims.map((c) => {
          const info = describeClaimStatus(c.status);
          return (
            <Card key={c.id}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={T.section}>{c.kind === 'PHILHEALTH' ? 'PhilHealth claim' : 'Insurance claim'}</Text>
                <StatusBadge tone={c.status === 'DENIED' ? 'bad' : c.needsAttention ? 'warn' : c.status === 'APPROVED' || c.status === 'PAID' ? 'ok' : 'info'} text={info.title} />
              </View>
              <Text style={[T.body, { color: '#5C6C84', marginTop: 8 }]}>{info.detail}</Text>
              <View style={{ marginTop: 12 }}>
                <LedgerRow title="Reference" value={c.reference} />
                {c.totalCaseRate != null && <LedgerRow title="Case benefit" value={formatPeso(c.totalCaseRate)} />}
                <LedgerRow title="Sent" value={formatDateTime(c.submittedAt)} last />
              </View>
              {c.attentionNote && <Text style={[T.meta, { marginBottom: 8 }]}>{c.attentionNote}</Text>}
              <Row label="Stay" value={c.encounterNumber} />
            </Card>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
