import { useState } from 'react';
import { usePullRefresh } from '../hooks/usePullRefresh';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { usePatient } from '../hooks/usePatient';
import { useFacilityName } from '../hooks/useFacility';
import { useNetworkStatus } from '../lib/offline';
import { describeClaimStatus, describeDischargeStage, describeHmoStatus, formatDate, formatDateTime, formatPeso, hasHmo, remainingBalance } from '../lib/format';
import { Sparkles } from 'lucide-react-native';
import QuickActions from '../components/QuickActions';
import { Icon } from '../components/icons';
import { CoraAssistantModal } from '../components/CoraAssistantModal';
import { CoraFloatingPill } from '../components/CoraFloatingPill';
import { C, Card, EmptyState, ErrorState, Expandable, LedgerRow, LoadingState, PrimaryButton, RefreshNotice, Row, Screen, SectionHeader, Stepper, T } from '../components/ui';

function firstName(full: string | undefined): string {
  if (!full) return 'there';
  return (full.includes(',') ? full.split(',')[1] : full).trim().split(/\s+/)[0] || 'there';
}
export default function HomeScreen({ navigation }: { navigation: any }) {
  const { patient, encounters, overview, currentEncounter, loading, error, lastSynced, refresh } = usePatient();
  const pullRefresh = usePullRefresh(refresh);
  const facility = useFacilityName();
  const net = useNetworkStatus();
  const [coraOpen, setCoraOpen] = useState(false);
  const [coraQuery, setCoraQuery] = useState<string | undefined>(undefined);
  if (loading && !overview) return <LoadingState message="Loading your hospital account…" />;
  if (error && !overview) return <ErrorState message={error} onRetry={refresh} />;
  const checklist = overview?.dischargeChecklist || [];
  const firstOpen = checklist.findIndex((item) => !item.done);
  const steps = checklist.map((item, i) => ({ title: item.label, state: (item.done ? 'done' : i === firstOpen ? 'now' : 'todo') as 'done' | 'now' | 'todo' }));
  const owe = currentEncounter ? remainingBalance(currentEncounter) : 0;
  const cleared = currentEncounter?.stage === 'CLEARED_GATE_PASS';
  const readyToPay = owe > 0 && currentEncounter?.stage === 'PENDING_SETTLEMENT';
  const actions = [
    { label: 'Bill', icon: 'bill', onPress: () => navigation.navigate('Bill') },
    { label: 'Coverage', icon: 'coverage', onPress: () => navigation.navigate('Coverage') },
    { label: 'Payments', icon: 'payments', onPress: () => navigation.navigate('Payments') },
    { label: 'Documents', icon: 'file', onPress: () => navigation.navigate('Documents') }
  ];
  return <Screen gutter={0} topSpacing={0} safeBottom={false} background={C.paper}><ScrollView contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} contentContainerStyle={{ paddingBottom: 0 }} refreshControl={<RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} tintColor={C.brand} />} showsVerticalScrollIndicator={false}>
    <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20 }}>
      <Text style={T.meta}>Good day,</Text>
      <Text accessibilityRole="header" style={[T.display, { marginTop: 4, lineHeight: 41 }]}>{patient?.fullName || firstName(patient?.fullName)}</Text>
      <Text style={[T.meta, { marginTop: 6 }]}>{facility}</Text>
    </View>
    <View style={{ paddingHorizontal: 22, paddingBottom: 28 }}>
      <View testID="financial-summary" style={{ backgroundColor: C.surface, borderRadius: 22, padding: 22, marginBottom: 12 }}>
        <Text style={[T.meta, { fontWeight: '500' }]}>{cleared ? 'Discharge status' : currentEncounter ? 'Remaining hospital balance' : 'Your hospital account'}</Text>
        <Text accessibilityRole="header" style={[T.display, { marginTop: 8, lineHeight: 42 }]}>{cleared ? 'Cleared to leave' : currentEncounter ? formatPeso(owe) : 'No current statement'}</Text>
        {currentEncounter && <Text style={[T.meta, { marginTop: 8 }]}>{cleared ? 'Your discharge pass is ready.' : 'After coverage, discounts and recorded payments.'}</Text>}
        <PrimaryButton
          title={cleared ? 'View discharge pass' : readyToPay ? 'Pay balance' : 'Review bill'}
          disabled={readyToPay && (!!error || !net.connected || loading)}
          onPress={() => cleared ? navigation.navigate('Documents') : readyToPay ? navigation.navigate('PaymentFlow', { encounterId: currentEncounter!.uuid }) : navigation.navigate('Bill')}
        />
      </View>
      <QuickActions actions={actions} />
      <RefreshNotice error={error} onRetry={refresh} />
      {!net.connected && <Text style={[T.meta, { color: C.warning }]} accessibilityRole="alert">You’re offline. Information may be out of date.</Text>}
      {currentEncounter ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}><Icon name="clock" size={17} color={C.brandDark} /><Text style={[T.meta, { flex: 1 }]}>{describeDischargeStage(currentEncounter.stage)}</Text></View>
        <Text style={[T.meta, { marginTop: 8 }]}>Room {currentEncounter.roomBed} · Admitted {formatDate(currentEncounter.admissionDate)}</Text>
      {(overview?.alerts?.length ?? 0) > 0 && <>
        <SectionHeader title="Latest from your hospital" action={<Pressable onPress={() => navigation.navigate('Notifications')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: C.brand, fontWeight: '600' }}>All updates</Text></Pressable>} />
        {(overview?.alerts || []).slice(0, 2).map((item, i) => <View key={`${item.timestamp}-${i}`} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}><Text style={T.cardTitle}>{item.title}</Text><Text style={[T.meta, { marginTop: 4 }]}>{item.message}</Text>{item.timestamp && <Text style={[T.meta, { marginTop: 4 }]}>{formatDateTime(item.timestamp)}</Text>}</View>)}
      </>}
      <SectionHeader title="Coverage applied to your bill" />
      <Card flush>
        <LedgerRow title="PhilHealth" sub={describeClaimStatus(currentEncounter.philhealth?.status || '').title} value={formatPeso(currentEncounter.waterfall.philhealthTotal)} onPress={() => navigation.navigate('Coverage')} />
        <LedgerRow title={hasHmo(currentEncounter) ? currentEncounter.hmo.providerName : 'No HMO on file'} sub={hasHmo(currentEncounter) ? describeHmoStatus(currentEncounter.hmo.finalLoaStatus).title : 'Contact billing to add coverage details'} value={formatPeso(currentEncounter.waterfall.hmoApprovedAmount)} onPress={() => navigation.navigate('Coverage')} last />
      </Card>
      {steps.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 }}>
            <Text accessibilityRole="header" style={T.section}>Your discharge journey</Text>
            <Pressable
              onPress={() => {
                setCoraQuery('What does this discharge stage mean and what is needed next?');
                setCoraOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Ask Cora about this stage"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                minHeight: 44,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: C.brandSoft,
                borderRadius: 22
              }}
            >
              <Sparkles size={13} color={C.brand} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.brandDark }}>Ask Cora</Text>
            </Pressable>
          </View>
          <View style={{ paddingVertical: 8 }}><Stepper steps={steps} /></View>
        </>
      )}
      <Expandable title="How your bill adds up" subtitle="Charges, benefits, discounts and payments">
        <Row label="Total hospital charges" value={formatPeso(currentEncounter.waterfall.grossTotal)} />
        <Row label="VAT exemption" value={`−${formatPeso(currentEncounter.waterfall.vatExemption)}`} />
        <Row label="Senior / PWD discount" value={`−${formatPeso(currentEncounter.waterfall.seniorPwdDiscount)}`} />
        <Row label="PhilHealth benefit" value={`−${formatPeso(currentEncounter.waterfall.philhealthTotal)}`} />
        <Row label="HMO benefit" value={`−${formatPeso(currentEncounter.waterfall.hmoApprovedAmount)}`} />
        <Row label="Patient responsibility" value={formatPeso(currentEncounter.waterfall.netPatientDue)} />
        <Row label="Remaining balance" value={formatPeso(owe)} bold />
      </Expandable>
    </> : <EmptyState title="No hospital stay yet" detail="Your bill and discharge updates will appear when your hospital admission is linked." />}
    <SectionHeader title="Your records" />
    <Card flush><LedgerRow title="Insurance claims" sub="Track benefits and review status" onPress={() => navigation.navigate('Claims')} /><LedgerRow title="Documents & receipts" sub="Statements, payment plans and discharge passes" onPress={() => navigation.navigate('Documents')} last /></Card>
    {encounters.length > 1 && <><SectionHeader title="Recent stays" /><Card flush>{encounters.slice(0, 3).map((enc, i, all) => <LedgerRow key={enc.uuid} title={enc.encounterNumber} sub={`${formatDate(enc.admissionDate)} · ${enc.primaryDiagnosis || 'Hospital stay'}`} onPress={() => navigation.navigate('RecordDetail', { encounterId: enc.uuid })} last={i === all.length - 1} />)}</Card></>}
    {lastSynced && <Text style={[T.meta, { marginTop: 12 }]}>Last updated {formatDateTime(lastSynced.toISOString())}</Text>}
    </View>
  </ScrollView>
  {currentEncounter && (
    <View testID="cora-dock" style={{ paddingHorizontal: 22, paddingVertical: 8, alignItems: 'flex-end', backgroundColor: C.paper }}>
      <CoraFloatingPill
        onPress={() => {
          setCoraQuery(undefined);
          setCoraOpen(true);
        }}
      />
    </View>
  )}
  <CoraAssistantModal
    visible={coraOpen}
    onClose={() => setCoraOpen(false)}
    encounter={currentEncounter}
    navigation={navigation}
    initialQuery={coraQuery}
  />
  </Screen>;
}
