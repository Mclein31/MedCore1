import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { paymentAttempts } from '../lib/paymentAttempts';
import type { PendingPayment } from '../lib/paymentAttemptStore';
import type { PaymentRecord, ReceiptRecord } from '../types/domain';
import type { PromissoryNoteRecord } from '../services/paymentApi';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { ApiError } from '../lib/api';
import { parsePaymentAmount, validatePaymentAmount } from '../lib/guards';
import type { PayInput } from '../services/paymentApi';
import { useAuth } from '../lib/auth';
import { usePatient } from '../hooks/usePatient';
import { createPaymentApi } from '../services/paymentApi';
import { ASSETS } from '../lib/assets';
import { PAYMENT_METHODS, methodForRail } from '../lib/paymentMethods';
import { estimatedFirstDueDate, previewInstallments } from '../lib/promissory';
import { generateIdempotencyKey } from '../lib/idempotency';
import { describeRail, formatDate, formatDateTime, formatPeso, remainingBalance } from '../lib/format';
import { Icon, ProviderMark } from '../components/icons';
import { C, Card, EmptyState, ErrorState, Field, LoadingState, RefreshNotice, Hero, LedgerRow, PrimaryButton, Screen, SecondaryButton, SegControl, StatusBadge, T } from '../components/ui';

type Step = 'amount' | 'method' | 'detail' | 'done';
type Mode = 'FULL' | 'PARTIAL';

const RELATIONSHIPS = ['PATIENT', 'SPOUSE', 'CHILD', 'GUARANTOR'] as const;
const ID_TYPES = [
  { id: 'PHILSYS_NATIONAL_ID', label: 'PhilSys ID' },
  { id: 'UMID', label: 'UMID' },
  { id: 'DRIVERS_LICENSE', label: "Driver's License" },
  { id: 'PASSPORT', label: 'Passport' }
] as const;

function Chip({ label, sub, selected, onPress, a11y, disabled }: {
  label: string; sub?: string; selected: boolean; onPress: () => void; a11y?: string; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y || label}
      style={{
        flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center',
        borderWidth: 1.5, borderColor: selected ? C.brand : C.border,
        backgroundColor: selected ? C.brandSoft : C.surface
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? C.hero : C.ink, textAlign: 'center' }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 12, color: C.secondary, marginTop: 2, fontVariant: ['tabular-nums'] }}>{sub}</Text> : null}
    </Pressable>
  );
}

function DemoBanner() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.warningBg, borderWidth: 1, borderColor: '#F3D9A8', borderRadius: 14, padding: 12 }}>
      <Icon name="warning" size={18} color={C.warning} />
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: C.warning }}>Demo checkout — no real money moves.</Text>
    </View>
  );
}

