import { usePullRefresh } from '../hooks/usePullRefresh';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { readSavedPass,parseSavedPass,reconcileSavedPass } from '../lib/gatePassCache';
import { paymentAccountNamespace } from '../lib/mobileAccess';
import { ApiError } from '../lib/api';
import GatePassCard from '../components/GatePassCard';
import { useAuth } from '../lib/auth';
import { useResource } from '../hooks/useResource';
import { createPaymentApi } from '../services/paymentApi';
import { createPatientApi } from '../services/patientApi';
import { describeDischargeStage, formatDate, formatDateTime, formatPeso } from '../lib/format';
import { Sparkles } from 'lucide-react-native';
import ReceiptSheet from '../components/ReceiptSheet';
import BillBreakdown from '../components/BillBreakdown';
import { CoraAssistantModal } from '../components/CoraAssistantModal';
import { C, Card, ConfirmationModal, ErrorState, LoadingState, RefreshNotice, Row, Screen, SecondaryButton, SectionHeader, T } from '../components/ui';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

export default function RecordDetailScreen({ route }: NativeStackScreenProps<RootStackParamList, 'RecordDetail'>) {
  const { client, user, selectedPatientId } = useAuth();
  const { encounterId, documentKind, documentId } = route.params;
  const [coraOpen, setCoraOpen] = useState(false);
  const load = useCallback(async () => {
    const api = createPaymentApi(client);
    try {
    const [encounter, receipts, notes] = await Promise.all([
      createPatientApi(client).getEncounter(encounterId),
      documentKind === 'RECEIPT' ? api.getReceipts() : Promise.resolve({ items: [] }),
      documentKind === 'PROMISSORY_NOTE' ? api.listPromissoryNotes() : Promise.resolve({ items: [] })
    ]);
    if(user)await reconcileSavedPass(user.id,paymentAccountNamespace(user,selectedPatientId||undefined),encounter.uuid,encounter).catch(()=>{});
    if (documentKind === 'GATE_PASS' && documentId !== encounter.dischargePass?.passNumber) return {encounter:null,receipt:undefined,note:undefined,offlinePass:null,invalidPass:'This historical discharge pass is no longer the current pass. Contact hospital billing to review it.',confirmedAt:0};
    const receipt = receipts.items.find((item) => item.id === documentId || item.officialReceiptNumber === documentId);
    const note = notes.items.find((item) => item.id === documentId || item.noteNumber === documentId);
    if (documentKind === 'RECEIPT' && (!receipt || receipt.encounterNumber !== encounter.encounterNumber)) throw new Error('This receipt is not available for this stay.');
    if (documentKind === 'PROMISSORY_NOTE' && (!note || note.encounterNumber !== encounter.encounterNumber)) throw new Error('This payment plan is not available for this stay.');
    return { encounter, receipt, note, offlinePass:null,invalidPass:null,confirmedAt:Date.now() };
    } catch(error) {
      if(error instanceof ApiError&&[403,404].includes(error.status)) {
        if(user)void reconcileSavedPass(user.id,paymentAccountNamespace(user,selectedPatientId||undefined),encounterId,null).catch(()=>{});
        return {encounter:null,receipt:undefined,note:undefined,offlinePass:null,invalidPass:error.message,confirmedAt:0};
      }
      if(documentKind!=='GATE_PASS'||!(error instanceof ApiError)||error.status!==0||!['NETWORK_ERROR','TIMEOUT'].includes(error.code||'')||!user)throw error;
      const saved=await readSavedPass(user.id,paymentAccountNamespace(user,selectedPatientId||undefined));
      if(!saved||saved.pass.passNumber!==documentId||![saved.encounterId,saved.encounterNumber].includes(encounterId))return {encounter:null,receipt:undefined,note:undefined,offlinePass:null,invalidPass:'No valid saved discharge pass is available. Reconnect to refresh it.',confirmedAt:0};
      return {encounter:null,receipt:undefined,note:undefined,offlinePass:saved,invalidPass:null,confirmedAt:saved.savedAt};
    }
  }, [client, encounterId, documentKind, documentId, user, selectedPatientId]);
  const { data, loading, error, refresh } = useResource(load, 5000);
  const pullRefresh = usePullRefresh(refresh);
  const enc = data?.encounter;
  const [shareOpen, setShareOpen] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  if (loading && !enc && !data?.offlinePass) return <LoadingState message="Loading your hospital record…" />;
  if(data?.invalidPass)return <ErrorState message={data.invalidPass} onRetry={refresh}/>;
  if(data?.offlinePass&&!parseSavedPass(JSON.stringify(data.offlinePass),paymentAccountNamespace(user!,selectedPatientId||undefined)))return <ErrorState message="The saved discharge pass expired. Reconnect to refresh it." onRetry={refresh}/>;
  if(data?.offlinePass)return <Screen><ScrollView contentContainerStyle={{paddingBottom:32}}><SectionHeader title={data.offlinePass.encounterNumber}/><GatePassCard pass={data.offlinePass.pass} offline/></ScrollView></Screen>;
  if (!enc) return <ErrorState message={error || 'This record is not available.'} onRetry={refresh} />;
  const pass = enc.dischargePass;
  const passFresh=Date.now()-(data?.confirmedAt||0)<=86400000;
  if(documentKind==='GATE_PASS'&&pass&&!passFresh)return <ErrorState message="Reconnect to refresh this discharge pass." onRetry={refresh}/>;
  async function shareSummary() {
    setShareOpen(false); setShareError(null);
    try { await Share.share({ message: `MedCore hospital stay ${enc!.encounterNumber}\nAdmitted ${formatDate(enc!.admissionDate)}\nPatient responsibility: ${formatPeso(enc!.waterfall.netPatientDue)}\nFor a full statement, contact the hospital billing desk.` }); }
    catch { setShareError('Sharing is unavailable. Please try again.'); }
  }
  return <Screen><ScrollView contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} />} showsVerticalScrollIndicator={false}>
    <RefreshNotice error={error} onRetry={refresh} />
    <Text style={[T.title, { marginTop: 12 }]}>{enc.encounterNumber}</Text><Text style={[T.meta, { marginTop: 6 }]}>Admitted {formatDate(enc.admissionDate)} · Room {enc.roomBed}</Text>
    {pass&&passFresh&&<><SectionHeader title="Your discharge pass"/><GatePassCard pass={pass}/></>}
    {documentKind === 'GATE_PASS' && !pass && <Text style={[T.body, { color: C.warning, marginTop: 12 }]}>No discharge pass is available for this stay. Contact your hospital billing desk.</Text>}
    {data?.receipt && <View testID="historical-payment-ticket" style={{ backgroundColor: C.receiptSurround, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginTop: 16 }}><ReceiptSheet surroundingColor={C.receiptSurround} number={data.receipt.officialReceiptNumber} amount={data.receipt.amount} rail={data.receipt.paymentRail} payer={data.receipt.payerName} date={data.receipt.issuedAt} reference={data.receipt.paymentReference} bill={data.receipt.billReference || enc.billNumber || enc.encounterNumber} patient={data.receipt.patientName} mrn={data.receipt.patientMrn} status={data.receipt.status} /></View>}
    {data?.note && <><SectionHeader title="Selected payment plan" /><Card><Row label="Note number" value={data.note.noteNumber} /><Row label="Principal" value={formatPeso(data.note.principalAmount)} /><Row label="First due date" value={formatDate(data.note.firstDueDate)} />{data.note.schedule.map((amount, i) => <Row key={i} label={`Month ${i + 1}`} value={formatPeso(amount)} />)}</Card></>}
    <SectionHeader title="Hospital stay" /><Row label="Doctor" value={enc.attendingDoctor || 'Not provided'} /><Row label="Diagnosis on file" value={enc.primaryDiagnosis || 'Not provided'} /><Text style={[T.meta, { marginVertical: 12 }]}>{describeDischargeStage(enc.stage)}</Text>
    <Pressable
      onPress={() => setCoraOpen(true)}
      accessibilityRole="button"
      accessibilityLabel="Ask Cora about this hospital stay"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginTop: 12,
        marginBottom: 8
      }}
    >
      <Sparkles size={16} color={C.brand} />
      <Text style={{ fontSize: 13, fontWeight: '700', color: C.brandDark }}>
        Ask Cora about these charges
      </Text>
    </Pressable>
    <BillBreakdown encounter={enc} />
    {enc.disputes?.length > 0 && <><SectionHeader title="Billing questions" />{enc.disputes.map((issue) => <View key={issue.id} style={{ borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 12 }}><Text style={T.section}>{issue.itemDescription}</Text><Text style={[T.body, { marginTop: 6 }]}>{issue.reason}</Text><Row label="Amount questioned" value={formatPeso(issue.contestedAmount)} />{issue.resolutionClause && <Text style={T.meta}>{issue.resolutionClause}</Text>}</View>)}</>}
    {enc.timeline?.length > 0 && <><SectionHeader title="Stay updates" />{enc.timeline.map((event) => <View key={event.id} style={{ borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 12 }}><Text style={T.section}>{event.title}</Text><Text style={[T.meta, { marginTop: 4 }]}>{event.description}</Text><Text style={[T.meta, { marginTop: 4 }]}>{formatDateTime(event.timestamp)}</Text></View>)}</>}
    <SecondaryButton title="Share a billing summary" onPress={() => setShareOpen(true)} />{shareError && <Text style={[T.meta, { color: C.danger }]} accessibilityRole="alert">{shareError}</Text>}
  </ScrollView>
  <ConfirmationModal visible={shareOpen} title="Share your billing summary?" detail="The summary includes your stay reference, admission date and patient responsibility. Share only with someone you trust. Your exit PIN is excluded." confirmLabel="Open share sheet" onConfirm={shareSummary} onCancel={() => setShareOpen(false)} />
  <CoraAssistantModal
    visible={coraOpen}
    onClose={() => setCoraOpen(false)}
    encounter={enc}
    initialQuery="Can you explain the itemized charges and deductions for this hospital stay?"
  />
  </Screen>;
}
