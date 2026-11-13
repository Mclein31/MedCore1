import { useState } from 'react';
import { FadeIn, BillSkeleton, useRevealAfterSkeleton } from '../components/Skeleton';
import { usePullRefresh } from '../hooks/usePullRefresh';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { usePatient } from '../hooks/usePatient';
import { formatDate, formatPeso, remainingBalance } from '../lib/format';
import { gatePassRoute } from '../navigation/gatePassRoute';
import { CoraAvatar } from '../components/CoraAvatar';
import BillBreakdown from '../components/BillBreakdown';
import QuickActions from '../components/QuickActions';
import { EXPLAIN_MY_BILL_QUERY } from '../lib/coraConversation';
import { CoraAssistantModal } from '../components/CoraAssistantModal';
import {
  ActionButton,
  C,
  EmptyState,
  ErrorState,
  Hero,
  PrimaryButton,
  RefreshNotice,
  Screen,
  StatusBadge,
  T,
} from '../components/ui';
export default function BillScreen({ navigation }: { navigation: any }) {
  const { currentEncounter, loading, error, refresh } = usePatient();
  const pullRefresh = usePullRefresh(refresh);
  const [coraOpen, setCoraOpen] = useState(false);
  const reveal = useRevealAfterSkeleton(loading && !currentEncounter);
  if (loading && !currentEncounter) return <BillSkeleton label="Loading your bill…" />;
  if (error && !currentEncounter) return <ErrorState message={error} onRetry={refresh} />;
  if (!currentEncounter)
    return (
      <Screen safeBottom={false}>
        <EmptyState
          title="No bill yet"
          detail="Your itemized bill will appear once hospital charges are posted."
        />
      </Screen>
    );
  if (currentEncounter.billState === 'DRAFT')
    return (
      <Screen safeBottom={false}>
        <EmptyState
          title="Bill not available yet"
          detail="Your hospital is still preparing your statement. Charges and benefits appear after the bill is finalized."
        />
      </Screen>
    );
  const enc = currentEncounter;
  const balance = remainingBalance(enc);
  // v2 marks a fully settled bill SETTLED (and clears the stay); 'PAID' is the v1 name.
  const paid = enc.billState === 'SETTLED' || enc.billState === 'PAID' || enc.stage === 'CLEARED_GATE_PASS';
  return (
    <FadeIn active={reveal} background={C.surface}>
      <Screen gutter={0} topSpacing={0} safeBottom={false}>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 28 }}
          refreshControl={
            <RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: C.brandSoft,
              borderBottomLeftRadius: 24,
              borderBottomRightRadius: 24,
              padding: 22,
              paddingTop: 16,
              paddingBottom: 36,
            }}
          >
            <View style={{ marginBottom: 24 }}>
              <Hero
                eyebrow="Your hospital bill"
                amountLabel="Remaining balance"
                figure={formatPeso(balance)}
                trailing={<Text style={[T.meta, { color: C.surface }]}>{formatDate(enc.admissionDate)}</Text>}
              />
            </View>
            <QuickActions
              actions={[
                { label: 'Payments', icon: 'payments', onPress: () => navigation.navigate('Payments') },
                { label: 'Coverage', icon: 'coverage', onPress: () => navigation.navigate('Coverage') },
                { label: 'Documents', icon: 'file', onPress: () => navigation.navigate('Documents') },
              ]}
            />
          </View>
          <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
            <RefreshNotice error={error} onRetry={refresh} />
            <Text style={T.meta}>
              {enc.encounterNumber} · Your responsibility before payments:{' '}
              {formatPeso(enc.waterfall.netPatientDue)}
            </Text>
            <View style={{ marginTop: 12 }}>
              <StatusBadge
                tone={paid ? 'ok' : enc.stage === 'PENDING_SETTLEMENT' ? 'info' : 'warn'}
                text={
                  paid
                    ? 'Paid'
                    : enc.stage === 'PENDING_SETTLEMENT'
                      ? 'Final bill ready'
                      : 'Bill under review'
                }
              />
            </View>
            {balance > 0 && enc.stage === 'PENDING_SETTLEMENT' && (
              <PrimaryButton
                title="Continue to Payment"
                disabled={!!error || loading}
                onPress={() =>
                  navigation.navigate('PaymentFlow', { encounterId: enc.uuid, startAtMethod: true })
                }
              />
            )}
            {enc.stage === 'CLEARED_GATE_PASS' && (
              <PrimaryButton
                title="View Digital Gate Pass"
                onPress={() => navigation.navigate(...gatePassRoute(enc.uuid, enc.dischargePass?.passNumber))}
              />
            )}
            <View style={{ marginTop: 14, marginBottom: 10 }}>
              <ActionButton
                title="Explain My Bill with Cora AI"
                onPress={() => setCoraOpen(true)}
                icon={<CoraAvatar size={22} />}
              />
            </View>
            <BillBreakdown encounter={enc} />
          </View>
        </ScrollView>
        <CoraAssistantModal
          visible={coraOpen}
          onClose={() => setCoraOpen(false)}
          encounter={enc}
          navigation={navigation}
          initialQuery={EXPLAIN_MY_BILL_QUERY}
          autoSendInitialQuery
          initialMode="WHY_DO_I_OWE"
        />
      </Screen>
    </FadeIn>
  );
}
