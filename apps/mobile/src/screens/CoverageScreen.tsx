import { Text, View } from 'react-native';
import { peso } from '../lib/format';
import { Badge, Row, Screen, SectionHeader } from '../ui/kit';
import { C, S, T } from '../ui/theme';
import { WithStay } from './common';

const DISCOUNT_LABEL = { NONE: null, SENIOR: 'Senior citizen', PWD: 'Person with disability' } as const;

export function CoverageScreen() {
  return (
    <WithStay>
      {({ d, refreshing, refresh }) => {
        const l = d.ledger!;
        const discount = DISCOUNT_LABEL[d.stay.discountKind];
        const statutory = l.vatExemptionCents + l.seniorPwdDiscountCents;
        return (
          <Screen refreshing={refreshing} onRefresh={refresh} background={C.surface} gap={S.md}>
            <SectionHeader title="Benefits applied" />
            <View>
              <Row label="PhilHealth" value={peso(l.philhealthCents)} />
              <Row label="HMO" value={peso(l.hmoCents)} />
              <Row label="Statutory discounts" value={peso(statutory)} />
              <Row label="Your responsibility" value={peso(l.netPatientDueCents)} />
              <Row label="Remaining balance" value={peso(l.balanceCents)} bold last />
            </View>

            <Divider />
            <SectionHeader title="PhilHealth" />
            <Badge
              tone={l.philhealthCents > 0 ? 'good' : 'neutral'}
              label={l.philhealthCents > 0 ? 'Applied' : 'Not applied'}
            />
            <Text style={T.body}>
              {l.philhealthCents > 0
                ? 'Your PhilHealth case rate was applied before any HMO. No action needed.'
                : 'No PhilHealth benefit is on this bill. Ask the billing desk if you are a member.'}
            </Text>
            <Row label="Benefit applied" value={peso(l.philhealthCents)} last />

            <Divider />
            <SectionHeader title="HMO authorization" />
            <Badge
              tone={l.hmoCents > 0 ? 'good' : 'neutral'}
              label={l.hmoCents > 0 ? 'HMO approved' : 'No HMO on this bill'}
            />
            <Text style={T.body}>
              {l.hmoCents > 0
                ? 'Your HMO approved the covered amount after PhilHealth.'
                : 'If you have an HMO card, show it at the billing desk so they can request a letter of authorization.'}
            </Text>
            <Row label="Approved amount" value={peso(l.hmoCents)} last />

            <Divider />
            <SectionHeader title="Statutory discounts" />
            <Badge
              tone={discount ? 'good' : 'neutral'}
              label={discount ? `${discount} discount applied` : 'None applied'}
            />
            <Row label="VAT exemption" value={peso(l.vatExemptionCents)} />
            <Row label="20% senior / PWD discount" value={peso(l.seniorPwdDiscountCents)} last />
            <Text style={T.meta}>
              Philippine law sets the order: VAT exemption and the senior/PWD discount come off first, then
              PhilHealth, then your HMO. What remains is your share.
            </Text>
          </Screen>
        );
      }}
    </WithStay>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: C.border, marginVertical: S.sm }} />;
}
