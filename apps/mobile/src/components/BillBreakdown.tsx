import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { BillItem, PatientEncounter } from '../types/domain';
import { formatPeso, remainingBalance } from '../lib/format';
import { usePatient } from '../hooks/usePatient';
import QuestionChargeSheet from './QuestionChargeSheet';
import { C, EmptyState, Expandable, Field, Row, SectionHeader, StatusBadge, T } from './ui';

const CATEGORY_LABELS: Record<string, string> = {
  ROOM_BOARD: 'Room & board',
  PHARMACY: 'Medicines',
  LABORATORY: 'Laboratory',
  CENTRAL_SUPPLIES: 'Supplies',
  PROFESSIONAL_FEE: 'Professional fees',
  IMAGING: 'Imaging',
  PROCEDURE: 'Procedures',
};
export default function BillBreakdown({ encounter }: { encounter: PatientEncounter }) {
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState<BillItem | null>(null);
  const { refresh } = usePatient();
  const canQuestion = encounter.stage !== 'CLEARED_GATE_PASS';
  const w = encounter.waterfall;
  const groups = useMemo(() => {
    const map = new Map<string, BillItem[]>();
    const search = query.trim().toLowerCase();
    for (const item of encounter.items) {
      if (
        search &&
        !`${item.description} ${item.plainLanguageExplainer} ${CATEGORY_LABELS[item.category] || item.category}`
          .toLowerCase()
          .includes(search)
      )
        continue;
      const group = map.get(item.category) || [];
      group.push(item);
      map.set(item.category, group);
    }
    return [...map.entries()];
  }, [encounter.items, query]);
  if (encounter.billState === 'DRAFT')
    return (
      <EmptyState title="Bill not available yet" detail="Your hospital is still preparing this statement." />
    );
  return (
    <>
      <SectionHeader title="Your bill breakdown" />
      <Text style={T.meta}>
        Additional adjustments include the VAT exemption and Senior / PWD discount shown below.
      </Text>
      <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Row label="Total charges" value={formatPeso(w.grossTotal)} />
        <Row label="VAT exemption" value={`−${formatPeso(w.vatExemption)}`} />
        <Row label="Senior / PWD discount" value={`−${formatPeso(w.seniorPwdDiscount)}`} />
        <Row label="PhilHealth benefit" value={`−${formatPeso(w.philhealthTotal)}`} />
        <Row label="HMO benefit" value={`−${formatPeso(w.hmoApprovedAmount)}`} />
        <Row label="Patient responsibility" value={formatPeso(w.netPatientDue)} />
        <Row label="Payments recorded" value={formatPeso(encounter.amountPaid ?? w.patientPaid ?? 0)} />
        <Row label="Remaining balance" value={formatPeso(remainingBalance(encounter))} bold />
        {encounter.promissoryNote && (
          <Text style={[T.meta, { marginTop: 12 }]}>
            Your payment plan is separate from payments already made. Its repayment schedule appears in
            Payments.
          </Text>
        )}
      </View>
      <SectionHeader title={`Itemized charges · ${encounter.items.length}`} />
      <Field
        label="Search your charges"
        placeholder="Search charges"
        trailingIcon="search"
        value={query}
        onChangeText={setQuery}
        hint="Search by item name or charge category."
      />
      {groups.length === 0 && (
        <EmptyState
          title={query.trim() ? 'No matching charges' : 'No charges posted'}
          detail={
            query.trim()
              ? 'Try a different item name or clear your search.'
              : 'Your hospital will post charges here as they become available.'
          }
        />
      )}
      {groups.map(([category, items]) => (
        <Expandable
          key={category}
          title={CATEGORY_LABELS[category] || category}
          subtitle={`${items.length} item${items.length === 1 ? '' : 's'} · Charges ${formatPeso(items.reduce((sum, item) => sum + item.grossAmount, 0))}`}
        >
          {items.map((item, index) => (
            <View
              key={item.id}
              style={index > 0 ? { borderTopWidth: 1, borderTopColor: C.border } : undefined}
            >
              <Expandable
                inset
                title={item.description}
                subtitle={`${item.qty} × ${formatPeso(item.unitPrice)}`}
              >
                <Text style={T.body}>
                  {item.plainLanguageExplainer ||
                    'Ask the hospital billing desk if you need help understanding this charge.'}
                </Text>
                {item.isDisputed && (
                  <View style={{ marginVertical: 8 }}>
                    <StatusBadge tone="warn" text="Billing issue under review" />
                  </View>
                )}
                {item.exclusionReasonClause && (
                  <Text style={[T.meta, { marginVertical: 8 }]}>{item.exclusionReasonClause}</Text>
                )}
                <Row label="Charged" value={formatPeso(item.grossAmount)} />
                {item.allocationAvailable === false ? (
                  <Text style={T.meta}>
                    Coverage allocation per charge is not available. See the bill-wide benefit totals above.
                  </Text>
                ) : (
                  <>
                    <Row label="PhilHealth share" value={formatPeso(item.philhealthCovered)} />
                    <Row label="HMO share" value={formatPeso(item.hmoCovered)} />
                    <Row label="Your share" value={formatPeso(item.patientOop)} bold />
                  </>
                )}
                {canQuestion && !item.isDisputed && (
                  <Pressable
                    onPress={() => setAsking(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Question ${item.description}`}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={{ color: C.brand, fontWeight: '600' }}>Question this charge</Text>
                  </Pressable>
                )}
              </Expandable>
            </View>
          ))}
        </Expandable>
      ))}
      <QuestionChargeSheet
        encounterId={encounter.uuid}
        item={asking}
        onClose={() => setAsking(null)}
        onFiled={() => void refresh()}
      />
    </>
  );
}
