import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { usePatient } from '../hooks/usePatient';
import { describeClaimStatus, describeHmoStatus, formatPeso, hasHmo, remainingBalance } from '../lib/format';
import { C, Card, EmptyState, ErrorState, LoadingState, RefreshNotice, Row, Screen, SectionHeader, StatusBadge, T } from '../components/ui';
export default function CoverageScreen() {
  const { currentEncounter: enc, loading, error, refresh } = usePatient();
  if (loading && !enc) return <LoadingState message="Loading your coverage…" />;
  if (error && !enc) return <ErrorState message={error} onRetry={refresh} />;
  if (!enc) return <Screen><EmptyState title="No coverage yet" detail="PhilHealth and HMO details will appear when a hospital stay is linked." /></Screen>;
  const w = enc.waterfall; const ph = enc.philhealth; const hmo = enc.hmo;
  const claim = describeClaimStatus(ph?.status || ''); const insurance = describeHmoStatus(hmo?.finalLoaStatus || '');
  return <Screen><ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />} showsVerticalScrollIndicator={false}>
    <RefreshNotice error={error} onRetry={refresh} />
    <Text accessibilityRole="header" style={[T.title, { marginTop: 12 }]}>Your coverage</Text><Text style={[T.meta, { marginTop: 6 }]}>Benefits applied to {enc.encounterNumber}. Your hospital confirms eligibility and authorization.</Text>
    <SectionHeader title="Benefits applied" /><Card><Row label="PhilHealth" value={formatPeso(w.philhealthTotal)} /><Row label="HMO" value={formatPeso(w.hmoApprovedAmount)} /><Row label="Statutory discounts" value={formatPeso(w.vatExemption + w.seniorPwdDiscount)} /><Row label="Your responsibility" value={formatPeso(w.netPatientDue)} /><Row label="Remaining balance" value={formatPeso(remainingBalance(enc))} bold /></Card>
    <SectionHeader title="PhilHealth" /><Card><StatusBadge tone={ph?.status === 'DENIED' ? 'bad' : ph?.status === 'RETURNED' ? 'warn' : ph?.status === 'PAID' || ph?.status === 'APPROVED' ? 'ok' : 'info'} text={claim.title} /><Text style={[T.body, { color: C.secondary, marginTop: 12 }]}>{claim.detail}</Text><View style={{ marginTop: 12 }}><Row label="Benefit applied" value={formatPeso(w.philhealthTotal)} /><Row label="Case rate" value={ph?.caseRateCode || 'Not provided'} /></View></Card>
    <SectionHeader title="HMO authorization" />{hasHmo(enc) ? <Card><Text style={T.section}>{hmo.providerName}</Text><View style={{ marginTop: 12 }}><StatusBadge tone={hmo.finalLoaStatus === 'APPROVED' ? 'ok' : hmo.finalLoaStatus === 'REJECTED' ? 'bad' : 'warn'} text={insurance.title} /></View><Text style={[T.body, { color: C.secondary, marginTop: 12 }]}>{insurance.detail}</Text><Row label="Approved benefit" value={formatPeso(hmo.approvedAmount)} /><Row label="Remaining benefit limit" value={formatPeso(hmo.mblRemaining)} /><Row label="Daily room allowance" value={formatPeso(hmo.dailyRoomAllowance)} />{hmo.loaNumber && <Row label="Authorization number" value={hmo.loaNumber} />}
      {hmo.disallowedConsumables > 0 && <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}><StatusBadge tone="warn" text="Some supplies are excluded" /><Text style={[T.body, { marginTop: 8 }]}>Your HMO excludes {formatPeso(hmo.disallowedConsumables)} in supplies. Review the itemized bill for each coverage reason, or contact hospital billing with a question.</Text></View>}
    </Card> : <Text style={T.body}>No HMO is recorded for this stay. Contact the hospital billing desk if you have coverage to add.</Text>}
  </ScrollView></Screen>;
}
