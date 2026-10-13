import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { BillItem, PatientEncounter } from '../types/domain';
import { formatPeso, remainingBalance } from '../lib/format';
import { C, EmptyState, Expandable, Field, Row, SectionHeader, StatusBadge, T } from './ui';

const CATEGORY_LABELS: Record<string, string> = { ROOM_BOARD: 'Room & board', PHARMACY: 'Medicines', LABORATORY: 'Laboratory', CENTRAL_SUPPLIES: 'Supplies', PROFESSIONAL_FEE: 'Professional fees' };
export default function BillBreakdown({ encounter }: { encounter: PatientEncounter }) {
  const [query, setQuery] = useState('');
  const w = encounter.waterfall;
  const groups = useMemo(() => {
    const map = new Map<string, BillItem[]>();
    const search = query.trim().toLowerCase();
    for (const item of encounter.items) {
      if (search && !`${item.description} ${item.plainLanguageExplainer} ${CATEGORY_LABELS[item.category] || item.category}`.toLowerCase().includes(search)) continue;
      const group = map.get(item.category) || []; group.push(item); map.set(item.category, group);
    }
    return [...map.entries()];
  }, [encounter.items, query]);
  return <>
    <SectionHeader title="Your bill breakdown" />
    <Text style={T.meta}>Additional adjustments include the VAT exemption and Senior / PWD discount shown below.</Text>
    <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}><Row label="Total charges" value={formatPeso(w.grossTotal)} /><Row label="VAT exemption" value={`−${formatPeso(w.vatExemption)}`} /><Row label="Senior / PWD discount" value={`−${formatPeso(w.seniorPwdDiscount)}`} /><Row label="PhilHealth benefit" value={`−${formatPeso(w.philhealthTotal)}`} /><Row label="HMO benefit" value={`−${formatPeso(w.hmoApprovedAmount)}`} /><Row label="Patient responsibility" value={formatPeso(w.netPatientDue)} /><Row label="Payments recorded" value={formatPeso(encounter.amountPaid ?? w.patientPaid ?? 0)} /><Row label="Remaining balance" value={formatPeso(remainingBalance(encounter))} bold />
      {encounter.promissoryNote && <Text style={[T.meta, { marginTop: 12 }]}>Your payment plan is separate from payments already made. Its repayment schedule appears in Payments.</Text>}
    </View>
    <SectionHeader title={`Itemized charges · ${encounter.items.length}`} />
    <Field label="Search your charges" placeholder="Search charges" trailingIcon="search" value={query} onChangeText={setQuery} hint="Search by item name or charge category." />
    {groups.length === 0 && <EmptyState title={query.trim() ? 'No matching charges' : 'No charges posted'} detail={query.trim() ? 'Try a different item name or clear your search.' : 'Your hospital will post charges here as they become available.'} />}
    {groups.map(([category, items]) => <Expandable key={category} title={CATEGORY_LABELS[category] || category} subtitle={`${items.length} item${items.length === 1 ? '' : 's'} · Patient share ${formatPeso(items.reduce((sum, item) => sum + item.patientOop, 0))}`}>
      {items.map((item, index) => <View key={item.id} style={index > 0 ? { borderTopWidth: 1, borderTopColor: C.border } : undefined}><Expandable inset title={item.description} subtitle={`${item.qty} × ${formatPeso(item.unitPrice)} · Patient share ${formatPeso(item.patientOop)}`}>
        <Text style={T.body}>{item.plainLanguageExplainer || 'Ask the hospital billing desk if you need help understanding this charge.'}</Text>
        {item.isDisputed && <View style={{ marginVertical: 8 }}><StatusBadge tone="warn" text="Billing issue under review" /></View>}
        {item.exclusionReasonClause && <Text style={[T.meta, { marginVertical: 8 }]}>{item.exclusionReasonClause}</Text>}
        <Row label="Charged" value={formatPeso(item.grossAmount)} /><Row label="PhilHealth share" value={formatPeso(item.philhealthCovered)} /><Row label="HMO share" value={formatPeso(item.hmoCovered)} /><Row label="Your share" value={formatPeso(item.patientOop)} bold />
      </Expandable></View>)}
    </Expandable>)}
  </>;
}
