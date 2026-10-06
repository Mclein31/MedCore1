import { RefreshControl, ScrollView, Text } from 'react-native';
import { usePatient } from '../hooks/usePatient';
import { formatDate, formatPeso, remainingBalance } from '../lib/format';
import BillBreakdown from '../components/BillBreakdown';
import { EmptyState, ErrorState, Hero, LoadingState, RefreshNotice, Screen, T } from '../components/ui';
export default function BillScreen() {
  const { currentEncounter, loading, error, refresh } = usePatient();
  if (loading && !currentEncounter) return <LoadingState message="Loading your bill…" />;
  if (error && !currentEncounter) return <ErrorState message={error} onRetry={refresh} />;
  if (!currentEncounter) return <Screen><EmptyState title="No bill yet" detail="Your itemized bill will appear once hospital charges are posted." /></Screen>;
  return <Screen><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />} showsVerticalScrollIndicator={false}>
    <RefreshNotice error={error} onRetry={refresh} />
    <Text style={[T.meta, { marginTop: 12 }]}>{currentEncounter.encounterNumber} · {formatDate(currentEncounter.admissionDate)}</Text>
    <Hero eyebrow="Remaining hospital balance" figure={formatPeso(remainingBalance(currentEncounter))} sub={`Total patient responsibility: ${formatPeso(currentEncounter.waterfall.netPatientDue)} before payments and payment plans.`} />
    <BillBreakdown encounter={currentEncounter} />
  </ScrollView></Screen>;
}
