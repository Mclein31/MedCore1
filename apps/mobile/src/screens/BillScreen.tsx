import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { usePatient } from '../hooks/usePatient';
import { formatDate, formatPeso, remainingBalance } from '../lib/format';
import BillBreakdown from '../components/BillBreakdown';
import QuickActions from '../components/QuickActions';
import { C, EmptyState, ErrorState, Hero, LoadingState, PrimaryButton, RefreshNotice, Screen, StatusBadge, T } from '../components/ui';
export default function BillScreen({ navigation }: { navigation: any }) {
  const { currentEncounter, loading, error, refresh } = usePatient();
  if (loading && !currentEncounter) return <LoadingState message="Loading your bill…" />;
  if (error && !currentEncounter) return <ErrorState message={error} onRetry={refresh} />;
  if (!currentEncounter) return <Screen safeBottom={false}><EmptyState title="No bill yet" detail="Your itemized bill will appear once hospital charges are posted." /></Screen>;
  const enc = currentEncounter;
  const balance = remainingBalance(enc);
  return <Screen gutter={0} safeBottom={false}><ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 28 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />} showsVerticalScrollIndicator={false}>
    <View style={{ backgroundColor: C.brandSoft, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, padding: 22, paddingTop: 16, paddingBottom: 36 }}>
      <View style={{ marginBottom: 24 }}><Hero eyebrow="Your hospital bill" amountLabel="Remaining balance" figure={formatPeso(balance)} trailing={<Text style={[T.meta, { color: C.surface }]}>{formatDate(enc.admissionDate)}</Text>} /></View>
      <QuickActions actions={[
        { label: balance > 0 && enc.stage === 'PENDING_SETTLEMENT' ? 'Pay bill' : 'Payments', icon: 'payments', disabled: balance > 0 && enc.stage === 'PENDING_SETTLEMENT' && (!!error || loading), onPress: () => balance > 0 && enc.stage === 'PENDING_SETTLEMENT' ? navigation.navigate('PaymentFlow', { encounterId: enc.uuid }) : navigation.navigate('Payments') },
        { label: 'Coverage', icon: 'coverage', onPress: () => navigation.navigate('Coverage') },
        { label: 'Receipts', icon: 'bill', onPress: () => navigation.navigate('Payments') },
        { label: 'Documents', icon: 'file', onPress: () => navigation.navigate('Documents') }
      ]} />
    </View>
    <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
      <RefreshNotice error={error} onRetry={refresh} />
      <Text style={T.meta}>{enc.encounterNumber} · Your responsibility before payments: {formatPeso(enc.waterfall.netPatientDue)}</Text>
      <View style={{ marginTop: 12 }}><StatusBadge tone={enc.billState === 'PAID' ? 'ok' : enc.stage === 'PENDING_SETTLEMENT' ? 'info' : 'warn'} text={enc.billState === 'PAID' ? 'Paid' : enc.stage === 'PENDING_SETTLEMENT' ? 'Final bill ready' : 'Bill under review'} /></View>
      {balance > 0 && enc.stage === 'PENDING_SETTLEMENT' && <PrimaryButton title="Continue to Payment" disabled={!!error || loading} onPress={() => navigation.navigate('PaymentFlow', { encounterId: enc.uuid, startAtMethod: true })} />}
      <BillBreakdown encounter={enc} />
    </View>
  </ScrollView></Screen>;
}
