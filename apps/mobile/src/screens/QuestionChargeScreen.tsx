import { DISPUTE_CATEGORIES, FileDisputeBody } from '@medcore/domain';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text } from 'react-native';
import { api, errorMessage } from '../lib/api';
import type { DisputeInput } from '../lib/apiClient';
import { humanize, peso } from '../lib/format';
import { stayKey, useRefreshStay } from '../lib/stays';
import type { RootScreenProps } from '../navigation';
import { Button, Card, Choice, ErrorView, Field, Loading, Notice, Screen } from '../ui/kit';
import { T } from '../ui/theme';

export function QuestionChargeScreen({ route, navigation }: RootScreenProps<'QuestionCharge'>) {
  const { stayId, chargeId } = route.params;
  const stay = useQuery({ queryKey: stayKey(stayId), queryFn: () => api.stay(stayId) });
  const refresh = useRefreshStay();
  const [category, setCategory] = useState<DisputeInput['category']>('NOT_RECEIVED');
  const [reason, setReason] = useState('');
  const ask = useMutation({
    mutationFn: (body: DisputeInput) => api.questionCharge(stayId, body),
    onSuccess: () => {
      void refresh(stayId);
      navigation.goBack();
    },
  });

  if (stay.isPending) return <Loading />;
  if (stay.isError)
    return <ErrorView message={errorMessage(stay.error)} onRetry={() => void stay.refetch()} />;
  const charge = stay.data.charges?.find((c) => c.id === chargeId);
  if (!charge)
    return <ErrorView message="That charge is no longer on your bill." onRetry={() => navigation.goBack()} />;
  const body: DisputeInput = { chargeId, category, reason: reason.trim() };

  return (
    <Screen>
      <Card>
        <Text style={T.label}>{charge.description}</Text>
        <Text style={T.money}>{peso(charge.grossCents)}</Text>
      </Card>
      {ask.isError ? <Notice>{errorMessage(ask.error)}</Notice> : null}
      <Choice
        label="What seems wrong?"
        value={category}
        onChange={setCategory}
        options={DISPUTE_CATEGORIES.map((c) => ({ value: c, label: humanize(c) }))}
      />
      <Field
        label="Tell us more"
        hint="At least 10 characters. A billing staff member will review it."
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={1000}
        style={{ minHeight: 120, paddingTop: 12, textAlignVertical: 'top' }}
      />
      <Button
        title="Send question"
        busy={ask.isPending}
        disabled={!FileDisputeBody.safeParse(body).success}
        onPress={() => ask.mutate(body)}
      />
    </Screen>
  );
}
