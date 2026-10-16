import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HelpCircle } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { humanize, peso } from '../lib/format';
import type { RootParams, TabParams } from '../navigation';
import { BillSummary } from '../ui/BillSummary';
import { Badge, Card, Screen } from '../ui/kit';
import { C, S, T } from '../ui/theme';
import { WithStay } from './common';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParams, 'Bill'>,
  NativeStackScreenProps<RootParams>
>;

export function BillScreen({ navigation }: Props) {
  return (
    <WithStay>
      {({ row, d, refreshing, refresh }) => {
        const all = d.charges ?? [];
        const charges = all.filter((c) => c.coverage !== 'WAIVED');
        const removed = all.filter((c) => c.coverage === 'WAIVED');
        const categories = [...new Set(charges.map((c) => c.category))];
        const canAsk = d.stay.stage !== 'CLEARED';
        return (
          <Screen refreshing={refreshing} onRefresh={refresh}>
            <Card title={d.stay.billNumber ? `Your bill · ${d.stay.billNumber}` : 'Your bill'}>
              <BillSummary l={d.ledger!} />
            </Card>

            <Card title="What you were charged for">
              <Text style={[T.meta, { marginBottom: S.sm }]}>
                Something look wrong? Tap “Question this charge” and billing will review it.
              </Text>
              {categories.map((cat) => (
                <View key={cat} style={{ marginTop: S.md }}>
                  <Text style={[T.small, { fontWeight: '700', letterSpacing: 0.5 }]}>
                    {humanize(cat).toUpperCase()}
                  </Text>
                  {charges
                    .filter((c) => c.category === cat)
                    .map((c) => (
                      <View
                        key={c.id}
                        style={{
                          paddingVertical: S.md,
                          borderBottomWidth: 1,
                          borderBottomColor: C.border,
                          gap: 4,
                        }}
                      >
                        <View style={{ flexDirection: 'row', gap: S.md }}>
                          <Text style={[T.body, { flex: 1, fontWeight: '500' }]}>
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
                          {!c.isDisputed && canAsk ? (
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
                <Text style={[T.meta, { marginTop: S.md }]}>
                  Removed after review:{' '}
                  {removed.map((c) => `${c.description} (${peso(c.grossCents)})`).join(', ')}.
                </Text>
              ) : null}
            </Card>

            {(d.disputes?.length ?? 0) > 0 ? (
              <Card title="Your questions">
                {d.disputes!.map((x) => {
                  const charge = all.find((c) => c.id === x.chargeId);
                  return (
                    <View key={x.id} style={{ paddingVertical: S.sm, gap: 4 }}>
                      <Text style={T.label}>{charge?.description ?? 'Charge'}</Text>
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
              </Card>
            ) : null}
          </Screen>
        );
      }}
    </WithStay>
  );
}
