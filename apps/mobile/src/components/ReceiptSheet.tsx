import { Image, Text, View } from 'react-native';
import { C, T } from './ui';
import { Icon } from './icons';
import { ASSETS } from '../lib/assets';
import { useFacilityName } from '../hooks/useFacility';
import { describeRail, formatDateTime, formatPeso } from '../lib/format';

export default function ReceiptSheet({ number, amount, rail, payer, date, reference, bill, patient, mrn, status = 'SUCCESS', surroundingColor = C.surface }: {
  number: string; amount: number; rail: string; payer: string; date: string | null | undefined; reference?: string; bill?: string; patient?: string; mrn?: string; status?: string; surroundingColor?: string;
}) {
  const facility = useFacilityName();
  const rows = [
    ['Date & time', formatDateTime(date)], ['Transaction reference', reference || number],
    ['Bill reference', bill || 'Not provided'], ['Patient', patient || payer], ...(mrn ? [['Patient number', mrn]] : []), ['Payment method', describeRail(rail)], ['Payer', payer], ['Currency', 'PHP'], ['Status', status === 'SUCCESS' ? 'Paid' : status]
  ];
  return <View style={{ backgroundColor: C.surface, marginVertical: 16, paddingHorizontal: 18, paddingTop: 40, paddingBottom: 28 }}>
    <View accessible={false} style={{ position: 'absolute', top: -4, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around' }}>{Array.from({ length: 20 }, (_, i) => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: surroundingColor }} />)}</View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="success" size={20} color={C.success} /><Text accessibilityRole="header" style={[T.body, { fontSize: 18, fontWeight: '600' }]}>Payment receipt</Text></View>
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 40 }}><Image source={ASSETS.brand.badge} resizeMode="contain" accessibilityLabel="MedCore" style={{ width: 28, height: 28 }} /><Text style={{ fontSize: 22, lineHeight: 28, fontWeight: '600', color: C.ink, textAlign: 'center', flexShrink: 1 }}>{facility}</Text></View>
    <Text style={[T.cardTitle, { textAlign: 'center', marginTop: 10 }]}>MedCore</Text>
    <Text selectable style={[T.meta, { textAlign: 'center', marginTop: 10 }]}>Receipt {number}</Text>
    <View style={{ borderTopWidth: 1, borderTopColor: C.border, borderStyle: 'dashed', marginTop: 28, paddingTop: 18, paddingBottom: 18 }}>
      {rows.map(([label, value]) => <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, minHeight: 40, paddingVertical: 10 }}><Text style={[T.meta, { fontSize: 13, flex: 1 }]}>{label}</Text><Text selectable style={{ fontSize: 13, lineHeight: 18, fontWeight: '500', color: label === 'Status' ? C.success : C.ink, textAlign: 'right', flexShrink: 1, maxWidth: '65%' }}>{value}</Text></View>)}
    </View>
    <View style={{ borderTopWidth: 1, borderTopColor: C.border, borderStyle: 'dashed', paddingTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}><Text style={[T.body, { fontWeight: '500' }]}>Amount paid</Text><Text style={{ fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'], color: C.ink }}>{formatPeso(amount)}</Text></View>
  </View>;
}
