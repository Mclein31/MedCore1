import { useCallback, useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { usePatient } from '../hooks/usePatient';
import { useResource } from '../hooks/useResource';
import { useAuth } from '../lib/auth';
import { createDocumentsApi } from '../services/documentsApi';
import { formatDateTime, formatPeso } from '../lib/format';
import { Card, EmptyState, ErrorState, LedgerRow, LoadingState, RefreshNotice, Screen, SectionHeader, T } from '../components/ui';
import type { PatientDocument } from '../types/domain';

function Group({ title, docs, onOpen }: { title: string; docs: PatientDocument[]; onOpen: (d: PatientDocument) => void }) {
  if (docs.length === 0) return null;
  return (
    <View>
      <SectionHeader title={title} />
      <Card flush>
        {docs.map((d, i) => (
          <LedgerRow
            key={`${d.kind}-${d.id}`}
            title={d.title}
            sub={`${d.encounterNumber}${d.issuedAt ? ` · ${formatDateTime(d.issuedAt)}` : ''}${d.status ? ` · ${d.status === 'ACTIVE_READY_FOR_EXIT' ? 'Ready for exit' : d.status}` : ''}`}
            value={d.amount != null ? formatPeso(d.amount) : undefined}
            onPress={() => onOpen(d)}
            last={i === docs.length - 1}
          />
        ))}
      </Card>
    </View>
  );
}

export default function DocumentsScreen({ navigation }: { navigation: any }) {
  const { encounters } = usePatient();
  const { client } = useAuth();
  const load = useCallback(() => createDocumentsApi(client).list(), [client]);
  const { data, loading, error, refresh: loadList } = useResource(load);
  const docs = data?.items || [];

  const groups = useMemo(() => ({
    statements: docs.filter((d) => d.kind === 'STATEMENT'),
    receipts: docs.filter((d) => d.kind === 'RECEIPT'),
    clearance: docs.filter((d) => d.kind === 'GATE_PASS' || d.kind === 'PROMISSORY_NOTE'),
    other: docs.filter((d) => !['STATEMENT', 'RECEIPT', 'GATE_PASS', 'PROMISSORY_NOTE'].includes(d.kind))
  }), [docs]);

  function openDocument(doc: PatientDocument) {
    const encounter = encounters.find((item) => item.encounterNumber === doc.encounterNumber);
    navigation.navigate('RecordDetail', { encounterId: encounter?.uuid || doc.encounterNumber, documentKind: doc.kind, documentId: doc.id });
  }

  if (loading && !data) return <LoadingState message="Loading your documents…" />;
  if (error && !data) return <ErrorState message={error!} onRetry={loadList} />;

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadList} />} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <RefreshNotice error={error} onRetry={loadList} />
        {docs.length === 0 && <EmptyState title="No documents yet" detail="Statements, receipts, and discharge papers will appear here." />}
        <Group title={`Statements · ${groups.statements.length}`} docs={groups.statements} onOpen={openDocument} />
        <Group title={`Receipts · ${groups.receipts.length}`} docs={groups.receipts} onOpen={openDocument} />
        <Group title="Discharge & payment plans" docs={groups.clearance} onOpen={openDocument} />
        <Group title="Other papers" docs={groups.other} onOpen={openDocument} />
        <Text style={[T.meta, { marginVertical: 14 }]}>
          Tap a document to view its hospital record and discharge pass details. Document upload from the phone is not yet supported — to submit papers, please visit the hospital billing desk.
        </Text>
      </ScrollView>
    </Screen>
  );
}
