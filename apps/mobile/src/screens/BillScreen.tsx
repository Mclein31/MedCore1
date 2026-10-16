import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, Text, View } from 'react-native';
import { day, humanize, peso } from '../lib/format';
import type { RootParams, TabParams } from '../navigation';
import { BillSummary } from '../ui/BillSummary';
import { CreditCard, FileText, HelpCircle, ShieldCheck } from '../ui/icons';
import { Badge, Button, QuickActions, Screen, SectionHeader } from '../ui/kit';
import { C, R, S, T } from '../ui/theme';
import { WithStay } from './common';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParams, 'Bill'>,
  NativeStackScreenProps<RootParams>
>;

export function BillScreen({ navigation }: Props) {
  return (
    <WithStay>
      {({ row, d, refreshing, refresh }) => {
        const l = d.ledger!;
        const all = d.charges ?? [];
        const charges = all.filter((c) => c.coverage !== 'WAIVED');
        const removed = all.filter((c) => c.coverage === 'WAIVED');
        const categories = [...new Set(charges.map((c) => c.category))];
        const open = d.stay.stage !== 'CLEARED';
        const canPay = Boolean(d.options?.onlinePayments) && l.balanceCents > 0 && open;
        return (
          <Screen refreshing={refreshing} onRefresh={refresh} background={C.surface} gutter={0} gap={0}>
            {/* v1 mint band with the teal bill card and shortcuts. */}
            <View
              style={{
                backgroundColor: C.brandSoft,
                marginTop: -20,
                paddingTop: 16,
                paddingHorizontal: S.gutter,
                paddingBottom: 8,
                borderBottomLeftRadius: 28,
                borderBottomRightRadius: 28,
              }}
            >
              <View style={{ backgroundColor: C.brand, borderRadius: R.hero, padding: 20, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                    Your hospital bill
                  </Text>
                  <Text style={T.heroSub}>{day(d.stay.admittedAt)}</Text>
                </View>
                <Text style={[T.heroSub, { marginTop: 12, fontWeight: '600' }]}>Remaining balance</Text>
                <Text style={T.heroFigure}>{peso(l.balanceCents)}</Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <QuickActions
                  actions={[
                    { label: 'Payments', icon: CreditCard, onPress: () => navigation.navigate('Payments') },
                    { label: 'Coverage', icon: ShieldCheck, onPress: () => navigation.navigate('Coverage') },
                    { label: 'Documents', icon: FileText, onPress: () => navigation.navigate('Documents') },
                  ]}
                />
              </View>
            </View>

            <View style={{ paddingHorizontal: S.gutter, paddingTop: 20, gap: S.md }}>
              <Text style={T.meta}>
                {d.stay.encounterNumber} · Your responsibility before payments: {peso(l.netPatientDueCents)}
              </Text>
              <Badge
                tone={d.stay.billState === 'SETTLED' ? 'good' : 'brand'}
                label={d.stay.billState === 'SETTLED' ? 'Bill settled' : 'Final bill ready'}
              />
              {canPay ? (
                <Button
                  title="Continue to Payment"
                  onPress={() => navigation.navigate('Pay', { stayId: row.id })}
                />
              ) : null}

              <SectionHeader title="Your bill breakdown" />
              {l.vatExemptionCents + l.seniorPwdDiscountCents > 0 ? (
                <Text style={T.meta}>Senior citizen / PWD adjustments are shown below.</Text>
              ) : null}
              <BillSummary l={l} />

              <SectionHeader title="What you were charged for" />
              <Text style={T.meta}>Something look wrong? Question a charge and billing will review it.</Text>
              {categories.map((cat) => (
                <View key={cat} style={{ marginTop: S.sm }}>
                  <Text style={[T.small, { fontWeight: '700', letterSpacing: 0.5 }]}>
                    {humanize(cat).toUpperCase()}
                  </Text>
                  {charges
                    .filter((c) => c.category === cat)
                    .map((c) => (
                      <View
                        key={c.id}
                        style={{
                          paddingVertical: 13,
                          borderBottomWidth: 1,
                          borderBottomColor: C.border,
                          gap: 4,
                        }}
                      >
                        <View style={{ flexDirection: 'row', gap: S.md }}>
                          <Text style={[T.row, { flex: 1, fontWeight: '500' }]}>
                            {c.description}
                            {c.quantity > 1 ? <Text style={T.meta}> × {c.quantity}</Text> : null}
                          </Text>
                          <Text style={T.money}>{peso(c.grossCents)}</Text>
                        </View>
                        {c.explainer ? <Text style={T.meta}>{c.explainer}</Text> : null}
                        <View
                          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, alignItems: 'center' }}
                        >
                          {c.coverage === 'EXCLUDED' ? (
                            <Badge tone="warn" label="Not covered by insurers" />
                          ) : null}
                          {c.isDisputed ? <Badge tone="info" label="Under review" /> : null}
                          {!c.isDisputed && open ? (
                            <Pressable
                              onPress={() =>
                                navigation.navigate('QuestionCharge', { stayId: row.id, chargeId: c.id })
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`Question ${c.description}`}
                              hitSlop={8}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }}
                            >
                              <HelpCircle color={C.brandDark} size={16} />
                              <Text style={{ color: C.brandDark, fontWeight: '600', fontSize: 14 }}>
                                Question this charge
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ))}
                </View>
              ))}
              {removed.length > 0 ? (
                <Text style={T.meta}>
                  Removed after review:{' '}
                  {removed.map((c) => `${c.description} (${peso(c.grossCents)})`).join(', ')}.
                </Text>
              ) : null}

              {(d.disputes?.length ?? 0) > 0 ? (
                <>
                  <SectionHeader title="Your questions" />
                  {d.disputes!.map((x) => {
                    const charge = all.find((c) => c.id === x.chargeId);
                    return (
                      <View
                        key={x.id}
                        style={{
                          paddingVertical: S.sm,
                          gap: 6,
                          borderBottomWidth: 1,
                          borderBottomColor: C.border,
                        }}
                      >
                        <Text style={T.cardTitle}>{charge?.description ?? 'Charge'}</Text>
                        <Badge
                          tone={x.status === 'OPEN' ? 'info' : x.status === 'WAIVED' ? 'good' : 'neutral'}
                          label={
                            x.status === 'OPEN'
                              ? 'Under review'
                              : x.status === 'WAIVED'
                                ? 'Removed from bill'
                                : 'Charge confirmed'
                          }
                        />
                        <Text style={T.meta}>{x.reason}</Text>
                        {x.resolutionNote ? <Text style={T.meta}>Answer: {x.resolutionNote}</Text> : null}
                      </View>
                    );
                  })}
                </>
              ) : null}
            </View>
          </Screen>
        );
      }}
    </WithStay>
  );
}
