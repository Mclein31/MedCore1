import { useState } from 'react';
import { usePullRefresh } from '../hooks/usePullRefresh';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { usePatient } from '../hooks/usePatient';
import { formatPeso, hasHmo, remainingBalance } from '../lib/format';
import { Camera } from '../components/SolarIcons';
import { CoraAvatar } from '../components/CoraAvatar';
import { CoraAssistantModal } from '../components/CoraAssistantModal';
import { BenefitCardScannerModal } from '../components/BenefitCardScannerModal';
import {
  ActionButton,
  C,
  EmptyState,
  ErrorState,
  LoadingState,
  RefreshNotice,
  Row,
  Screen,
  SectionHeader,
  StatusBadge,
  T,
} from '../components/ui';
export default function CoverageScreen({ navigation }: { navigation?: any }) {
  const { currentEncounter: enc, loading, error, refresh } = usePatient();
  const pullRefresh = usePullRefresh(refresh);
  const [coraOpen, setCoraOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  if (loading && !enc) return <LoadingState message="Loading your coverage…" />;
  if (error && !enc) return <ErrorState message={error} onRetry={refresh} />;
  if (!enc)
    return (
      <Screen safeBottom={false}>
        <EmptyState
          title="No coverage yet"
          detail="PhilHealth and HMO details will appear when a hospital stay is linked."
        />
      </Screen>
    );
  if (enc.billState === 'DRAFT')
    return (
      <Screen safeBottom={false}>
        <EmptyState
          title="Bill not available yet"
          detail="Your hospital is still preparing your statement. Charges and benefits appear after the bill is finalized."
        />
      </Screen>
    );
  const w = enc.waterfall;
  const hmo = enc.hmo;
  return (
    <Screen safeBottom={false}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <RefreshNotice error={error} onRetry={refresh} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <ActionButton
            stretch
            title="Ask Cora AI"
            a11y="Ask Cora AI about my coverage"
            onPress={() => setCoraOpen(true)}
            icon={<CoraAvatar size={22} />}
          />
          <ActionButton
            stretch
            tone="blue"
            title="Scan Card OCR"
            a11y="Scan Card OCR, benefit card or government ID"
            onPress={() => setScannerOpen(true)}
            icon={<Camera size={15} color={C.blue} />}
          />
        </View>

        <SectionHeader title="Benefits applied" />
        <View style={{ paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Row label="PhilHealth" value={formatPeso(w.philhealthTotal)} />
          <Row label="HMO" value={formatPeso(w.hmoApprovedAmount)} />
          <Row label="Statutory discounts" value={formatPeso(w.vatExemption + w.seniorPwdDiscount)} />
          <Row label="Your responsibility" value={formatPeso(w.netPatientDue)} />
          <Row label="Remaining balance" value={formatPeso(remainingBalance(enc))} bold />
        </View>
        <SectionHeader title="PhilHealth" />
        <View style={{ paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <StatusBadge tone="info" text="Benefit amount recorded" />
          <Text style={[T.body, { color: C.secondary, marginTop: 12 }]}>
            Claim status and case-rate details are not available in the patient app yet.
          </Text>
          <View style={{ marginTop: 12 }}>
            <Row label="Benefit applied" value={formatPeso(w.philhealthTotal)} />
          </View>
        </View>
        <SectionHeader title="HMO authorization" />
        {hasHmo(enc) ? (
          <View style={{ paddingBottom: 20 }}>
            <Text style={T.cardTitle}>{hmo.providerName}</Text>
            <Text style={[T.body, { color: C.secondary, marginTop: 12 }]}>
              Provider details, authorization status and benefit limits are not available in the patient app
              yet.
            </Text>
            <Row label="Benefit applied" value={formatPeso(hmo.approvedAmount)} />
          </View>
        ) : (
          <Text style={T.body}>
            No HMO benefit is applied to this bill. Contact hospital billing for coverage details.
          </Text>
        )}
      </ScrollView>
      <CoraAssistantModal
        visible={coraOpen}
        onClose={() => setCoraOpen(false)}
        encounter={enc}
        navigation={navigation}
        initialQuery="Can you explain my PhilHealth and HMO coverage for this hospital stay?"
      />
      <BenefitCardScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} />
    </Screen>
  );
}
