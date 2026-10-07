import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { usePatient } from '../hooks/usePatient';
import { useFacilityName } from '../hooks/useFacility';
import { useNetworkStatus } from '../lib/offline';
import { describeClaimStatus, describeDischargeStage, describeHmoStatus, formatDate, formatDateTime, formatPeso, hasHmo, remainingBalance } from '../lib/format';
import { Icon } from '../components/icons';
import { C, Card, EmptyState, ErrorState, Expandable, Hero, HeroBtn, LedgerRow, LoadingState, RefreshNotice, Row, Screen, SectionHeader, Stepper, T } from '../components/ui';

function firstName(full: string | undefined): string {
  if (!full) return 'there';
  return (full.includes(',') ? full.split(',')[1] : full).trim().split(/\s+/)[0] || 'there';
}
export default function HomeScreen({ navigation }: { navigation: any }) {
  const { patient, encounters, overview, currentEncounter, loading, error, lastSynced, refresh } = usePatient();
  const facility = useFacilityName();
  const net = useNetworkStatus();
  if (loading && !overview) return <LoadingState message="Loading your hospital account…" />;
  if (error && !overview) return <ErrorState message={error} onRetry={refresh} />;
  const checklist = overview?.dischargeChecklist || [];
  const firstOpen = checklist.findIndex((item) => !item.done);
  const steps = checklist.map((item, i) => ({ title: item.label, state: (item.done ? 'done' : i === firstOpen ? 'now' : 'todo') as 'done' | 'now' | 'todo' }));
  const owe = currentEncounter ? remainingBalance(currentEncounter) : 0;
  const cleared = currentEncounter?.stage === 'CLEARED_GATE_PASS';
  return <Screen><ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />} showsVerticalScrollIndicator={false}>
    <RefreshNotice error={error} onRetry={refresh} />
    {!net.connected && <Text style={[T.meta, { color: C.warning, marginVertical: 8 }]} accessibilityRole="alert">You're offline. Information last updated {lastSynced ? formatDateTime(lastSynced.toISOString()) : 'before this visit'} may be out of date.</Text>}
    <Text style={[T.meta, { marginTop: 12 }]}>Good day, {firstName(patient?.fullName)}</Text>
    <Text accessibilityRole="header" style={[T.title, { marginTop: 4 }]}>{facility}</Text>
    {currentEncounter ? <>
      <Text style={[T.meta, { marginTop: 6 }]}>Room {currentEncounter.roomBed} · Admitted {formatDate(currentEncounter.admissionDate)}</Text>
      <Hero eyebrow={cleared ? 'Your discharge status' : 'Remaining hospital balance'} figure={cleared ? 'Cleared to leave' : formatPeso(owe)} sub={describeDischargeStage(currentEncounter.stage)}>
        {!cleared && owe > 0 && <HeroBtn title="Pay balance" onPress={() => navigation.navigate('PaymentFlow', { encounterId: currentEncounter.uuid })} disabled={!!error || !net.connected || currentEncounter.stage !== 'PENDING_SETTLEMENT'} />}
        <HeroBtn title={cleared ? 'View discharge pass' : 'Review bill'} ghost={!cleared && owe > 0} onPress={() => navigation.navigate(cleared ? 'Documents' : 'Bill')} />
      </Hero>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {[{ label: 'Bills', icon: 'bill', route: 'Bill' }, { label: 'Coverage', icon: 'coverage', route: 'Coverage' }, { label: 'Payments', icon: 'payments', route: 'Payments' }, { label: 'Documents', icon: 'file', route: 'Documents' }].map(action => <Pressable key={action.label} onPress={() => navigation.navigate(action.route)} accessibilityRole="button" accessibilityLabel={`Open ${action.label.toLowerCase()}`} style={({ pressed }) => ({ flex: 1, minWidth: 64, alignItems: 'center', paddingVertical: 12, opacity: pressed ? 0.6 : 1, gap: 8 })}>
          <View accessible={false} style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: C.brandSoft, justifyContent: 'center', alignItems: 'center' }}><Icon name={action.icon} color={C.brand} /></View>
          <Text style={[T.meta, { color: C.ink, textAlign: 'center' }]}>{action.label}</Text>
        </Pressable>)}
      </View>
      {(overview?.alerts?.length ?? 0) > 0 && <>
        <SectionHeader title="Latest from your hospital" action={<Pressable onPress={() => navigation.navigate('Notifications')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: C.brand, fontWeight: '600' }}>All updates</Text></Pressable>} />
        {(overview?.alerts || []).slice(0, 2).map((item, i) => <View key={`${item.timestamp}-${i}`} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}><Text style={T.section}>{item.title}</Text><Text style={[T.meta, { marginTop: 4 }]}>{item.message}</Text>{item.timestamp && <Text style={[T.meta, { marginTop: 4 }]}>{formatDateTime(item.timestamp)}</Text>}</View>)}
      </>}
      <SectionHeader title="Coverage applied to your bill" />
      <Card flush>
        <LedgerRow title="PhilHealth" sub={describeClaimStatus(currentEncounter.philhealth?.status || '').title} value={formatPeso(currentEncounter.waterfall.philhealthTotal)} onPress={() => navigation.navigate('Coverage')} />
        <LedgerRow title={hasHmo(currentEncounter) ? currentEncounter.hmo.providerName : 'No HMO on file'} sub={hasHmo(currentEncounter) ? describeHmoStatus(currentEncounter.hmo.finalLoaStatus).title : 'Contact billing to add coverage details'} value={formatPeso(currentEncounter.waterfall.hmoApprovedAmount)} onPress={() => navigation.navigate('Coverage')} last />
      </Card>
      {steps.length > 0 && <><SectionHeader title="Your discharge journey" /><View style={{ paddingVertical: 8 }}><Stepper steps={steps} /></View></>}
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
  </ScrollView></Screen>;
}
