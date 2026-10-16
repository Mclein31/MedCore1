import { Text, View } from 'react-native';
import { peso, railLabel, stageLabel, when } from '../lib/format';
import { ExitPass } from '../ui/ExitPass';
import { LinkRow, Screen, SectionHeader } from '../ui/kit';
import { C, S, T } from '../ui/theme';
import { WithStay } from './common';

export function DocumentsScreen() {
  return (
    <WithStay requireBill={false}>
      {({ d, refreshing, refresh }) => {
        const receipts = d.payments ?? [];
        const notes = d.promissoryNotes ?? [];
        const statements = d.stay.billReady && d.ledger ? 1 : 0;
        return (
          <Screen refreshing={refreshing} onRefresh={refresh} background={C.surface} gap={S.md}>
            <Text style={T.meta}>Statements, receipts and clearance documents, organized by type.</Text>

            <SectionHeader title="Discharge pass" />
            {d.gatePass ? (
              <ExitPass pass={d.gatePass} />
            ) : (
              <Text style={T.meta}>
                Your exit pass appears here once the hospital clears you to go home. Current step:{' '}
                {stageLabel(d.stay.stage).toLowerCase()}.
              </Text>
            )}

            <SectionHeader title={`Statements · ${statements}`} />
            {statements ? (
              <LinkRow
                title="Statement of account"
                subtitle={`${d.stay.billNumber ?? d.stay.encounterNumber} · balance ${peso(d.ledger!.balanceCents)}`}
                last
              />
            ) : (
              <Text style={T.meta}>Your statement appears here once the bill is finalized.</Text>
            )}

            <SectionHeader title={`Receipts · ${receipts.length}`} />
            {receipts.length === 0 ? <Text style={T.meta}>No official receipts yet.</Text> : null}
            <View>
              {receipts.map((p, i) => (
                <LinkRow
                  key={p.reference}
                  title={p.officialReceiptNumber}
                  subtitle={`${railLabel(p.rail)} · ${when(p.createdAt)}`}
                  value={peso(p.amountCents)}
                  last={i === receipts.length - 1}
                />
              ))}
            </View>

            {notes.length > 0 ? (
              <>
                <SectionHeader title="Payment plans" />
                <View>
                  {notes.map((n, i) => (
                    <LinkRow
                      key={n.noteNumber}
                      title={n.noteNumber}
                      subtitle={`${n.months} months, 0% interest · signed ${when(n.signedAt)}`}
                      value={peso(n.principalCents)}
                      last={i === notes.length - 1}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={[T.meta, { marginTop: S.md }]}>
              Document upload from the phone is not supported yet. To submit papers, please visit the hospital
              billing desk.
            </Text>
          </Screen>
        );
      }}
    </WithStay>
  );
}
