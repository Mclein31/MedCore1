import { usePullRefresh } from '../hooks/usePullRefresh';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useResource } from '../hooks/useResource';
import { paymentStatus } from '../lib/checkout';
import { useAuth } from '../lib/auth';
import { usePatient } from '../hooks/usePatient';
import { createPaymentApi } from '../services/paymentApi';
import { remainingBalance, describeDischargeStage, describeRail, formatDate, formatDateTime, formatPeso } from '../lib/format';
import { Card, EmptyState, ErrorState, Expandable, Hero, HeroBtn, LedgerRow, LoadingState, RefreshNotice, Screen, SectionHeader, StatusBadge, T } from '../components/ui';

export default function PaymentsScreen({ navigation }: { navigation: any }) {
  const { client } = useAuth();
  const { currentEncounter, encounters, loading: patientLoading, error: patientError, refresh: refreshPatient } = usePatient();
  const load = useCallback(async () => { const api = createPaymentApi(client); const [payments, receipts, plans] = await Promise.all([api.getHistory(), api.getReceipts(), api.listPromissoryNotes()]); return { payments: payments.items, receipts: receipts.items, plans: plans.items }; }, [client]);
  const { data, loading, error, refresh: loadList } = useResource(load, 5000);
  const pullRefresh = usePullRefresh(loadList);
  const payments = data?.payments || [];
  const receipts = data?.receipts || [];
  const plans = data?.plans || [];

  if (loading && !data) return <LoadingState message="Loading your payments…" />;
  if (error && !data) return <ErrorState message={error!} onRetry={loadList} />;

  const balance = currentEncounter ? remainingBalance(currentEncounter) : null;
  const settled = balance !== null && balance <= 0;
  const readyToPay = currentEncounter?.stage === 'PENDING_SETTLEMENT';

  return (
    <Screen safeBottom={false}>
      <ScrollView contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} refreshControl={<RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} />} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <RefreshNotice error={error} onRetry={loadList} />
        <RefreshNotice error={patientError} onRetry={refreshPatient} />
        <View style={{ marginTop: 8 }}>
          {currentEncounter ? <Hero
            eyebrow={settled ? 'Balance settled' : 'Amount you currently owe'}
            figure={formatPeso(balance)}
            sub={settled ? 'No outstanding hospital balance. Payment plans remain listed below.' : readyToPay ? 'Review your bill and choose a payment option.' : `${describeDischargeStage(currentEncounter.stage)} Online payment opens when hospital clearance is complete.`}
          >
            {!settled && <HeroBtn disabled={!!patientError || patientLoading} title={readyToPay ? 'Pay balance' : 'Review bill'} onPress={() => readyToPay ? navigation.navigate('PaymentFlow', { encounterId: currentEncounter.uuid }) : navigation.navigate('Bill')} />}
          </Hero> : patientLoading ? <LoadingState message="Loading your balance…" /> : <Text style={T.meta}>No current hospital bill is available.</Text>}
        </View>

        <SectionHeader title={`Payments · ${payments.length}`} />
        {payments.length === 0 ? (
          <EmptyState title="No payments yet" detail="Payments you make will appear here with receipts." />
        ) : (
          <Card flush>
            {payments.map((p, i) => (
              <LedgerRow
                key={p.id}
                title={`${describeRail(p.paymentRail)} · ${formatPeso(p.amount)}`}
                sub={`${formatDateTime(p.createdAt)} · Receipt ${p.officialReceiptNumber}`}
                value={paymentStatus(p.status, p.isSimulatedDemo)}
                tone={p.status === 'SUCCESS' ? 'ok' : p.status === 'FAILED' ? 'bad' : p.status === 'CANCELLED' ? 'info' : 'warn'}
                last={i === payments.length - 1}
              />
            ))}
          </Card>
        )}

        {plans.length > 0 && (
          <View>
            <SectionHeader title={`Payment plans · ${plans.length}`} />
            {plans.map((n) => {
              const isSettled = n.status === 'SETTLED' || (settled && (n.encounterNumber === currentEncounter?.encounterNumber || plans.length === 1));
              return (
                <Expandable
                  key={n.id}
                  title={`${n.noteNumber} · ${formatPeso(n.principalAmount)}`}
                  subtitle={`${n.installmentMonths} months · ${formatPeso(n.monthlyInstallment)}/mo · ${isSettled ? 'Settled' : n.status === 'ACTIVE' ? 'Active' : n.status}`}
                >
                  <StatusBadge tone={isSettled ? 'ok' : n.status === 'ACTIVE' ? 'info' : 'ok'} text={isSettled ? '✓ Settled' : n.status === 'ACTIVE' ? `● Active · 0% interest` : `✓ ${n.status}`} />
                  <View style={{ marginTop: 8 }}>
                    <LedgerRow title="Total payable" value={formatPeso(n.totalRepayment)} />
                    <LedgerRow title="First due" value={formatDate(n.firstDueDate)} />
                    {(n.schedule || []).map((s: number, i: number) => (
                      <LedgerRow key={i} title={`Month ${i + 1}`} value={formatPeso(s)} last={i === (n.schedule || []).length - 1} />
                    ))}
                  </View>
                </Expandable>
              );
            })}
          </View>
        )}

        {receipts.length > 0 && (
          <View>
            <SectionHeader title={`Receipts · ${receipts.length}`} />
            <Card flush>
              {receipts.map((r, i) => (
                <LedgerRow
                  key={r.id}
                  title={r.officialReceiptNumber}
                  sub={`${formatDateTime(r.issuedAt)} · ${describeRail(r.paymentRail)}`}
                  onPress={() => navigation.navigate('RecordDetail', { encounterId: encounters.find(enc => enc.encounterNumber === r.encounterNumber)?.uuid || r.encounterNumber || '', documentKind: 'RECEIPT', documentId: r.id })}
                  value={formatPeso(r.amount)}
                  last={i === receipts.length - 1}
                />
              ))}
            </Card>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
