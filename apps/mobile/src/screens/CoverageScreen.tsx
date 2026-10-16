import { Text, View } from 'react-native';
import { peso } from '../lib/format';
import { deductions } from '../ui/BillSummary';
import { Badge, Card, Row, Screen } from '../ui/kit';
import { S, T } from '../ui/theme';
import { WithStay } from './common';

const DISCOUNT_LABEL = { NONE: null, SENIOR: 'Senior citizen', PWD: 'Person with disability' } as const;

export function CoverageScreen() {
  return (
    <WithStay>
      {({ d, refreshing, refresh }) => {
        const l = d.ledger!;
        const covered = deductions(l).reduce((sum, r) => sum + r.cents, 0);
        const discount = DISCOUNT_LABEL[d.stay.discountKind];
        return (
          <Screen refreshing={refreshing} onRefresh={refresh}>
            <Card>
              <Text style={T.meta}>Taken off your bill</Text>
              <Text style={[T.display, { marginTop: S.xs }]}>{peso(covered)}</Text>
              <Text style={[T.meta, { marginTop: S.xs }]}>
                of {peso(l.grossCents)} in hospital charges. You are responsible for{' '}
                {peso(l.netPatientDueCents)}.
              </Text>
            </Card>

            <Card title="Discounts">
              {discount ? <Badge tone="good" label={`${discount} discount applied`} /> : null}
              <Row label="VAT exemption" value={peso(l.vatExemptionCents)} />
              <Row label="20% senior/PWD discount" value={peso(l.seniorPwdDiscountCents)} last />
              {!discount ? (
                <Text style={T.small}>
                  Senior citizens and PWDs get VAT exemption and a 20% discount. Show your ID at the billing
                  desk if it is missing.
                </Text>
              ) : null}
            </Card>

            <Card title="Insurance">
              <Row label="PhilHealth" hint="Case rate, applied first" value={peso(l.philhealthCents)} />
              <Row label="HMO" hint="Approved after PhilHealth" value={peso(l.hmoCents)} last />
            </Card>

            <Card title="How it adds up">
              <View style={{ gap: S.sm }}>
                <Text style={T.meta}>
                  Philippine law sets the order: the VAT exemption and senior/PWD discount come off first,
                  then PhilHealth pays its case rate, then your HMO covers what it approved. What remains is
                  your share.
                </Text>
                <Text style={T.meta}>
                  Coverage amounts come from the hospital’s billing office. Questions about an HMO approval go
                  to the billing desk or your HMO.
                </Text>
              </View>
            </Card>
          </Screen>
        );
      }}
    </WithStay>
  );
}
