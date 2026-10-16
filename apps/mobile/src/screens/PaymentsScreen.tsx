import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { day, peso, railLabel, when } from '../lib/format';
import type { RootParams, TabParams } from '../navigation';
import { Badge, Button, Card, Empty, Notice, Screen } from '../ui/kit';
import { C, S, T } from '../ui/theme';
import { WithStay } from './common';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParams, 'Payments'>,
  NativeStackScreenProps<RootParams>
>;

export function PaymentsScreen({ navigation }: Props) {
  return (
    <WithStay>
      {({ row, d, refreshing, refresh }) => {
        const l = d.ledger!;
        const open = l.balanceCents > 0 && d.stay.stage !== 'CLEARED';
        const canPay = Boolean(d.options?.onlinePayments);
        const canPlan =
          Boolean(d.options?.onlinePromissory) && !d.promissoryNotes?.some((n) => n.status === 'ACTIVE');
        const payments = d.payments ?? [];
        const notes = d.promissoryNotes ?? [];
        return (
          <Screen refreshing={refreshing} onRefresh={refresh}>
            <Card>
              <Text style={T.meta}>Left to pay now</Text>
              <Text style={[T.display, { marginTop: S.xs }]}>{peso(l.balanceCents)}</Text>
              <Text style={[T.meta, { marginTop: S.xs }]}>
                Your share {peso(l.netPatientDueCents)} · paid {peso(l.paidCents)}
                {l.financedCents > 0 ? ` · on a plan ${peso(l.financedCents)}` : ''}
              </Text>
            </Card>

            {open ? (
              <Card title="How would you like to settle?">
                <View style={{ gap: S.md }}>
                  {d.disputes?.some((x) => x.status === 'OPEN') ? (
                    <Notice tone="info">
                      You questioned a charge. You can still pay now; we will refund you if the charge is
                      removed.
                    </Notice>
                  ) : null}
                  {canPay ? (
                    <Button
                      title="Pay online"
                      onPress={() => navigation.navigate('Pay', { stayId: row.id })}
                    />
                  ) : (
                    <Notice tone="info">
                      Online payment is not available yet. Please pay at the cashier.
                    </Notice>
                  )}
                  {canPlan ? (
                    <Button
                      title="Pay in installments (0% interest)"
                      variant="secondary"
                      onPress={() => navigation.navigate('PaymentPlan', { stayId: row.id })}
                    />
                  ) : null}
                  <Text style={T.small}>
                    You can also pay at the cashier. Under RA 9439 a hospital cannot hold you for unpaid
                    bills; a promissory note lets you go home and pay later.
                  </Text>
                </View>
              </Card>
            ) : null}

            <Card title="Payments">
              {payments.length === 0 ? (
                <Text style={T.meta}>No payments yet.</Text>
              ) : (
                payments.map((p, i) => (
                  <View
                    key={p.reference}
                    style={{
                      flexDirection: 'row',
                      gap: S.md,
                      paddingVertical: S.sm,
                      borderBottomWidth: i === payments.length - 1 ? 0 : 1,
                      borderBottomColor: C.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={T.label}>{railLabel(p.rail)}</Text>
                      <Text style={T.small}>
                        Official receipt {p.officialReceiptNumber} · {when(p.createdAt)}
                      </Text>
                    </View>
                    <Text style={T.money}>{peso(p.amountCents)}</Text>
                  </View>
                ))
              )}
            </Card>

            {notes.map((n) => (
              <Card key={n.noteNumber} title={`Payment plan ${n.noteNumber}`}>
                <Badge
                  tone={n.status === 'ACTIVE' ? 'info' : 'neutral'}
                  label={n.status === 'ACTIVE' ? 'Active' : n.status}
                />
                <Text style={[T.meta, { marginVertical: S.sm }]}>
                  {peso(n.principalCents)} over {n.months} months, 0% interest. Signed {day(n.signedAt)}.
                </Text>
                {n.schedule.map((i) => (
                  <View
                    key={i.sequence}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}
                  >
                    <Text style={T.meta}>
                      {i.sequence}. Due {day(i.dueDate)}
                    </Text>
                    <Text style={T.money}>{peso(i.amountCents)}</Text>
                  </View>
                ))}
              </Card>
            ))}
            {!open && payments.length === 0 && notes.length === 0 ? <Empty title="Nothing to pay" /> : null}
          </Screen>
        );
      }}
    </WithStay>
  );
}
