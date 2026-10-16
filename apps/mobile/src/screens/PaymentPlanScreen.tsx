import {
  GOVERNMENT_ID_RULES,
  GOVERNMENT_ID_TYPES,
  INSTALLMENT_TERMS,
  validateGovernmentId,
  type GovernmentIdType,
  type InstallmentTerm,
} from '@medcore/domain';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { api, errorMessage } from '../lib/api';
import type { PromissoryInput } from '../lib/apiClient';
import { humanize, peso } from '../lib/format';
import { stayKey, useRefreshStay } from '../lib/stays';
import type { RootScreenProps } from '../navigation';
import { Button, Card, Choice, ErrorView, Field, Loading, Notice, Screen } from '../ui/kit';
import { C, S, T } from '../ui/theme';

const RELATIONSHIPS = ['SELF', 'SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'GUARANTOR'] as const;

/** A 0% interest promissory note under RA 9439 for the whole remaining balance. */
export function PaymentPlanScreen({ route, navigation }: RootScreenProps<'PaymentPlan'>) {
  const { stayId } = route.params;
  const stay = useQuery({ queryKey: stayKey(stayId), queryFn: () => api.stay(stayId) });
  const refresh = useRefreshStay();
  const [months, setMonths] = useState<InstallmentTerm>(6);
  const [borrowerName, setBorrowerName] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<PromissoryInput['relationship']>('SELF');
  const [idType, setIdType] = useState<GovernmentIdType>('PHILSYS');
  const [idNumber, setIdNumber] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const sign = useMutation({
    mutationFn: (note: PromissoryInput) => api.signPromissoryNote(stayId, note),
    onSuccess: () => {
      void refresh(stayId);
      navigation.goBack();
    },
  });

  if (stay.isPending) return <Loading />;
  if (stay.isError)
    return <ErrorView message={errorMessage(stay.error)} onRetry={() => void stay.refetch()} />;
  const balance = stay.data.ledger?.balanceCents ?? 0;
  const name = borrowerName ?? stay.data.stay.patientName;
  const id = idNumber ? validateGovernmentId(idType, idNumber) : null;
  const valid = acceptTerms && id?.valid === true && name.trim().length >= 2 && balance > 0;

  return (
    <Screen>
      <Text style={T.meta}>{peso(balance)} over a few months. 0% interest, no fees (RA 9439).</Text>
      {sign.isError ? <Notice>{errorMessage(sign.error)}</Notice> : null}
      <Choice
        label="Term"
        value={months}
        onChange={setMonths}
        options={INSTALLMENT_TERMS.map((m) => ({
          value: m,
          label: `${m} months · ~${peso(Math.floor(balance / m))}`,
        }))}
      />
      <Field
        label="Borrower’s full name"
        value={name}
        onChangeText={setBorrowerName}
        maxLength={120}
        autoComplete="name"
      />
      <Choice
        label="Relationship to the patient"
        value={relationship}
        onChange={setRelationship}
        options={RELATIONSHIPS.map((r) => ({
          value: r,
          label: r === 'SELF' ? 'I am the patient' : humanize(r),
        }))}
      />
      <Choice
        label="Government ID"
        value={idType}
        onChange={setIdType}
        options={GOVERNMENT_ID_TYPES.map((t) => ({ value: t, label: GOVERNMENT_ID_RULES[t].label }))}
      />
      <Field
        label="ID number"
        hint={GOVERNMENT_ID_RULES[idType].hint}
        error={id && !id.valid ? id.error : null}
        value={idNumber}
        onChangeText={setIdNumber}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={32}
      />
      <Card>
        <Text style={T.meta}>
          You agree to pay {peso(balance)} in {months} monthly payments of about{' '}
          {peso(Math.floor(balance / months))}, starting one month from today, with no interest and no fees.
          The ID number is stored encrypted; only its last 4 digits are shown.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.md }}>
          <Switch
            value={acceptTerms}
            onValueChange={setAcceptTerms}
            trackColor={{ true: C.brand }}
            accessibilityLabel="I have read and accept these terms"
          />
          <Text style={[T.body, { flex: 1 }]}>I have read and accept these terms.</Text>
        </View>
      </Card>
      <Button
        title="Sign payment plan"
        busy={sign.isPending}
        disabled={!valid}
        onPress={() =>
          id?.valid &&
          sign.mutate({
            borrowerName: name.trim(),
            relationship,
            idType,
            idNumber: id.normalized,
            months,
            principalCents: balance,
            acceptTerms: true,
          })
        }
      />
    </Screen>
  );
}
