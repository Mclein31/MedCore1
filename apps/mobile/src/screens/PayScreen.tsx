import {
  MoneyError,
  ONLINE_BANKS,
  ONLINE_PAYMENT_RAILS,
  parsePesos,
  PatientPaymentBody,
} from '@medcore/domain';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { api, errorMessage, idempotencyKey } from '../lib/api';
import type { PaymentInput } from '../lib/apiClient';
import { peso, railLabel } from '../lib/format';
import { stayKey, useRefreshStay } from '../lib/stays';
import type { RootScreenProps } from '../navigation';
import { Button, Card, Choice, ErrorView, Field, Loading, Notice, Screen } from '../ui/kit';
import { S, T } from '../ui/theme';

const BRANDS = [
  { value: 'VISA', label: 'Visa' },
  { value: 'MASTERCARD', label: 'Mastercard' },
  { value: 'JCB', label: 'JCB' },
] as const;

/** Demonstration checkout: no money moves and no card number, CVV or expiry is ever asked for. */
export function PayScreen({ route, navigation }: RootScreenProps<'Pay'>) {
  const { stayId } = route.params;
  const stay = useQuery({ queryKey: stayKey(stayId), queryFn: () => api.stay(stayId) });
  const refresh = useRefreshStay();
  const balance = stay.data?.ledger?.balanceCents ?? 0;
  const [amount, setAmount] = useState<string | null>(null);
  const [rail, setRail] = useState<PaymentInput['rail']>('GCASH');
  const [payerName, setPayerName] = useState('');
  const [cardBrand, setCardBrand] = useState<(typeof BRANDS)[number]['value']>('VISA');
  const [cardLast4, setCardLast4] = useState('');
  const [bank, setBank] = useState<(typeof ONLINE_BANKS)[number]>('BPI');
  // One key per checkout attempt: a retry after a timeout reuses it, so the server records one payment.
  const [key, setKey] = useState(idempotencyKey);

  const amountText = amount ?? (balance ? (balance / 100).toFixed(2) : '');
  let cents: number | null = null;
  let amountError: string | null = null;
  try {
    cents = parsePesos(amountText);
    if (cents <= 0) amountError = 'Enter an amount greater than zero.';
    else if (cents > balance) amountError = `You only owe ${peso(balance)}.`;
  } catch (err) {
    amountError = amountText ? (err instanceof MoneyError ? err.message : 'Check the amount.') : null;
  }
  const payment: PaymentInput = {
    amountCents: cents ?? 0,
    rail,
    payerName: payerName.trim(),
    ...(rail === 'CARD' ? { cardBrand, cardLast4 } : {}),
    ...(rail === 'BANK_TRANSFER' ? { bank } : {}),
  };
  const valid = !amountError && cents !== null && PatientPaymentBody.safeParse(payment).success;

  const pay = useMutation({
    mutationFn: () => api.pay(stayId, payment, key),
    onSuccess: () => {
      setKey(idempotencyKey());
      void refresh(stayId);
    },
  });

  if (stay.isPending) return <Loading />;
  if (stay.isError)
    return <ErrorView message={errorMessage(stay.error)} onRetry={() => void stay.refetch()} />;

  if (pay.isSuccess) {
    return (
      <Screen>
        <Card>
          <View style={{ gap: S.md }}>
            <Text accessibilityRole="header" style={T.title}>
              Payment received
            </Text>
            <Text style={T.display}>{peso(pay.data.amountCents)}</Text>
            <Text style={T.meta}>Official receipt {pay.data.officialReceiptNumber}</Text>
            <Text style={T.small}>Reference {pay.data.reference}</Text>
            <Button title="Done" onPress={() => navigation.goBack()} />
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Notice tone="info">
        This is a demonstration checkout: no money moves and no card details are collected.
      </Notice>
      {pay.isError ? <Notice>{errorMessage(pay.error)}</Notice> : null}
      <Field
        label="Amount in pesos"
        hint={`Up to ${peso(balance)}`}
        error={amountError}
        value={amountText}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Choice
        label="Method"
        value={rail}
        onChange={setRail}
        options={ONLINE_PAYMENT_RAILS.map((r) => ({ value: r, label: railLabel(r) }))}
      />
      {rail === 'CARD' ? (
        <>
          <Choice label="Card brand" value={cardBrand} onChange={setCardBrand} options={BRANDS} />
          <Field
            label="Last 4 digits of the card only"
            hint="Never enter the full card number here."
            value={cardLast4}
            onChangeText={(v) => setCardLast4(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            autoComplete="off"
          />
        </>
      ) : null}
      {rail === 'BANK_TRANSFER' ? (
        <Choice
          label="Bank"
          value={bank}
          onChange={setBank}
          options={ONLINE_BANKS.map((b) => ({ value: b, label: b }))}
        />
      ) : null}
      <Field
        label="Name of the person paying"
        value={payerName}
        onChangeText={setPayerName}
        autoComplete="name"
        textContentType="name"
        maxLength={120}
      />
      <Button
        title={cents && !amountError ? `Pay ${peso(cents)}` : 'Pay'}
        busy={pay.isPending}
        disabled={!valid}
        onPress={() => pay.mutate()}
      />
    </Screen>
  );
}
