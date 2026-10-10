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
import { C, Card, EmptyState, ErrorState, Expandable, Hero, LedgerRow, LoadingState, RefreshNotice, Row, Screen, SectionHeader, Stepper, T } from '../components/ui';

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
    { label: readyToPay ? 'Pay' : 'Payments', icon: 'payments', disabled: readyToPay && (!!error || !net.connected || loading), onPress: () => readyToPay ? navigation.navigate('PaymentFlow', { encounterId: currentEncounter!.uuid }) : navigation.navigate('Payments') },
    { label: 'Documents', icon: 'file', onPress: () => navigation.navigate('Documents') }
  ];
  return <Screen gutter={0} topSpacing={0} safeBottom={false} background={C.paper}><ScrollView contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} contentContainerStyle={{ paddingBottom: 0 }} refreshControl={<RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} tintColor={C.brand} />} showsVerticalScrollIndicator={false}>
    <View style={{ backgroundColor: C.hero, minHeight: 237, paddingHorizontal: 25, paddingTop: 28, paddingBottom: 126 }}>
      <Text style={{ color: C.heroSub, fontSize: 13 }}>Good day,</Text>
      <Text accessibilityRole="header" style={{ color: C.surface, fontSize: 22, fontWeight: '600', marginTop: 4 }}>{patient?.fullName || firstName(patient?.fullName)}</Text>
      <Text style={{ color: C.heroSub, fontSize: 12, marginTop: 8 }}>{facility}</Text>
    </View>
    <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 22, paddingBottom: 28, minHeight: 560 }}>
      <View style={{ marginTop: -100, marginBottom: 20 }}><Hero eyebrow={cleared ? 'Discharge status' : currentEncounter ? 'Remaining hospital balance' : 'Your hospital account'} figure={cleared ? 'Cleared to leave' : currentEncounter ? formatPeso(owe) : 'No current statement'} trailing={<Icon name="chevron" size={20} color={C.surface} />} onPress={() => navigation.navigate(cleared ? 'Documents' : 'Bill')} a11y={cleared ? 'View discharge pass' : currentEncounter ? 'Review hospital balance' : 'View hospital bills'} minHeight={224}>
        <QuickActions actions={actions} integrated />
      </Hero></View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
            <SectionHeader title="Your discharge journey" />
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
                paddingVertical: 4,
                paddingHorizontal: 8,
                backgroundColor: '#F0FDF4',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#BBF7D0'
              }}
            >
              <Sparkles size={13} color={C.brand} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.brandDark }}>Ask Cora</Text>
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
    <CoraFloatingPill
      onPress={() => {
        setCoraQuery(undefined);
        setCoraOpen(true);
      }}
      style={{ position: 'absolute', bottom: 20, right: 18, zIndex: 100 }}
    />
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
