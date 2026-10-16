import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DISCHARGE_STAGES, STAGE_LABELS } from '@medcore/domain';
import { Text, View } from 'react-native';
import { day, peso, stageLabel, when } from '../lib/format';
import { useCurrentStay } from '../lib/stays';
import type { RootParams, TabParams } from '../navigation';
import { ExitPass } from '../ui/ExitPass';
import { Clock, CreditCard, FileText, Receipt, ShieldCheck } from '../ui/icons';
import { Button, Card, LinkRow, QuickActions, Screen, SectionHeader } from '../ui/kit';
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
        const stageIndex = DISCHARGE_STAGES.indexOf(d.stay.stage);
        return (
          <Screen refreshing={refreshing} onRefresh={refresh} gap={0}>
            <View style={{ paddingBottom: 20 }}>
              <Text style={T.meta}>Good day,</Text>
              <Text accessibilityRole="header" style={[T.display, { marginTop: 4 }]}>
                {d.stay.patientName}
              </Text>
              <Text style={[T.meta, { marginTop: 6 }]}>{d.stay.facilityName}</Text>
            </View>

            {d.gatePass ? (
              <ExitPass pass={d.gatePass} />
            ) : (
              <View style={{ backgroundColor: C.surface, borderRadius: R.hero, padding: 22, gap: 8 }}>
                <Text style={[T.meta, { fontWeight: '500' }]}>
                  {d.stay.billReady ? 'Remaining hospital balance' : 'Your hospital bill'}
                </Text>
                <Text accessibilityRole="header" style={T.display}>
                  {d.stay.billReady ? peso(owe) : 'Being prepared'}
                </Text>
                <Text style={T.meta}>
                  {d.stay.billReady
                    ? 'After coverage, discounts and recorded payments.'
                    : 'We will email you when your final bill is ready.'}
                </Text>
                {d.stay.billReady ? (
                  <View style={{ marginTop: 8 }}>
                    <Button
                      title={canPay ? 'Pay balance' : 'Review bill'}
                      onPress={() =>
                        canPay ? navigation.navigate('Pay', { stayId: row.id }) : navigation.navigate('Bill')
                      }
                    />
                  </View>
                ) : null}
              </View>
            )}

            <View style={{ marginTop: S.md }}>
              <QuickActions
                actions={[
                  { label: 'Bill', icon: Receipt, onPress: () => navigation.navigate('Bill') },
                  { label: 'Coverage', icon: ShieldCheck, onPress: () => navigation.navigate('Coverage') },
                  { label: 'Payments', icon: CreditCard, onPress: () => navigation.navigate('Payments') },
                  { label: 'Documents', icon: FileText, onPress: () => navigation.navigate('Documents') },
                ]}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock size={17} color={C.brandDark} />
              <Text style={[T.meta, { flex: 1 }]}>{statusLine(d.stay.stage, d.stay.billReady, owe)}</Text>
            </View>
            <Text style={[T.meta, { marginTop: 8 }]}>
              {d.stay.encounterNumber} · Admitted {day(d.stay.admittedAt)}
            </Text>

            {l ? (
              <View style={{ gap: S.md, marginTop: S.xl }}>
                <SectionHeader title="Coverage applied to your bill" />
                <Card flush>
                  <LinkRow
                    title="PhilHealth"
                    subtitle={l.philhealthCents > 0 ? 'Applied' : 'Not applied'}
                    value={peso(l.philhealthCents)}
                    onPress={() => navigation.navigate('Coverage')}
                  />
                  <LinkRow
                    title="HMO"
                    subtitle={l.hmoCents > 0 ? 'HMO approved' : 'No HMO coverage on this bill'}
                    value={peso(l.hmoCents)}
                    onPress={() => navigation.navigate('Coverage')}
                    last
                  />
                </Card>
              </View>
            ) : null}

            <View style={{ gap: S.md, marginTop: S.xl }}>
              <SectionHeader title="Your discharge journey" />
              <View>
                {DISCHARGE_STAGES.filter((s) => s !== 'ADMITTED').map((stage, i, all) => {
                  const index = DISCHARGE_STAGES.indexOf(stage);
                  const state =
                    index < stageIndex || cleared ? 'done' : index === stageIndex ? 'now' : 'todo';
                  return (
                    <Step key={stage} title={STAGE_LABELS[stage]} state={state} last={i === all.length - 1} />
                  );
                })}
              </View>
            </View>

            {(d.timeline?.length ?? 0) > 0 ? (
              <View style={{ gap: S.md, marginTop: S.xl }}>
                <SectionHeader title="Latest from your hospital" />
                {d.timeline!.slice(0, 3).map((t, i) => (
                  <View
                    key={`${t.createdAt}-${i}`}
                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}
                  >
                    <Text style={T.cardTitle}>{t.title}</Text>
                    {t.detail ? <Text style={[T.meta, { marginTop: 4 }]}>{t.detail}</Text> : null}
                    <Text style={[T.meta, { marginTop: 4 }]}>{when(t.createdAt)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {items.length > 1 ? (
              <View style={{ gap: S.md, marginTop: S.xl }}>
                <SectionHeader title="Recent stays" />
                <Card flush>
                  {items.map((s, i) => (
                    <LinkRow
                      key={s.id}
                      title={`${s.encounterNumber}${s.id === row.id ? ' · showing' : ''}`}
                      subtitle={`${day(s.admittedAt)} · ${s.patientName}`}
                      value={s.billReady ? peso(s.balanceCents) : undefined}
                      onPress={() => select(s.id)}
                      last={i === items.length - 1}
                    />
                  ))}
                </Card>
              </View>
            ) : null}
          </Screen>
        );
      }}
    </WithStay>
  );
}

function statusLine(stage: string, billReady: boolean, owe: number) {
  if (stage === 'CLEARED') return 'You are cleared to go home. Show your exit pass at the lobby.';
  if (stage === 'PENDING_SETTLEMENT')
    return owe > 0 ? 'Your bill is ready for settlement.' : 'Waiting for the hospital to finish clearance.';
  if (!billReady) return `${stageLabel(stage)}. Your bill is still being prepared.`;
  return `${stageLabel(stage)}.`;
}

/** Vertical journey: a rail connects the steps so patients see where they are (v1 Stepper). */
function Step({ title, state, last }: { title: string; state: 'done' | 'now' | 'todo'; last: boolean }) {
  const color = state === 'todo' ? C.border : C.brand;
  return (
    <View
      style={{ flexDirection: 'row', gap: 14 }}
      accessible
      accessibilityLabel={`${title}, ${state === 'done' ? 'done' : state === 'now' ? 'in progress' : 'upcoming'}`}
    >
      <View style={{ alignItems: 'center', width: 18 }}>
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: color,
            backgroundColor: state === 'done' ? C.brand : C.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {state === 'now' ? (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand }} />
          ) : null}
          {state === 'done' ? (
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>✓</Text>
          ) : null}
        </View>
        {!last ? (
          <View
            style={{
              flex: 1,
              width: 2,
              backgroundColor: state === 'done' ? C.brand : C.border,
              minHeight: 18,
            }}
          />
        ) : null}
      </View>
      <Text
        style={[
          T.row,
          { paddingBottom: 18, marginTop: -1 },
          state === 'now' && { fontWeight: '700' },
          state === 'todo' && { color: C.faint },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}
