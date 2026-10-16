import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FileText, ReceiptText, ShieldCheck, Wallet } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { day, firstName, peso, stageLabel, when } from '../lib/format';
import { useCurrentStay } from '../lib/stays';
import type { RootParams, TabParams } from '../navigation';
import { ExitPass } from '../ui/ExitPass';
import { Badge, Button, Card, LinkRow, Notice, Screen } from '../ui/kit';
import { C, R, S, T } from '../ui/theme';
import { WithStay } from './common';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParams, 'Home'>,
  NativeStackScreenProps<RootParams>
>;

export function HomeScreen({ navigation }: Props) {
  const { items, select } = useCurrentStay();
  return (
    <WithStay requireBill={false}>
      {({ row, d, refreshing, refresh }) => {
        const l = d.ledger;
        const cleared = d.stay.stage === 'CLEARED';
        const owe = l?.balanceCents ?? 0;
        const canPay = Boolean(d.options?.onlinePayments) && owe > 0 && !cleared;
        const actions = [
          { label: 'Bill', Icon: ReceiptText, go: () => navigation.navigate('Bill') },
          { label: 'Coverage', Icon: ShieldCheck, go: () => navigation.navigate('Coverage') },
          { label: 'Payments', Icon: Wallet, go: () => navigation.navigate('Payments') },
          { label: 'Documents', Icon: FileText, go: () => navigation.navigate('Documents') },
        ];
        return (
          <Screen refreshing={refreshing} onRefresh={refresh}>
            <View>
              <Text style={T.meta}>Good day,</Text>
              <Text accessibilityRole="header" style={T.title}>
                {firstName(d.stay.patientName)}
              </Text>
              <Text style={T.meta}>
                {d.stay.facilityName} · admitted {day(d.stay.admittedAt)}
              </Text>
            </View>

            {d.gatePass ? (
              <ExitPass pass={d.gatePass} />
            ) : (
              <View style={{ backgroundColor: C.hero, borderRadius: R.hero, padding: S.xl, gap: S.sm }}>
                <Text style={{ color: C.heroSub, fontSize: 15 }}>
                  {d.stay.billReady ? 'Left to pay' : 'Your bill'}
                </Text>
                <Text
                  accessibilityRole="header"
                  style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '700', fontVariant: ['tabular-nums'] }}
                >
                  {d.stay.billReady ? peso(owe) : 'Being prepared'}
                </Text>
                <Text style={{ color: C.heroSub, fontSize: 14 }}>
                  {d.stay.billReady
                    ? 'After PhilHealth, HMO, discounts and payments.'
                    : `Status: ${stageLabel(d.stay.stage)}. We will email you when it is ready.`}
                </Text>
                <View style={{ marginTop: S.md }}>
                  {canPay ? (
                    <Button
                      title="Pay balance"
                      onPress={() => navigation.navigate('Pay', { stayId: row.id })}
                    />
                  ) : d.stay.billReady ? (
                    <Button title="Review bill" onPress={() => navigation.navigate('Bill')} />
                  ) : null}
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: S.sm }}>
              {actions.map(({ label, Icon, go }) => (
                <Pressable
                  key={label}
                  onPress={go}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      backgroundColor: C.surface,
                      borderRadius: R.card,
                      paddingVertical: S.md,
                      alignItems: 'center',
                      gap: 6,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Icon color={C.brandDark} size={22} />
                  <Text style={{ fontSize: 12, color: C.ink, fontWeight: '500' }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Card title="Discharge status">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={T.body}>{stageLabel(d.stay.stage)}</Text>
                {cleared ? <Badge tone="good" label="Cleared" /> : <Badge label="In progress" />}
              </View>
              <Text style={[T.meta, { marginTop: S.xs }]}>
                Stay {d.stay.encounterNumber}
                {d.stay.billNumber ? ` · bill ${d.stay.billNumber}` : ''}
              </Text>
              {d.disputes?.some((x) => x.status === 'OPEN') ? (
                <View style={{ marginTop: S.md }}>
                  <Notice tone="info">A charge you questioned is being reviewed by billing.</Notice>
                </View>
              ) : null}
            </Card>

            {(d.timeline?.length ?? 0) > 0 ? (
              <Card title="Latest updates">
                {d.timeline!.slice(0, 4).map((t, i, all) => (
                  <View
                    key={`${t.createdAt}-${i}`}
                    style={{
                      paddingVertical: S.sm,
                      borderBottomWidth: i === all.length - 1 ? 0 : 1,
                      borderBottomColor: C.border,
                    }}
                  >
                    <Text style={T.label}>{t.title}</Text>
                    <Text style={T.small}>{when(t.createdAt)}</Text>
                  </View>
                ))}
              </Card>
            ) : null}

            {items.length > 1 ? (
              <Card title="Your stays" flush>
                {items.map((s, i) => (
                  <LinkRow
                    key={s.id}
                    title={`${s.patientName}${s.id === row.id ? ' (showing)' : ''}`}
                    subtitle={`Admitted ${day(s.admittedAt)} · ${s.encounterNumber}`}
                    value={s.billReady ? peso(s.balanceCents) : undefined}
                    onPress={() => select(s.id)}
                    last={i === items.length - 1}
                  />
                ))}
              </Card>
            ) : null}
          </Screen>
        );
      }}
    </WithStay>
  );
}
