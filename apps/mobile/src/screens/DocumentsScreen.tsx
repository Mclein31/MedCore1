import { Text, View } from 'react-native';
import { day, peso, railLabel, stageLabel, when } from '../lib/format';
import { ExitPass } from '../ui/ExitPass';
import { Card, Notice, Row, Screen } from '../ui/kit';
import { C, S, T } from '../ui/theme';
import { WithStay } from './common';

export function DocumentsScreen() {
  return (
    <WithStay requireBill={false}>
      {({ d, refreshing, refresh }) => (
        <Screen refreshing={refreshing} onRefresh={refresh}>
          {d.gatePass ? (
            <ExitPass pass={d.gatePass} />
          ) : (
            <Card title="Exit pass">
              <Text style={T.meta}>
                Your exit pass appears here once the hospital clears you to go home. Current step:{' '}
                {stageLabel(d.stay.stage).toLowerCase()}.
              </Text>
            </Card>
          )}

          {d.stay.billReady && d.ledger ? (
            <Card title="Statement of account">
              <Row label="Bill number" value={d.stay.billNumber ?? '—'} />
              <Row label="Stay" value={d.stay.encounterNumber} />
              <Row label="Admitted" value={day(d.stay.admittedAt)} />
              <Row label="Your share" value={peso(d.ledger.netPatientDueCents)} />
              <Row label="Balance" value={peso(d.ledger.balanceCents)} bold last />
            </Card>
          ) : (
            <Notice tone="info">Your statement appears here once the bill is finalized.</Notice>
          )}

          {(d.payments?.length ?? 0) > 0 ? (
            <Card title="Official receipts">
              {d.payments!.map((p, i, all) => (
                <View
                  key={p.reference}
                  style={{
                    paddingVertical: S.sm,
                    borderBottomWidth: i === all.length - 1 ? 0 : 1,
                    borderBottomColor: C.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text selectable style={T.label}>
                      OR {p.officialReceiptNumber}
                    </Text>
                    <Text style={T.money}>{peso(p.amountCents)}</Text>
                  </View>
                  <Text style={T.small}>
                    {railLabel(p.rail)} · {when(p.createdAt)} · ref {p.reference}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {(d.promissoryNotes ?? []).map((n) => (
            <Card key={n.noteNumber} title={`Promissory note ${n.noteNumber}`}>
              <Text style={T.meta}>
                {peso(n.principalCents)} over {n.months} months at 0% interest. Signed {when(n.signedAt)}.
              </Text>
            </Card>
          ))}
        </Screen>
      )}
    </WithStay>
  );
}
