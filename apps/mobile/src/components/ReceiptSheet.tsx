import { Text, View } from 'react-native';
import { C, LedgerRow, T } from './ui';
import { Icon } from './icons';
import Brand from './Brand';
import { describeRail, formatDateTime, formatPeso } from '../lib/format';

export default function ReceiptSheet({ number, amount, rail, payer, date, reference }: {
  number: string; amount: number; rail: string; payer: string; date: string | null | undefined; reference?: string;
}) {
  return <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 4, marginVertical: 16 }}>
    <View style={{ alignItems: 'center', padding: 20, gap: 12 }}>
      <Brand size={28} />
      <View accessible={false} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.successBg, alignItems: 'center', justifyContent: 'center' }}><Icon name="success" size={30} color={C.success} /></View>
      <Text accessibilityRole="header" style={T.title}>Payment recorded</Text>
      <Text style={[T.display, { textAlign: 'center' }]}>{formatPeso(amount)}</Text>
      <Text selectable style={[T.meta, { textAlign: 'center' }]}>{number}</Text>
    </View>
    <View style={{ borderTopWidth: 1, borderTopColor: C.border, borderStyle: 'dashed' }}>
      <LedgerRow title="Payment method" value={describeRail(rail)} />
      <LedgerRow title="Payer" value={payer} />
      <LedgerRow title="Date & time" value={formatDateTime(date)} />
      {reference && <LedgerRow title="Reference" value={reference} />}
      <LedgerRow title="Status" value="Recorded" tone="ok" last />
    </View>
  </View>;
}
