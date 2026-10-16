import { Text, View } from 'react-native';
import { peso } from '../lib/format';
import type { StayLedger } from '../lib/types';
import { Notice, Row } from './kit';
import { C, R, S, T } from './theme';

/** The statutory order: VAT exemption, senior/PWD discount, PhilHealth, then HMO. */
export function deductions(l: StayLedger): { label: string; cents: number; hint: string }[] {
  return [
    {
      label: 'VAT exemption (senior/PWD)',
      cents: l.vatExemptionCents,
      hint: 'By law, senior citizens and PWDs do not pay VAT on hospital care.',
    },
    {
      label: '20% senior/PWD discount',
      cents: l.seniorPwdDiscountCents,
      hint: 'Required by RA 9994 and RA 10754.',
    },
    {
      label: 'Paid by PhilHealth',
      cents: l.philhealthCents,
      hint: 'Your PhilHealth case rate, applied before any HMO.',
    },
    { label: 'Paid by your HMO', cents: l.hmoCents, hint: 'What your HMO approved after PhilHealth.' },
  ].filter((r) => r.cents > 0);
}

export function BillSummary({ l }: { l: StayLedger }) {
  return (
    <View>
      <Row label="Total hospital charges" value={peso(l.grossCents)} />
      {deductions(l).map((r) => (
        <Row key={r.label} label={r.label} hint={r.hint} value={`−${peso(r.cents)}`} />
      ))}
      <Row label="Your share" value={peso(l.netPatientDueCents)} bold />
      {l.paidCents > 0 ? <Row label="Already paid" value={`−${peso(l.paidCents)}`} /> : null}
      {l.financedCents > 0 ? (
        <Row label="On your payment plan (0% interest)" value={`−${peso(l.financedCents)}`} />
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          backgroundColor: C.brandSoft,
          borderRadius: R.control,
          padding: S.md,
          marginTop: S.md,
        }}
      >
        <Text style={[T.label, { color: C.brandDark }]}>Left to pay now</Text>
        <Text style={[T.money, { fontWeight: '700', color: C.brandDark }]}>{peso(l.balanceCents)}</Text>
      </View>
      {l.creditCents > 0 ? (
        <View style={{ marginTop: S.md }}>
          <Notice tone="info">
            The hospital owes you a refund of {peso(l.creditCents)}. The billing desk will contact you.
          </Notice>
        </View>
      ) : null}
    </View>
  );
}
