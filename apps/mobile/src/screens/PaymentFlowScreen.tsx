import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Keyboard, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { HeaderBack } from '../components/Header';
import PaymentAmountEntry from '../components/PaymentAmountEntry';
import PaymentQr from '../components/PaymentQr';
import ReceiptSheet from '../components/ReceiptSheet';
import { confirmedPayment, paymentDetailsValid, previousCheckoutStep, WALLET_PRESETS, type CheckoutStep } from '../lib/checkout';
import { PAYMENT_METHODS, methodForRail } from '../lib/paymentMethods';
import { estimatedFirstDueDate, previewInstallments } from '../lib/promissory';
import { generateIdempotencyKey } from '../lib/idempotency';
import { describeRail, formatDate, formatPeso, remainingBalance } from '../lib/format';
import { Icon, ProviderMark } from '../components/icons';
import { C, Card, EmptyState, ErrorState, Field, LoadingState, RefreshNotice, LedgerRow, PrimaryButton, Screen, SecondaryButton, StatusBadge, T } from '../components/ui';

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
      accessibilityState={{ checked: selected, selected, disabled: !!disabled }}
      accessibilityLabel={a11y || label}
      style={{
        flex: 1, minHeight: 48, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center',
        borderWidth: 1.5, borderColor: selected ? C.brand : C.border,
        backgroundColor: selected ? C.brandSoft : C.surface
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? C.hero : C.ink, textAlign: 'center' }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 12, color: C.secondary, marginTop: 2, fontVariant: ['tabular-nums'] }}>{sub}</Text> : null}
    </Pressable>
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
  const [step, setStep] = useState<CheckoutStep>('amount');
  const checkoutScroll = useRef<ScrollView>(null);
  const [mode, setMode] = useState<Mode>('FULL');
  const [partial, setPartial] = useState('');
  const [rail, setRail] = useState('QR_PH');
  const [payerName, setPayerName] = useState(user?.fullName || '');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [processingPhase, setProcessingPhase] = useState('Preparing your request');
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
  useEffect(() => { checkoutScroll.current?.scrollTo({ y: 0, animated: false }); }, [step, pending, error]);
  const [receipt, setReceipt] = useState<(PaymentRecord & Partial<ReceiptRecord> & { methodRail: string }) | null>(null);
  const [note, setNote] = useState<(PromissoryNoteRecord & { scheduleJson?: number[] }) | null>(null);
  const [passIssued, setPassIssued] = useState(false);
  const attemptKey = useRef('');
  const submissionLock = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      title: step === 'amount' ? 'Pay balance' : step === 'method' ? 'Payment methods' : step === 'review' ? 'Review payment' : step === 'verification' ? 'Wallet verification' : step === 'done' ? (receipt ? 'Receipt' : 'Payment plan') : methodForRail(rail).label,
      headerStyle: { backgroundColor: (step === 'amount' && !pending) || (step === 'done' && receipt) ? C.hero : C.surface },
      headerTintColor: (step === 'amount' && !pending) || (step === 'done' && receipt) ? C.surface : C.ink,
      statusBarStyle: (step === 'amount' && !pending) || (step === 'done' && receipt) ? 'light' : 'dark',
      headerLeft: () => <HeaderBack disabled={busy} dark={(step === 'amount' && !pending) || (step === 'done' && !!receipt)} onPress={() => {
        if (step === 'amount' || step === 'done' || pending || uncertain) navigation.goBack();
        else {
          const previous = previousCheckoutStep(step);
          if (previous === 'amount') setSelectedAmount(null);
          setStep(previous); setError(null);
        }
      }} />
    });
  }, [navigation, busy, step, pending, uncertain, receipt, rail]);
  usePreventRemove(busy, () => { setError('Please wait for the hospital to confirm this request.'); });
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (uncertain || step === 'amount' || step === 'done') return false;
      const previous = previousCheckoutStep(step);
      if (previous === 'amount') setSelectedAmount(null);
      setStep(previous); setError(null); return true;
    });
    return () => subscription.remove();
  }, [busy, uncertain, step]));

  const balance = currentEncounter ? remainingBalance(currentEncounter) : 0;
  const amountError = mode === 'PARTIAL' ? validatePaymentAmount(partial, balance) : null;
  const enteredAmount = mode === 'FULL' ? balance : (parsePaymentAmount(partial) ?? 0);
  const amount = selectedAmount ?? enteredAmount;
  const amountValid = !amountError && Number.isFinite(amount) && amount > 0 && amount <= balance;
  const method = methodForRail(rail);
  const plan = useMemo(() => previewInstallments(amountValid ? amount : 0, months), [amount, amountValid, months]);

  function goBack() {
    if (busy || uncertain) return;
    const previous = previousCheckoutStep(step);
    if (previous === 'amount') setSelectedAmount(null);
    setStep(previous); setError(null);
  }
  const detailsValid = paymentDetailsValid(rail, payerName, cardLast4, bankName);

  function resetKey() {
    attemptKey.current = '';
  }

  async function submitPayment() {
    if (!currentEncounter || submissionLock.current) return;
    if (!pending && (!amountValid || !detailsValid || uncertain || patientError)) return;
    if (!paymentAttempts.begin(account)) return;
    Keyboard.dismiss();
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
        ...(WALLET_PRESETS[rail] ? { payerContactMasked: WALLET_PRESETS[rail].contact } : {}),
        ...(rail === 'CREDIT_DEBIT_CARD' ? { cardBrand, cardLast4: cardLast4.trim() } : {}),
        ...(rail === 'BANK_TRANSFER' ? { bankName: bankName.trim() } : {})
      };
      const intent = { key, input, encounterId: currentEncounter.uuid };
      // Refuse to send if native secure storage cannot protect restart recovery.
      setProcessingPhase('Protecting your payment request');
      await paymentAttempts.save(account, intent);
      savedThisAttempt = true;
      setPending(intent);
      sent = true;
      setProcessingPhase('Waiting for hospital confirmation');
      const res = await createPaymentApi(client).pay(currentEncounter.uuid, input, key);
      if (!confirmedPayment(res)) {
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
    if (!currentEncounter || !amountValid || submissionLock.current || uncertain || patientError || !acknowledged || borrowerName.trim().length < 2 || idNumber.trim().length < 4) return;
    Keyboard.dismiss();
    submissionLock.current = true;
    setBusy(true);
    setProcessingPhase('Waiting for hospital confirmation');
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
  if (!currentEncounter) return <Screen><EmptyState title="No bill to pay" detail="Your hospital statements will appear when a stay is linked to your account." /><SecondaryButton title="Go back" onPress={() => navigation.goBack()} /></Screen>;

  if (step === 'done' && receipt) return <Screen gutter={0} background={C.hero}>
    <View pointerEvents="none" style={{ position: 'absolute', top: 200, left: 0, right: 0, bottom: 0, backgroundColor: C.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24 }} />
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
      <ReceiptSheet number={receipt.officialReceiptNumber} amount={receipt.amount} rail={receipt.methodRail} payer={receipt.payerName} date={receipt.issuedAt || receipt.settledAt || receipt.createdAt} reference={receipt.paymentReference} surroundingColor={C.hero} />
      {passIssued && <StatusBadge tone="ok" text="Discharge pass released" />}
    </ScrollView>
    <View style={{ backgroundColor: C.paper, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><SecondaryButton title="Documents" onPress={() => navigation.replace('Documents')} /></View><View style={{ flex: 1 }}><PrimaryButton title={passIssued ? 'Discharge pass' : 'Payments'} onPress={() => passIssued ? navigation.replace('Documents') : navigation.navigate('Main', { screen: 'Payments' })} /></View></View>
  </Screen>;
  if (step === 'done' && note) return <Screen><ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
    {note && <>
      <View style={{ alignItems: 'center', paddingVertical: 28, gap: 12 }}><Icon name="success" size={48} color={C.success} /><Text accessibilityRole="header" style={[T.title, { textAlign: 'center' }]}>Payment plan recorded</Text><Text style={T.display}>{formatPeso(note.totalRepayment ?? note.principalAmount)}</Text><Text style={T.meta}>{note.noteNumber} · 0% interest · {note.installmentMonths} months</Text></View>
      <Card flush><LedgerRow title="First due date" value={formatDate(note.firstDueDate)} />{(note.scheduleJson || note.schedule || []).map((value, i, all) => <LedgerRow key={i} title={`Month ${i + 1}`} value={formatPeso(value)} last={i === all.length - 1} />)}</Card>
    </>}
    {passIssued && <View style={{ paddingVertical: 16 }}><StatusBadge tone="ok" text="Discharge pass released" /><Text style={[T.body, { marginTop: 8 }]}>Show your pass from Documents at the lobby exit.</Text></View>}
    <PrimaryButton title={passIssued ? 'View discharge pass' : 'View payments'} onPress={() => passIssued ? navigation.replace('Documents') : navigation.navigate('Main', { screen: 'Payments' })} />
    <SecondaryButton title="Documents & receipts" onPress={() => navigation.replace('Documents')} />
  </ScrollView></Screen>;
  if (currentEncounter.stage !== 'PENDING_SETTLEMENT' && !pending) return <Screen><EmptyState title="Your final bill is being reviewed" detail="Hospital clearance checks must finish before online settlement. You can review the running bill now." /><SecondaryButton title="Review bill" onPress={() => navigation.navigate('Main', { screen: 'Bill' })} /><SecondaryButton title="Go back" onPress={() => navigation.goBack()} /></Screen>;
  if (balance <= 0 && !pending) return <Screen><EmptyState title="No outstanding balance" detail="Review your payment history and discharge documents." /><SecondaryButton title="Go back" onPress={() => navigation.goBack()} /></Screen>;
  if (step === 'amount' && !pending) return <Screen keyboard keyboardOffset={headerHeight} gutter={0} background={C.hero}>
    <PaymentAmountEntry balance={balance} mode={mode} partial={partial} onMode={value => { setMode(value); resetKey(); }} onPartial={value => { setPartial(value); resetKey(); }} onContinue={() => { Keyboard.dismiss(); setSelectedAmount(enteredAmount); setStep('method'); }} error={error || patientError || (partial ? amountError : null)} onRetry={patientError ? refresh : undefined} disabled={!amountValid || !!patientError || uncertain || busy} />
  </Screen>;
  const wallet = WALLET_PRESETS[rail];
  const isNote = method.kind === 'promissory';
  const noteValid = borrowerName.trim().length >= 2 && idNumber.trim().length >= 4 && acknowledged;
  return <Screen keyboard keyboardOffset={headerHeight}>
    <ScrollView ref={checkoutScroll} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <RefreshNotice error={patientError} onRetry={refresh} />
      {error && <View style={{ backgroundColor: uncertain ? C.warningBg : C.dangerBg, borderRadius: 12, padding: 14, marginVertical: 8 }}><Text accessibilityRole="alert" style={[T.body, { color: uncertain ? C.warning : C.danger }]}>{error}</Text></View>}
      {!!pending && <Card><Text style={T.title}>Awaiting confirmation</Text><Text style={[T.body, { marginTop: 8 }]}>{formatPeso(pending.input.amount)} via {describeRail(pending.input.paymentRail)}. Checking again uses your saved request.</Text><PrimaryButton title={busy ? 'Checking…' : 'Check payment status'} onPress={submitPayment} disabled={busy} /><SecondaryButton title="Payment history" disabled={busy} onPress={() => navigation.navigate('Main', { screen: 'Payments' })} /></Card>}
      {!pending && <>
        {step === 'method' && <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 24 }}><Text style={T.meta}>Paying <Text style={{ fontWeight: '600', color: C.ink }}>{formatPeso(amount)}</Text></Text><Text style={T.meta}>Step 2 of 4</Text></View>
          {[
            { title: 'Wallets & QR', options: PAYMENT_METHODS.filter(item => item.kind === 'qr' || item.kind === 'wallet') },
            { title: 'Other payment options', options: PAYMENT_METHODS.filter(item => item.kind !== 'qr' && item.kind !== 'wallet') }
          ].map(group => <View key={group.title} style={{ marginBottom: 20 }}>
            <Text accessibilityRole="header" style={[T.section, { marginBottom: 12 }]}>{group.title}</Text>
            <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: 'hidden' }}>
              {group.options.map((item, i) => <Pressable key={item.rail} disabled={busy || uncertain} onPress={() => { setRail(item.rail); resetKey(); setError(null); }} accessibilityRole="radio" accessibilityState={{ checked: rail === item.rail, selected: rail === item.rail, disabled: busy || uncertain }} accessibilityLabel={`${item.label}, ${item.hint}`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 14, paddingVertical: 12, gap: 12, opacity: pressed ? 0.6 : 1, borderBottomWidth: i === group.options.length - 1 ? 0 : 1, borderBottomColor: C.border, backgroundColor: rail === item.rail ? C.brandSoft : C.surface })}>
                {item.hasLogo ? <ProviderMark rail={item.rail} size={28} /> : <Icon name={item.icon} size={24} color={C.brandDark} />}
                <Text style={[T.body, { flex: 1, fontSize: 15 }]}>{item.label}</Text>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: rail === item.rail ? C.brand : C.faint, alignItems: 'center', justifyContent: 'center' }}>{rail === item.rail && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.brand }} />}</View>
              </Pressable>)}
            </View>
          </View>)}
          <Text style={[T.meta, { marginTop: 16 }]}>{method.hint}</Text>
        </>}
        {(step === 'detail' || step === 'verification' || step === 'review') && <>
          {step !== 'review' && <View style={{ backgroundColor: wallet?.background || (method.kind === 'card' ? C.ink : isNote ? C.note : C.hero), borderRadius: 18, padding: 20, marginVertical: 12, gap: 8 }}>
            <Text style={[T.section, { color: wallet?.accent || '#FFFFFF' }]}>{method.label}{isNote ? ' · 0% interest' : ''}</Text>
            <Text style={[T.heroFigure, { color: wallet?.accent || '#FFFFFF' }]}>{formatPeso(amount)}</Text>
            {method.kind === 'card' && <Text style={[T.heroSub, { letterSpacing: 1 }]}>{cardBrand} · •••• {cardLast4 || '••••'}</Text>}
            <Text style={T.heroSub}>{currentEncounter.billNumber || currentEncounter.encounterNumber}</Text>
          </View>}
          {step === 'detail' && !isNote && <>
            {method.kind === 'qr' && <Card><PaymentQr /><Text style={[T.meta, { textAlign: 'center', marginTop: 12 }]}>Scan this code, then review the payment details.</Text></Card>}
            {wallet && <Card><Text style={T.section}>Wallet account</Text><LedgerRow title="Sample account" value={wallet.contact} last /><Text style={T.meta}>Continue with the preset account to preview wallet verification.</Text></Card>}
            {method.kind === 'card' && <Card><Text style={T.section}>Card details</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>{['VISA', 'MASTERCARD'].map(brand => <Chip key={brand} label={brand === 'VISA' ? 'Visa' : 'Mastercard'} selected={cardBrand === brand} onPress={() => setCardBrand(brand)} disabled={busy || uncertain} />)}</View><View style={{ marginTop: 16 }}><Field label="Last 4 digits" value={cardLast4} onChangeText={value => setCardLast4(value.replace(/\D/g, '').slice(0, 4))} keyboard="numeric" hint="Only the final four digits are needed." editable={!busy && !uncertain} /></View><SecondaryButton title="Use sample card" disabled={busy || uncertain} onPress={() => setCardLast4(cardBrand === 'VISA' ? '1111' : '0004')} /></Card>}
            {method.kind === 'bank' && <Card><Text style={T.section}>Transfer details</Text><Text style={[T.meta, { marginVertical: 12 }]}>Record the bank used for your payment. Your hospital confirms the recorded result.</Text><Field label="Bank name" value={bankName} onChangeText={setBankName} hint="For example, BPI, BDO or UnionBank." editable={!busy && !uncertain} error={bankName.length > 64 ? 'Use a bank name up to 64 characters.' : undefined} /></Card>}
            <Field label={method.kind === 'card' ? 'Cardholder name' : 'Payer name'} value={payerName} onChangeText={setPayerName} editable={!busy && !uncertain} autoCapitalize="words" />
            <PrimaryButton title={wallet ? 'Continue with sample account' : 'Review payment'} disabled={busy || uncertain || !detailsValid || !amountValid || !!patientError} onPress={() => setStep(wallet ? 'verification' : 'review')} />
            <SecondaryButton title="Back" disabled={busy || uncertain} onPress={goBack} />
          </>}
          {step === 'verification' && wallet && <>
            <Card><Icon name="coverage" color={C.brand} size={32} /><Text accessibilityRole="header" style={[T.title, { marginTop: 16 }]}>Wallet verification</Text><Text style={[T.body, { color: C.secondary, marginTop: 12 }]}>The preset account is ready for the next step.</Text><LedgerRow title="Account" value={wallet.contact} last /></Card>
            <PrimaryButton title="Continue to review" disabled={busy || uncertain || !amountValid || !!patientError} onPress={() => setStep('review')} />
            <SecondaryButton title="Back" disabled={busy || uncertain} onPress={goBack} />
          </>}
          {step === 'detail' && isNote && <>
            <Text style={[T.body, { color: C.secondary, marginBottom: 16 }]}>Spread the selected amount over monthly installments at 0% interest. Hospital billing confirms your agreement and clearance status.</Text>
            <Text style={T.eyebrow}>Repayment term</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 }}>{([3, 6, 12] as const).map(value => <Chip key={value} label={`${value} months`} sub={formatPeso(previewInstallments(amount, value).monthlyInstallment)} selected={months === value} onPress={() => setMonths(value)} disabled={busy || uncertain} />)}</View>
            <Card flush><LedgerRow title="Principal financed" value={formatPeso(plan.financedAmount)} /><LedgerRow title="Interest" value="0%" tone="ok" /><LedgerRow title="Estimated first due" value={formatDate(estimatedFirstDueDate())} /><LedgerRow title="Total repayment" value={formatPeso(plan.totalRepayment)} last /></Card>
            <Field label="Borrower / guarantor legal name" value={borrowerName} onChangeText={setBorrowerName} autoCapitalize="words" editable={!busy && !uncertain} />
            <Text style={T.eyebrow}>Relationship to patient</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 }}>{RELATIONSHIPS.map(value => <View key={value} style={{ flexBasis: '46%', flexGrow: 1 }}><Chip label={value.charAt(0) + value.slice(1).toLowerCase()} selected={relationship === value} onPress={() => setRelationship(value)} disabled={busy || uncertain} /></View>)}</View>
            <Text style={T.eyebrow}>Government ID</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 }}>{ID_TYPES.map(value => <View key={value.id} style={{ flexBasis: '46%', flexGrow: 1 }}><Chip label={value.label} selected={idType === value.id} onPress={() => setIdType(value.id)} disabled={busy || uncertain} /></View>)}</View>
            <Field label="ID number" value={idNumber} onChangeText={setIdNumber} editable={!busy && !uncertain} />
            <Pressable disabled={busy || uncertain} onPress={() => setAcknowledged(value => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: acknowledged, disabled: busy || uncertain }} accessibilityLabel="Acknowledge repayment terms" style={({ pressed }) => ({ flexDirection: 'row', gap: 12, paddingVertical: 16, opacity: pressed ? 0.6 : 1 })}><View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: C.brand, backgroundColor: acknowledged ? C.brand : C.surface, alignItems: 'center', justifyContent: 'center' }}>{acknowledged && <Icon name="check" size={18} color="#FFFFFF" />}</View><Text style={[T.meta, { flex: 1 }]}>I acknowledge this repayment schedule. The hospital billing desk arranges the formal promissory agreement.</Text></Pressable>
            <PrimaryButton title="Review payment plan" onPress={() => setStep('review')} disabled={busy || uncertain || !noteValid || !amountValid || !!patientError} /><SecondaryButton title="Back" onPress={goBack} disabled={busy || uncertain} />
          </>}
          {step === 'review' && <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 14 }}><View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.brandSoft, justifyContent: 'center', alignItems: 'center' }}><Icon name={method.icon} size={24} color={C.brandDark} /></View><View style={{ flex: 1 }}><Text style={T.section}>{isNote ? 'Repayment plan' : method.label}</Text><Text style={[T.meta, { marginTop: 4 }]}>{currentEncounter.billNumber || currentEncounter.encounterNumber}</Text></View></View>
            <LedgerRow title="Method" value={method.label} last /><LedgerRow title={isNote ? 'Borrower / guarantor' : 'Payer'} value={isNote ? borrowerName : payerName} last />
            {wallet && <LedgerRow title="Wallet account" value={wallet.contact} last />}
            {method.kind === 'card' && <LedgerRow title="Card" value={`${cardBrand} · •••• ${cardLast4}`} last />}
            {method.kind === 'bank' && <LedgerRow title="Bank" value={bankName} last />}
            {isNote && <><LedgerRow title="Term" value={`${months} months · 0% interest`} last />{plan.schedule.map((value, i) => <LedgerRow key={i} title={`Month ${i + 1}`} value={formatPeso(value)} last />)}</>}
            <LedgerRow title="Balance after this request" value={formatPeso(Math.max(0, balance - amount))} last />
            <View style={{ borderTopWidth: 1, borderTopColor: C.border, borderStyle: 'dashed', marginTop: 16, paddingVertical: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><Text style={T.body}>{isNote ? 'Total repayment' : 'Total to pay'}</Text><Text style={{ fontSize: 24, fontWeight: '600', color: C.ink, fontVariant: ['tabular-nums'] }}>{formatPeso(isNote ? plan.totalRepayment : amount)}</Text></View>
            <Pressable disabled={busy || uncertain} onPress={goBack} accessibilityRole="button" accessibilityLabel="Edit payment details" style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, marginBottom: 12 }}><Text style={T.meta}>Payment details</Text><Text style={[T.meta, { color: C.brandDark }]}>Change</Text></Pressable>
            <Text style={T.meta}>Your receipt or payment plan appears after the hospital confirms the request.</Text>
          </>}
        </>}
        {!amountValid && step !== 'amount' && <Text accessibilityRole="alert" style={[T.body, { color: C.danger, marginTop: 12 }]}>Your balance changed. Go back to amount selection and review it before continuing.</Text>}
      </>}
      {uncertain && <SecondaryButton title={isNote ? 'Check payment plans' : 'Check payment history'} onPress={() => navigation.navigate('Main', { screen: 'Payments' })} />}
    </ScrollView>
    {!pending && (step === 'method' || step === 'review') && <View style={{ backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: 12, paddingTop: 4 }}>
      <PrimaryButton title={step === 'method' ? 'Continue' : busy ? 'Confirming…' : isNote ? 'Confirm payment plan' : `Confirm payment · ${formatPeso(amount)}`} onPress={() => step === 'method' ? setStep('detail') : isNote ? void submitNote() : void submitPayment()} disabled={busy || uncertain || !amountValid || !!patientError || (step === 'review' && (isNote ? !noteValid : !detailsValid))} />
    </View>}
    <Modal visible={busy} transparent animationType="none" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,45,42,0.6)', paddingHorizontal: 24, paddingTop: Math.max(24, insets.top), paddingBottom: Math.max(24, insets.bottom), justifyContent: 'center', alignItems: 'center' }}>
        <ScrollView accessibilityViewIsModal style={{ width: '100%', maxWidth: 420, maxHeight: '90%', flexGrow: 0, backgroundColor: C.surface, borderRadius: 24 }} contentContainerStyle={{ padding: 28, alignItems: 'center', gap: 16 }}>
          <ActivityIndicator color={C.brand} size="large" />
          <Text accessibilityRole="header" style={[T.title, { textAlign: 'center' }]}>{isNote ? 'Recording your payment plan' : 'Confirming your payment'}</Text>
          <Text accessibilityLiveRegion="polite" style={[T.body, { color: C.secondary, textAlign: 'center' }]}>{processingPhase}</Text>
          <Text style={[T.meta, { textAlign: 'center' }]}>Keep this screen open. If confirmation is interrupted, your payment history can help you check the result.</Text>
        </ScrollView>
      </View>
    </Modal>
  </Screen>;
}
