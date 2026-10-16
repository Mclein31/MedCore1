import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { day, peso, railLabel, when } from '../lib/format';
import type { RootParams, TabParams } from '../navigation';
import { Badge, Button, Empty, LinkRow, Notice, Screen, SectionHeader } from '../ui/kit';
import { C, R, S, T } from '../ui/theme';
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
          <Screen refreshing={refreshing} onRefresh={refresh} background={C.surface} gap={S.md}>
            <View style={{ backgroundColor: C.brand, borderRadius: R.hero, padding: 20, gap: 6 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                Amount you currently owe
              </Text>
              <Text style={T.heroFigure}>{peso(l.balanceCents)}</Text>
              <Text style={T.heroSub}>
                {open ? 'Review your bill and choose a payment option.' : 'Nothing left to pay on this bill.'}
              </Text>
              {open && canPay ? (
                <View style={{ marginTop: 12 }}>
                  <Button
                    title="Pay balance"
                    variant="inverse"
                    onPress={() => navigation.navigate('Pay', { stayId: row.id })}
                  />
                </View>
              ) : null}
            </View>

            {open ? (
              <>
                {!canPay ? (
                  <Notice tone="info">Online payment is not available yet. Please pay at the cashier.</Notice>
                ) : null}
                {d.disputes?.some((x) => x.status === 'OPEN') ? (
                  <Notice tone="info">
                    You questioned a charge. You can still pay now; we will refund you if the charge is
                    removed.
                  </Notice>
                ) : null}
                {canPlan ? (
                  <Button
                    title="Pay in installments (0% interest)"
                    variant="secondary"
                    onPress={() => navigation.navigate('PaymentPlan', { stayId: row.id })}
                  />
                ) : null}
                <Text style={T.meta}>
                  You can also pay at the cashier. Under RA 9439 a hospital cannot hold you for unpaid bills;
                  a promissory note lets you go home and pay later.
                </Text>
              </>
            ) : null}

            <SectionHeader title={`Payments · ${payments.length}`} />
            {payments.length === 0 ? (
              <Empty title="No payments yet" detail="Payments you make will appear here with receipts." />
            ) : (
              <View>
                {payments.map((p, i) => (
                  <LinkRow
                    key={p.reference}
                    title={railLabel(p.rail)}
                    subtitle={`OR ${p.officialReceiptNumber} · ${when(p.createdAt)}`}
                    value={peso(p.amountCents)}
                    onPress={() => navigation.navigate('Documents')}
                    last={i === payments.length - 1}
                  />
                ))}
              </View>
            )}

            {notes.map((n) => (
              <View key={n.noteNumber} style={{ gap: S.sm }}>
                <SectionHeader title={`Payment plan ${n.noteNumber}`} />
                <Badge
                  tone={n.status === 'ACTIVE' ? 'brand' : 'neutral'}
                  label={n.status === 'ACTIVE' ? 'Active' : n.status}
                />
                <Text style={T.meta}>
                  {peso(n.principalCents)} over {n.months} months, 0% interest. Signed {day(n.signedAt)}.
                </Text>
                {n.schedule.map((i) => (
                  <View
                    key={i.sequence}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: C.border,
                    }}
                  >
                    <Text style={T.row}>
                      {i.sequence}. Due {day(i.dueDate)}
                    </Text>
                    <Text style={T.money}>{peso(i.amountCents)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </Screen>
        );
      }}
    </WithStay>
  );
}
