import { View } from 'react-native';
import { peso } from '../lib/format';
import type { StayLedger } from '../lib/types';
import { Notice, Row } from './kit';
import { S } from './theme';

/** The statutory order: VAT exemption, senior/PWD discount, PhilHealth, then HMO. */
export function deductions(l: StayLedger): { label: string; cents: number; hint: string }[] {
  return [
    {
      label: 'VAT exemption',
      cents: l.vatExemptionCents,
      hint: 'Senior citizens and PWDs do not pay VAT on hospital care.',
    },
    {
      label: 'Senior / PWD discount',
      cents: l.seniorPwdDiscountCents,
      hint: '20% under RA 9994 and RA 10754.',
    },
    {
      label: 'PhilHealth benefit',
      cents: l.philhealthCents,
      hint: 'Your case rate, applied before any HMO.',
    },
    { label: 'HMO benefit', cents: l.hmoCents, hint: 'What your HMO approved after PhilHealth.' },
  ];
}

export function BillSummary({ l }: { l: StayLedger }) {
  return (
    <View>
      <Row label="Total charges" value={peso(l.grossCents)} />
      {deductions(l).map((r) => (
        <Row key={r.label} label={r.label} value={`−${peso(r.cents)}`} />
      ))}
      <Row label="Patient responsibility" value={peso(l.netPatientDueCents)} />
      {l.paidCents > 0 ? <Row label="Payments recorded" value={`−${peso(l.paidCents)}`} /> : null}
      {l.financedCents > 0 ? (
        <Row label="On your 0% payment plan" value={`−${peso(l.financedCents)}`} />
      ) : null}
      <Row label="Remaining balance" value={peso(l.balanceCents)} bold last />
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
