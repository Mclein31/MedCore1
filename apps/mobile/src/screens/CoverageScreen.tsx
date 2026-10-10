import { useState } from 'react';
import { usePullRefresh } from '../hooks/usePullRefresh';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { usePatient } from '../hooks/usePatient';
import { describeClaimStatus, describeHmoStatus, formatPeso, hasHmo, remainingBalance } from '../lib/format';
import { Sparkles, Camera } from 'lucide-react-native';
import { CoraAssistantModal } from '../components/CoraAssistantModal';
import { BenefitCardScannerModal } from '../components/BenefitCardScannerModal';
import { C, EmptyState, ErrorState, LoadingState, RefreshNotice, Row, Screen, SectionHeader, StatusBadge, T } from '../components/ui';
export default function CoverageScreen({ navigation }: { navigation?: any }) {
  const { currentEncounter: enc, loading, error, refresh } = usePatient();
  const pullRefresh = usePullRefresh(refresh);
  const [coraOpen, setCoraOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  if (loading && !enc) return <LoadingState message="Loading your coverage…" />;
  if (error && !enc) return <ErrorState message={error} onRetry={refresh} />;
  if (!enc) return <Screen safeBottom={false}><EmptyState title="No coverage yet" detail="PhilHealth and HMO details will appear when a hospital stay is linked." /></Screen>;
  const w = enc.waterfall; const ph = enc.philhealth; const hmo = enc.hmo;
  const claim = describeClaimStatus(ph?.status || ''); const insurance = describeHmoStatus(hmo?.finalLoaStatus || '');
  return <Screen safeBottom={false}><ScrollView contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} />} showsVerticalScrollIndicator={false}>
    <RefreshNotice error={error} onRetry={refresh} />
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
      <Pressable
        onPress={() => setCoraOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Ask Cora about my coverage"
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: '#F0FDF4',
          borderWidth: 1,
          borderColor: '#BBF7D0',
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 12
        }}
      >
        <Sparkles size={15} color={C.brand} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.brandDark }}>Ask Cora AI</Text>
      </Pressable>

      <Pressable
        onPress={() => setScannerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Scan Benefit Card or Gov ID with AI"
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: '#EFF6FF',
          borderWidth: 1,
          borderColor: '#BFDBFE',
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 12
        }}
      >
        <Camera size={15} color={C.blue} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.blueDark }}>Scan Card OCR</Text>
      </Pressable>
    </View>

    <SectionHeader title="Benefits applied" /><View style={{ paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border }}><Row label="PhilHealth" value={formatPeso(w.philhealthTotal)} /><Row label="HMO" value={formatPeso(w.hmoApprovedAmount)} /><Row label="Statutory discounts" value={formatPeso(w.vatExemption + w.seniorPwdDiscount)} /><Row label="Your responsibility" value={formatPeso(w.netPatientDue)} /><Row label="Remaining balance" value={formatPeso(remainingBalance(enc))} bold /></View>
    <SectionHeader title="PhilHealth" /><View style={{ paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: C.border }}><StatusBadge tone={ph?.status === 'DENIED' ? 'bad' : ph?.status === 'RETURNED' ? 'warn' : ph?.status === 'PAID' || ph?.status === 'APPROVED' || ph?.status === 'CLEAN' ? 'ok' : 'info'} text={claim.title} /><Text style={[T.body, { color: C.secondary, marginTop: 12 }]}>{claim.detail}</Text><View style={{ marginTop: 12 }}><Row label="Benefit applied" value={formatPeso(w.philhealthTotal)} /><Row label="Case rate" value={ph?.caseRateCode || 'Not provided'} /></View></View>
    <SectionHeader title="HMO authorization" />{hasHmo(enc) ? <View style={{ paddingBottom: 20 }}><Text style={T.cardTitle}>{hmo.providerName}</Text><View style={{ marginTop: 12 }}><StatusBadge tone={hmo.finalLoaStatus === 'APPROVED' ? 'ok' : hmo.finalLoaStatus === 'REJECTED' ? 'bad' : 'warn'} text={insurance.title} /></View><Text style={[T.body, { color: C.secondary, marginTop: 12 }]}>{insurance.detail}</Text><Row label="Approved benefit" value={formatPeso(hmo.approvedAmount)} /><Row label="Remaining benefit limit" value={formatPeso(hmo.mblRemaining)} /><Row label="Daily room allowance" value={formatPeso(hmo.dailyRoomAllowance)} />{hmo.loaNumber && <Row label="Authorization number" value={hmo.loaNumber} />}
      {hmo.disallowedConsumables > 0 && <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}><StatusBadge tone="warn" text="Some supplies are excluded" /><Text style={[T.body, { marginTop: 8 }]}>Your HMO excludes {formatPeso(hmo.disallowedConsumables)} in supplies. Review the itemized bill for each coverage reason, or contact hospital billing with a question.</Text></View>}
    </View> : <Text style={T.body}>No HMO is recorded for this stay. Contact the hospital billing desk if you have coverage to add.</Text>}
  </ScrollView>
  <CoraAssistantModal
    visible={coraOpen}
    onClose={() => setCoraOpen(false)}
    encounter={enc}
    navigation={navigation}
    initialQuery="Can you explain my PhilHealth and HMO coverage for this hospital stay?"
  />
  <BenefitCardScannerModal
    visible={scannerOpen}
    onClose={() => setScannerOpen(false)}
  />
  </Screen>;
}
