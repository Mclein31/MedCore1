import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { usePatient } from '../hooks/usePatient';
import { formatDate, formatPeso, remainingBalance } from '../lib/format';
import BillBreakdown from '../components/BillBreakdown';
import GradientSurface from '../components/GradientSurface';
import QuickActions from '../components/QuickActions';
import { C, EmptyState, ErrorState, LoadingState, RefreshNotice, Screen, T } from '../components/ui';
export default function BillScreen({ navigation }: { navigation: any }) {
  const { currentEncounter, loading, error, refresh } = usePatient();
  if (loading && !currentEncounter) return <LoadingState message="Loading your bill…" />;
  if (error && !currentEncounter) return <ErrorState message={error} onRetry={refresh} />;
  if (!currentEncounter) return <Screen><EmptyState title="No bill yet" detail="Your itemized bill will appear once hospital charges are posted." /></Screen>;
  const enc = currentEncounter;
  const balance = remainingBalance(enc);
  return <Screen gutter={0}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 28 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />} showsVerticalScrollIndicator={false}>
    <View style={{ backgroundColor: C.brandSoft, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, padding: 22, paddingTop: 16, paddingBottom: 36 }}>
      <GradientSurface style={{ borderRadius: 22, minHeight: 153, padding: 20, marginBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ fontSize: 12, color: C.surface }}>Your hospital bill</Text><Text style={{ fontSize: 11, color: C.surface }}>{formatDate(enc.admissionDate)}</Text></View>
        <Text style={{ fontSize: 12, color: C.surface, marginTop: 20 }}>Remaining balance</Text>
        <Text style={{ fontSize: 32, lineHeight: 40, fontWeight: '700', color: C.surface, fontVariant: ['tabular-nums'], marginTop: 4 }}>{formatPeso(balance)}</Text>
      </GradientSurface>
      <QuickActions actions={[
        { label: 'Pay bill', icon: 'payments', disabled: !!error || loading || balance <= 0 || enc.stage !== 'PENDING_SETTLEMENT', onPress: () => navigation.navigate('PaymentFlow', { encounterId: enc.uuid }) },
        { label: 'Coverage', icon: 'coverage', onPress: () => navigation.navigate('Coverage') },
        { label: 'Receipts', icon: 'bill', onPress: () => navigation.navigate('Payments') },
        { label: 'Documents', icon: 'file', onPress: () => navigation.navigate('Documents') }
      ]} />
    </View>
    <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
      <RefreshNotice error={error} onRetry={refresh} />
      <Text style={T.meta}>{enc.encounterNumber} · Your responsibility before payments: {formatPeso(enc.waterfall.netPatientDue)}</Text>
      <BillBreakdown encounter={enc} />
    </View>
  </ScrollView></Screen>;
}
