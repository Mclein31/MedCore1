import { useEffect, useRef } from 'react';
import { Animated, Platform, Text, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { describeRail, formatDateTime, formatPeso } from '../lib/format';
import { Icon } from './icons';
import { C, LedgerRow, PrimaryButton, SecondaryButton, T } from './ui';

export default function PaymentSuccess({ amount, rail, reference, hospital, bill, date, onReceipt, onBills }: {
  amount: number; rail: string; reference: string; hospital: string; bill: string; date: string | null;
  onReceipt: () => void; onBills: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) { scale.setValue(1); return; }
    scale.setValue(0.6);
    const animation = Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [reduced, scale]);
  return <View style={{ paddingVertical: 24 }}>
    <View style={{ alignItems: 'center', gap: 16, marginBottom: 28 }}>
      <Animated.View accessible={false} style={{ transform: [{ scale }], width: 88, height: 88, borderRadius: 44, backgroundColor: C.successBg, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" color={C.success} size={44} /></Animated.View>
      <Text accessibilityRole="header" style={[T.title, { fontSize: 23, lineHeight: 30, textAlign: 'center' }]}>Payment Successful</Text>
      <Text style={T.display}>{formatPeso(amount)}</Text>
      <Text style={[T.body, { color: C.secondary, textAlign: 'center' }]}>Your payment has been received.</Text>
    </View>
    <LedgerRow title="Hospital" value={hospital} />
    <LedgerRow title="Bill reference" value={bill} />
    <LedgerRow title="Payment method" value={describeRail(rail)} />
    <LedgerRow title="Transaction reference" value={reference} />
    <LedgerRow title="Date & time" value={formatDateTime(date)} last />
    <PrimaryButton title="View Receipt" onPress={onReceipt} />
    <SecondaryButton title="Back to Bills" onPress={onBills} />
  </View>;
}
