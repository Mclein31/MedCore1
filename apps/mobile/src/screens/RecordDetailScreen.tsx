import { usePullRefresh } from '../hooks/usePullRefresh';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useResource } from '../hooks/useResource';
import { createPaymentApi } from '../services/paymentApi';
import { createPatientApi } from '../services/patientApi';
import { describeDischargeStage, formatDate, formatDateTime, formatPeso } from '../lib/format';
import ReceiptSheet from '../components/ReceiptSheet';
import BillBreakdown from '../components/BillBreakdown';
import { C, Card, ConfirmationModal, ErrorState, LoadingState, RefreshNotice, Row, Screen, SecondaryButton, SectionHeader, StatusBadge, T } from '../components/ui';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

export default function RecordDetailScreen({ route }: NativeStackScreenProps<RootStackParamList, 'RecordDetail'>) {
  const { client } = useAuth();
  const { encounterId, documentKind, documentId } = route.params;
  const load = useCallback(async () => {
    const api = createPaymentApi(client);
    const [encounter, receipts, notes] = await Promise.all([
      createPatientApi(client).getEncounter(encounterId),
      documentKind === 'RECEIPT' ? api.getReceipts() : Promise.resolve({ items: [] }),
      documentKind === 'PROMISSORY_NOTE' ? api.listPromissoryNotes() : Promise.resolve({ items: [] })
    ]);
    if (documentKind === 'GATE_PASS' && documentId !== encounter.dischargePass?.passNumber) throw new Error('This historical discharge pass is no longer the current pass. Contact hospital billing to review it.');
    const receipt = receipts.items.find((item) => item.id === documentId || item.officialReceiptNumber === documentId);
    const note = notes.items.find((item) => item.id === documentId || item.noteNumber === documentId);
    if (documentKind === 'RECEIPT' && (!receipt || receipt.encounterNumber !== encounter.encounterNumber)) throw new Error('This receipt is not available for this stay.');
    if (documentKind === 'PROMISSORY_NOTE' && (!note || note.encounterNumber !== encounter.encounterNumber)) throw new Error('This payment plan is not available for this stay.');
    return { encounter, receipt, note };
  }, [client, encounterId, documentKind, documentId]);
  const { data, loading, error, refresh } = useResource(load);
  const pullRefresh = usePullRefresh(refresh);
  const enc = data?.encounter;
  const [shareOpen, setShareOpen] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  if (loading && !enc) return <LoadingState message="Loading your hospital record…" />;
  if (!enc) return <ErrorState message={error || 'This record is not available.'} onRetry={refresh} />;
  const pass = enc.dischargePass;
  const passActive = pass?.status === 'ACTIVE_READY_FOR_EXIT';
  async function shareSummary() {
    setShareOpen(false); setShareError(null);
    try { await Share.share({ message: `MedCore hospital stay ${enc!.encounterNumber}\nAdmitted ${formatDate(enc!.admissionDate)}\nPatient responsibility: ${formatPeso(enc!.waterfall.netPatientDue)}\nFor a full statement, contact the hospital billing desk.` }); }
    catch { setShareError('Sharing is unavailable. Please try again.'); }
  }
  return <Screen><ScrollView contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} />} showsVerticalScrollIndicator={false}>
    <RefreshNotice error={error} onRetry={refresh} />
    <Text style={[T.title, { marginTop: 12 }]}>{enc.encounterNumber}</Text><Text style={[T.meta, { marginTop: 6 }]}>Admitted {formatDate(enc.admissionDate)} · Room {enc.roomBed}</Text>
    {pass && <><SectionHeader title="Your discharge pass" /><Card><StatusBadge tone={passActive ? 'ok' : pass.status === 'VERIFIED_AT_LOBBY' ? 'info' : 'warn'} text={passActive ? 'Ready for exit' : pass.status === 'VERIFIED_AT_LOBBY' ? 'Exit already verified' : 'Pass no longer active'} /><Row label="Pass number" value={pass.passNumber} />{pass.exitPin && passActive && <View style={{ paddingVertical: 20 }}><Text style={T.meta}>Exit PIN</Text><Text selectable style={[T.display, { marginTop: 6, letterSpacing: 4 }]}>{pass.exitPin}</Text></View>}<Text style={[T.body, { marginTop: 8 }]}>{passActive ? 'Show this pass number and exit PIN to lobby staff. Keep the PIN private.' : 'This pass cannot be used for exit. Contact hospital billing if you need a current pass.'}</Text><Row label="Issued" value={formatDateTime(pass.issuedAt)} /></Card></>}
    {documentKind === 'GATE_PASS' && !pass && <Text style={[T.body, { color: C.warning, marginTop: 12 }]}>No discharge pass is available for this stay. Contact your hospital billing desk.</Text>}
    {data?.receipt && <View testID="historical-payment-ticket" style={{ backgroundColor: C.paper, paddingHorizontal: 16, borderRadius: 12, marginTop: 16 }}><ReceiptSheet surroundingColor={C.paper} number={data.receipt.officialReceiptNumber} amount={data.receipt.amount} rail={data.receipt.paymentRail} payer={data.receipt.payerName} date={data.receipt.issuedAt} reference={data.receipt.paymentReference} bill={data.receipt.billReference || enc.billNumber || enc.encounterNumber} patient={data.receipt.patientName} mrn={data.receipt.patientMrn} status={data.receipt.status} /></View>}
    {data?.note && <><SectionHeader title="Selected payment plan" /><Card><Row label="Note number" value={data.note.noteNumber} /><Row label="Principal" value={formatPeso(data.note.principalAmount)} /><Row label="First due date" value={formatDate(data.note.firstDueDate)} />{data.note.schedule.map((amount, i) => <Row key={i} label={`Month ${i + 1}`} value={formatPeso(amount)} />)}</Card></>}
    <SectionHeader title="Hospital stay" /><Row label="Doctor" value={enc.attendingDoctor || 'Not provided'} /><Row label="Diagnosis on file" value={enc.primaryDiagnosis || 'Not provided'} /><Text style={[T.meta, { marginVertical: 12 }]}>{describeDischargeStage(enc.stage)}</Text>
    {enc.promissoryNote && <><SectionHeader title="Payment plan" /><Card><Row label="Principal financed" value={formatPeso(enc.promissoryNote.principalAmount)} /><Row label="Repayment term" value={`${enc.promissoryNote.installmentMonths} months`} /><Row label="Monthly installment" value={formatPeso(enc.promissoryNote.monthlyInstallment)} /><Text style={[T.meta, { marginTop: 8 }]}>View the complete repayment schedule in Payments.</Text></Card></>}
    <BillBreakdown encounter={enc} />
    {enc.disputes?.length > 0 && <><SectionHeader title="Billing questions" />{enc.disputes.map((issue) => <View key={issue.id} style={{ borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 12 }}><Text style={T.section}>{issue.itemDescription}</Text><Text style={[T.body, { marginTop: 6 }]}>{issue.reason}</Text><Row label="Amount questioned" value={formatPeso(issue.contestedAmount)} />{issue.resolutionClause && <Text style={T.meta}>{issue.resolutionClause}</Text>}</View>)}</>}
    {enc.timeline?.length > 0 && <><SectionHeader title="Stay updates" />{enc.timeline.map((event) => <View key={event.id} style={{ borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 12 }}><Text style={T.section}>{event.title}</Text><Text style={[T.meta, { marginTop: 4 }]}>{event.description}</Text><Text style={[T.meta, { marginTop: 4 }]}>{formatDateTime(event.timestamp)}</Text></View>)}</>}
    <SecondaryButton title="Share a billing summary" onPress={() => setShareOpen(true)} />{shareError && <Text style={[T.meta, { color: C.danger }]} accessibilityRole="alert">{shareError}</Text>}
  </ScrollView><ConfirmationModal visible={shareOpen} title="Share your billing summary?" detail="The summary includes your stay reference, admission date and patient responsibility. Share only with someone you trust. Your exit PIN is excluded." confirmLabel="Open share sheet" onConfirm={shareSummary} onCancel={() => setShareOpen(false)} /></Screen>;
}