export default function PaymentFlowScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'PaymentFlow'>) {
  const { client, user } = useAuth();
  const { currentEncounter: latestEncounter, encounters, loading, error: patientError, refresh } = usePatient();
  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [recovering, setRecovering] = useState(true);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const selectedId = useRef(route.params?.encounterId);
  const account = user!.id;
  const restoreAttempt = useCallback(async () => {
    setRecovering(true); setRecoveryError(null);
    try { setPending(await paymentAttempts.restore(account)); }
    catch (e: unknown) { setRecoveryError(e instanceof Error ? e.message : 'We could not safely recover your previous payment. Please contact hospital billing.'); }
    finally { setRecovering(false); }
  }, [account]);
  useEffect(() => { void restoreAttempt(); }, [restoreAttempt]);
  if (!selectedId.current && latestEncounter) selectedId.current = latestEncounter.uuid;
  const currentEncounter = encounters.find((enc) => enc.uuid === (pending?.encounterId || selectedId.current)) ?? null;
  const [step, setStep] = useState<Step>('amount');
  const [mode, setMode] = useState<Mode>('FULL');
  const [partial, setPartial] = useState('');
  const [rail, setRail] = useState('QR_PH');
  const [payerName, setPayerName] = useState(user?.fullName || '');
  const [mobile, setMobile] = useState('');
  const [cardBrand, setCardBrand] = useState('VISA');
  const [cardLast4, setCardLast4] = useState('');
  const [bankName, setBankName] = useState('');
  // promissory state
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const [borrowerName, setBorrowerName] = useState(user?.fullName || '');
  const [relationship, setRelationship] = useState<typeof RELATIONSHIPS[number]>('PATIENT');
  const [idType, setIdType] = useState<typeof ID_TYPES[number]['id']>('PHILSYS_NATIONAL_ID');
  const [idNumber, setIdNumber] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<(PaymentRecord & Partial<ReceiptRecord> & { methodRail: string }) | null>(null);
  const [note, setNote] = useState<(PromissoryNoteRecord & { scheduleJson?: number[] }) | null>(null);
  const [passIssued, setPassIssued] = useState(false);
  const attemptKey = useRef('');
  const submissionLock = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const headerHeight = useHeaderHeight();
  usePreventRemove(busy, () => { setError('Please wait for the hospital to confirm this request.'); });

  const balance = currentEncounter ? remainingBalance(currentEncounter) : 0;
  const amountError = mode === 'PARTIAL' ? validatePaymentAmount(partial, balance) : null;
  const amount = mode === 'FULL' ? balance : (parsePaymentAmount(partial) ?? 0);
  const amountValid = !amountError && Number.isFinite(amount) && amount > 0 && amount <= balance;
  const method = methodForRail(rail);
  const plan = useMemo(() => previewInstallments(amountValid ? amount : 0, months), [amount, amountValid, months]);

  function resetKey() {
    attemptKey.current = '';
  }

  async function submitPayment() {
    if (!currentEncounter || submissionLock.current) return;
    if (!pending && (!amountValid || payerName.trim().length < 2)) return;
    if (!paymentAttempts.begin(account)) return;
    submissionLock.current = true; // Lock before UUID generation or any await.
    setBusy(true);
    setError(null);
    let sent = false;
    let savedThisAttempt = false;
    let previous: PendingPayment | null = null;
    let key = attemptKey.current;
    try {
      previous = await paymentAttempts.restore(account);
      setPending(previous);
      if (previous && previous.encounterId !== currentEncounter.uuid) throw new Error('Recover the pending payment for your previous stay before paying this bill.');
      key = previous?.key || key;
      if (!key) key = await generateIdempotencyKey();
      attemptKey.current = key;
      const input: PayInput = previous?.input ?? {
        amount: Math.round(amount * 100) / 100, paymentRail: rail, payerName: payerName.trim(),
        ...(mobile.trim() ? { payerContactMasked: `09**-***-${mobile.replace(/[^0-9]/g, '').slice(-4)}` } : {}),
        ...(rail === 'CREDIT_DEBIT_CARD' ? { cardBrand, cardLast4: cardLast4.trim() } : {}),
        ...(rail === 'BANK_TRANSFER' ? { bankName: bankName.trim() } : {})
      };
      const intent = { key, input, encounterId: currentEncounter.uuid };
      // Refuse to send if native secure storage cannot protect restart recovery.
      await paymentAttempts.save(account, intent);
      savedThisAttempt = true;
      setPending(intent);
      sent = true;
      const res = await createPaymentApi(client).pay(currentEncounter.uuid, input, key);
      if (!res.success || !res.payment?.id || res.payment.status !== 'SUCCESS' || !res.receipt?.officialReceiptNumber) {
        throw new ApiError('The hospital has not returned a confirmed receipt. Check your payment history before trying again.', 502, 'INVALID_RESPONSE');
      }
      setReceipt({ ...res.receipt, ...res.payment, methodRail: input.paymentRail });
      setPassIssued(!!res.dischargePass || !!res.encounter?.dischargePass);
      await paymentAttempts.complete(account, key).catch(() => {});
      setPending(null);
      setUncertain(false);
      setStep('done');
      await refresh();
    } catch (e: unknown) {
      const ambiguous = (!!previous || sent) && (!(e instanceof ApiError) || e.status === 0 || e.status >= 500 || e.status === 401 || e.code === 'INVALID_RESPONSE' || e.code === 'IDEMPOTENCY_CONFLICT');
      if (savedThisAttempt && !ambiguous && (!(e instanceof ApiError) || e.code !== 'IDEMPOTENCY_CONFLICT')) { await paymentAttempts.complete(account, key).catch(() => {}); setPending(null); resetKey(); }
      setUncertain(ambiguous);
      setError(ambiguous ? 'Confirmation is unavailable. Check your payments, or retry this same request. Do not start another payment for this amount.' : (e instanceof Error ? e.message : 'Payment could not be completed.'));
    } finally { paymentAttempts.end(account); submissionLock.current = false; setBusy(false); }
  }

  async function submitNote() {
    if (!currentEncounter || !amountValid || submissionLock.current || uncertain || !acknowledged || borrowerName.trim().length < 2 || idNumber.trim().length < 4) return;
    submissionLock.current = true;
    setBusy(true);
    setError(null);
    try {
      const api = createPaymentApi(client);
      const res = await api.createPromissoryNote(currentEncounter.uuid, {
        borrowerName: borrowerName.trim(),
        borrowerRelationship: relationship,
        borrowerIdType: idType,
        borrowerIdNumber: idNumber.trim(),
        installmentMonths: months,
        principalAmount: Math.round(amount * 100) / 100
      });
      if (!res.success || !res.promissoryNote?.id) throw new ApiError('The hospital did not return a confirmed note.', 502, 'INVALID_RESPONSE');
      setNote(res.promissoryNote);
      setPassIssued(!!res.dischargePass);
      setStep('done');
      refresh();
    } catch (e: unknown) {
      const ambiguous = !(e instanceof ApiError) || e.status === 0 || e.status >= 500;
      setUncertain(ambiguous);
      setError(ambiguous ? 'Confirmation is unavailable. Check your payment plans before submitting another note.' : e instanceof Error ? e.message : 'The note could not be completed.');
    } finally {
      submissionLock.current = false;
      setBusy(false);
    }
  }

  if (recovering) return <LoadingState message="Checking previous payment attempts…" />;
  if (recoveryError) return <ErrorState message={recoveryError} onRetry={restoreAttempt} />;
  if (loading && !currentEncounter) return <LoadingState message="Loading your balance…" />;
  if (patientError && !currentEncounter) return <ErrorState message={patientError} onRetry={refresh} />;
  if (!currentEncounter) return <Screen keyboard keyboardOffset={headerHeight}><EmptyState title="No bill to pay" detail="Your hospital statements will appear when a stay is linked to your account." /><SecondaryButton title="Go back" onPress={() => navigation.goBack()} /></Screen>;

  // ---- success views (backend-confirmed only)
  if (step === 'done' && (receipt || note)) {
    if (note) {
      const sched: number[] = note.scheduleJson || note.schedule || [];
      return (
        <Screen keyboard keyboardOffset={headerHeight}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 8 }}>
              <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.successBg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="success" size={40} color={C.success} />
              </View>
              <Text style={[T.title, { marginTop: 14 }]}>Demo promissory note recorded</Text>
              <Text style={[T.display, { marginTop: 6 }]}>{formatPeso(note.totalRepayment ?? note.principalAmount)}</Text>
              <Text style={[T.meta, { marginTop: 6 }]}>{`Note ${note.noteNumber} · 0% interest · ${note.installmentMonths} months`}</Text>
            </View>
            <Card flush>
              {sched.map((s: number, i: number) => (
                <LedgerRow key={i} title={`Month ${i + 1}`} value={formatPeso(s)} last={i === sched.length - 1} />
              ))}
            </Card>
            {passIssued && (
              <Card>
                <StatusBadge tone="ok" text="Discharge pass released" />
                <Text style={[T.body, { color: C.secondary, marginTop: 8 }]}>Show it from Documents at the lobby exit.</Text>
              </Card>
            )}
            <PrimaryButton title={passIssued ? 'View discharge pass' : 'View payments'} onPress={() => passIssued ? navigation.replace('Documents') : navigation.navigate('Main', { screen: 'Payments' })} />
            <View style={{ height: 24 }} />
          </ScrollView>
        </Screen>
      );
    }
    if (!receipt) return <ErrorState message="The hospital has not returned a confirmed receipt." onRetry={refresh} />;
    return (
      <Screen keyboard keyboardOffset={headerHeight}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 8 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.successBg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="success" size={40} color={C.success} />
            </View>
            <Text style={[T.title, { marginTop: 14 }]}>Demo payment recorded</Text>
            <Text style={[T.display, { marginTop: 6 }]}>{formatPeso(receipt.amount)}</Text>
            <Text style={[T.meta, { marginTop: 6 }]}>{`Demo receipt ${receipt.officialReceiptNumber || ''}`}</Text>
          </View>
          <Card flush>
            <LedgerRow title="Method" value={describeRail(receipt.methodRail || receipt.paymentRail || '')} />
            <LedgerRow title="Date" value={formatDateTime(receipt.issuedAt || receipt.settledAt || receipt.createdAt)} />
            <LedgerRow title="Reference" value={receipt.paymentReference || ''} />
            <LedgerRow title="Status" value="Demo · Recorded" tone="ok" last />
          </Card>
          {passIssued && (
            <Card>
              <StatusBadge tone="ok" text="Discharge pass released" />
              <Text style={[T.body, { color: C.secondary, marginTop: 8 }]}>Show it from Documents at the lobby exit.</Text>
            </Card>
          )}
          <PrimaryButton title={passIssued ? 'View discharge pass' : 'View payments'} onPress={() => passIssued ? navigation.replace('Documents') : navigation.navigate('Main', { screen: 'Payments' })} />
          <View style={{ height: 24 }} />
        </ScrollView>
      </Screen>
    );
  }

  if (currentEncounter.stage !== 'PENDING_SETTLEMENT' && !pending) return <Screen><EmptyState title="Your final bill is being reviewed" detail="Hospital clearance checks must finish before online settlement. You can review the running bill now." /><SecondaryButton title="Review bill" onPress={() => navigation.navigate('Main', { screen: 'Bill' })} /><SecondaryButton title="Go back" onPress={() => navigation.goBack()} /></Screen>;
  if (balance <= 0 && !pending) return <Screen><EmptyState title="No outstanding balance" detail="Review your payment history and discharge documents." /><SecondaryButton title="Go back" onPress={() => navigation.goBack()} /></Screen>;

  return (
    <Screen keyboard keyboardOffset={headerHeight}>
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <RefreshNotice error={patientError} onRetry={refresh} />
        {!!pending && step !== 'done' && <Card><Text style={T.body}>A previous payment of {formatPeso(pending?.input.amount)} via {describeRail(pending?.input.paymentRail || '')} is awaiting confirmation. Retry uses the same request.</Text><PrimaryButton title={busy ? 'Checking…' : 'Retry previous payment'} onPress={submitPayment} disabled={busy} /><SecondaryButton title="Check payment history" disabled={busy} onPress={() => navigation.navigate('Main', { screen: 'Payments' })} /></Card>}
        {step === 'amount' && (
          <View>
            <View style={{ marginTop: 8 }}>
              <Hero eyebrow="Remaining balance" figure={formatPeso(balance)} sub="Pay in full now, or choose a partial amount." />
            </View>
            <SegControl
              options={[{ key: 'FULL', label: 'Full settlement' }, { key: 'PARTIAL', label: 'Partial amount' }]}
              value={mode}
              disabled={busy || uncertain} onChange={(k) => { setMode(k as Mode); resetKey(); }}
            />
            {mode === 'PARTIAL' && (
              <Field editable={!busy && !uncertain} label="Amount to pay (₱)" value={partial} onChangeText={(t) => { setPartial(t); resetKey(); }} keyboard="numeric" error={partial ? amountError || undefined : undefined} a11y="Partial amount in pesos" />
            )}
            {!amountValid && mode === 'PARTIAL' && partial.length > 0 && (
              <Text style={{ color: C.danger }}>Enter an amount up to {formatPeso(balance)}.</Text>
            )}
            {error && <Text style={{ color: C.danger, marginTop: 4 }} accessibilityRole="alert">{error}</Text>}
            <PrimaryButton title={`Continue · ${amountValid ? formatPeso(amount) : formatPeso(0)}`} onPress={() => setStep('method')} disabled={!amountValid || !!patientError || !!pending} />
            <SecondaryButton title="Cancel" onPress={() => navigation.goBack()} />
          </View>
        )}

        {step === 'method' && (
          <View>
            <Text style={[T.eyebrow, { marginTop: 12 }]}>Paying {formatPeso(amount)}</Text>
            <Text style={[T.title, { marginTop: 4, marginBottom: 12 }]}>Choose payment method</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {PAYMENT_METHODS.map((m) => {
                const selected = rail === m.rail;
                return (
                  <Pressable
                    key={m.rail}
                    onPress={() => { setRail(m.rail); resetKey(); setError(null); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={m.label}
                    style={{
                      width: '48%', minHeight: 96, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', gap: 8,
                      borderWidth: 1.5, borderColor: selected ? C.brand : C.border,
                      backgroundColor: selected ? C.brandSoft : C.surface
                    }}
                  >
                    {m.hasLogo
                      ? <ProviderMark rail={m.rail} size={40} />
                      : <Icon name={m.rail === 'CREDIT_DEBIT_CARD' ? 'payments' : m.rail === 'BANK_TRANSFER' ? 'bank' : 'scale'} size={26} color={selected ? C.brand : C.secondary} />}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? C.hero : C.ink, textAlign: 'center' }}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[T.meta, { marginTop: 10 }]}>{methodForRail(rail).hint}</Text>
            {error && <Text style={{ color: C.danger, marginTop: 4 }} accessibilityRole="alert">{error}</Text>}
            <PrimaryButton title="Continue" onPress={() => setStep('detail')} />
            <SecondaryButton disabled={busy || uncertain} title="Back" onPress={() => setStep('amount')} />
          </View>
        )}

        {step === 'detail' && method.kind !== 'promissory' && (
          <View>
            <DemoBanner />
            {(method.kind === 'qr' || method.kind === 'wallet') && (
              <Card>
                <View style={{ alignItems: 'center' }}>
                  <Image
                    source={(ASSETS.demoQr as Record<string, number>)[rail]}
                    style={{ width: '100%', maxWidth: 240, aspectRatio: 1, borderRadius: 16 }}
                    accessibilityLabel={`Demo ${method.label} QR code. Demo only, no real payment.`}
                  />
                  <Text style={[T.title, { marginTop: 12 }]}>{formatPeso(amount)}</Text>
                  <Text style={[T.meta, { marginTop: 4, textAlign: 'center' }]}>
                    {rail === 'QR_PH'
                      ? 'This is a sample QR for demonstration. It cannot receive a real payment.'
                      : `Demo ${method.label} QR — scan with any QR scanner to verify it. No real money moves.`}
                  </Text>
                  <StatusBadge tone="warn" text="DEMO ONLY — NO REAL PAYMENT" />
                </View>
              </Card>
            )}
            {method.kind === 'card' && (
              <Card>
                <Text style={T.section}>Card details (demo)</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  {['VISA', 'MASTERCARD'].map((b) => (
                    <Chip disabled={busy || uncertain} key={b} label={b === 'VISA' ? 'Visa' : 'Mastercard'} selected={cardBrand === b} onPress={() => setCardBrand(b)} />
                  ))}
                </View>
                <Field editable={!busy && !uncertain} label="Last 4 digits" value={cardLast4} onChangeText={(t) => setCardLast4(t.replace(/[^0-9]/g, '').slice(0, 4))} keyboard="numeric" />
              </Card>
            )}
            {method.kind === 'bank' && (
              <Card>
                <Text style={T.section}>Bank transfer (demo)</Text>
                <Field editable={!busy && !uncertain} label="Bank name" value={bankName} onChangeText={setBankName} hint="e.g. BPI, BDO, UnionBank via InstaPay." />
              </Card>
            )}
            <Field editable={!busy && !uncertain} label="Payer name" value={payerName} onChangeText={setPayerName} />
            {(method.kind === 'wallet') && (
              <Field editable={!busy && !uncertain} label="Mobile number (optional)" value={mobile} onChangeText={setMobile} keyboard="phone-pad" hint="11 digits starting with 09." />
            )}
            {error && <Text style={{ color: C.danger, marginTop: 4 }} accessibilityRole="alert">{error}</Text>}
            <PrimaryButton
              title={busy ? 'Confirming with hospital…' : `Confirm payment · ${formatPeso(amount)}`}
              onPress={submitPayment}
              disabled={busy || !!patientError || payerName.trim().length < 2 || (method.kind === 'card' && cardLast4.length !== 4) || (method.kind === 'bank' && !bankName.trim()) || (method.kind === 'wallet' && mobile.trim().length > 0 && !/^09\d{9}$/.test(mobile.replace(/[\s-]/g, '')))}
            />
            <SecondaryButton disabled={busy || uncertain} title="Back" onPress={() => setStep('method')} />
            <Text style={[T.meta, { marginTop: 10 }]}>Success appears only after the hospital backend confirms. If confirmation is interrupted, retry the same request or check your payment history.</Text>
          </View>
        )}

        {step === 'detail' && method.kind === 'promissory' && (
          <View>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="scale" size={20} color={C.warning} />
                <Text style={T.section}>RA 9439 promissory note</Text>
              </View>
              <Text style={[T.body, { color: C.secondary, marginTop: 8 }]}>
                Medically cleared patients in non-private rooms may leave upon executing a 0% interest note. This authorizes exit clearance.
              </Text>
            </Card>
            <Text style={[T.eyebrow, { marginTop: 6 }]}>Repayment term · 0% interest</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              {([3, 6, 12] as const).map((m) => {
                const p = previewInstallments(amount, m);
                return <Chip disabled={busy || uncertain} key={m} label={`${m} mo`} sub={formatPeso(p.monthlyInstallment)} selected={months === m} onPress={() => setMonths(m)} />;
              })}
            </View>
            <Card>
              <LedgerRow title="Principal financed" value={formatPeso(plan.financedAmount)} />
              <LedgerRow title="Interest (RA 9439)" value="0%" tone="ok" />
              <LedgerRow title="Estimated first due" value={formatDate(estimatedFirstDueDate())} />
              <LedgerRow title="Total payable (estimated)" value={formatPeso(plan.totalRepayment)} last />
            </Card>
            <Field editable={!busy && !uncertain} label="Borrower / guarantor legal name" value={borrowerName} onChangeText={setBorrowerName} />
            <Text style={[T.eyebrow, { marginTop: 4 }]}>Relationship to patient</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              {RELATIONSHIPS.map((r) => (
                <View key={r} style={{ width: '48%' }}>
                  <Chip disabled={busy || uncertain} label={r.charAt(0) + r.slice(1).toLowerCase()} selected={relationship === r} onPress={() => setRelationship(r)} />
                </View>
              ))}
            </View>
            <Text style={[T.eyebrow, { marginTop: 14 }]}>Government ID</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              {ID_TYPES.map((t) => (
                <View key={t.id} style={{ width: '48%' }}>
                  <Chip disabled={busy || uncertain} label={t.label} selected={idType === t.id} onPress={() => setIdType(t.id)} />
                </View>
              ))}
            </View>
            <Field editable={!busy && !uncertain} label="ID number" value={idNumber} onChangeText={setIdNumber} />
            <Pressable
              disabled={busy || uncertain} onPress={() => setAcknowledged((a) => !a)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acknowledged }}
              accessibilityLabel="Acknowledge the promissory terms"
              style={{ flexDirection: 'row', gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginTop: 4 }}
            >
              <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: acknowledged ? C.brand : C.border, backgroundColor: acknowledged ? C.brand : C.surface, alignItems: 'center', justifyContent: 'center' }}>
                {acknowledged && <Icon name="check" size={15} color="#FFFFFF" />}
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: C.secondary, lineHeight: 19 }}>
                I acknowledge the terms of this demo repayment plan. Contact hospital billing to arrange an actual promissory agreement.
              </Text>
            </Pressable>
            {error && <Text style={{ color: C.danger, marginTop: 8 }} accessibilityRole="alert">{error}</Text>}{uncertain && <SecondaryButton title="Check payment plans" onPress={() => navigation.navigate('Main', { screen: 'Payments' })} />}
            <PrimaryButton
              title={busy ? 'Executing note…' : `Record demo note · ${formatPeso(amount)}`}
              onPress={submitNote}
              disabled={busy || uncertain || !!patientError || borrowerName.trim().length < 2 || idNumber.trim().length < 4 || !acknowledged}
            />
            <SecondaryButton disabled={busy || uncertain} title="Back" onPress={() => setStep('method')} />
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
