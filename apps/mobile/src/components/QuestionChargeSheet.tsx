import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { formatPeso } from '../lib/format';
import { createBillingApi } from '../services/billingApi';
import type { BillItem } from '../types/domain';
import { ModalOverlay } from './ModalOverlay';
import { C, Field, PrimaryButton, SecondaryButton, T } from './ui';

// Not in the v1 app: v2 lets patients question a charge (POST /patient/stays/:id/disputes).
// Built from the v1 components so it matches the rest of the bill.
const CATEGORIES = [
  ['NOT_RECEIVED', 'Not received'],
  ['DUPLICATE', 'Duplicate'],
  ['WRONG_QUANTITY', 'Wrong quantity'],
  ['PRICE_DIFFERENCE', 'Price difference'],
  ['EXCESS_PROFESSIONAL_FEE', 'Excess professional fee'],
  ['OTHER', 'Other'],
] as const;

export default function QuestionChargeSheet({
  encounterId,
  item,
  onClose,
  onFiled,
}: {
  encounterId: string;
  item: BillItem | null;
  onClose: () => void;
  onFiled: () => void;
}) {
  const { client } = useAuth();
  const [category, setCategory] = useState<string>('NOT_RECEIVED');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    if (busy) return;
    setReason('');
    setError(null);
    onClose();
  };
  const send = async () => {
    if (!item || reason.trim().length < 10) {
      setError('Tell us a little more (at least 10 characters).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createBillingApi(client).fileDispute(encounterId, {
        chargeId: item.id,
        reason: reason.trim(),
        disputeCategory: category,
      });
      setReason('');
      onFiled();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'We could not send your question. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalOverlay
      visible={item !== null}
      onRequestClose={close}
      onBackdropPress={close}
      avoidKeyboard
      panelStyle={{
        width: '100%',
        maxWidth: 560,
        backgroundColor: C.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 22,
        paddingBottom: 34,
      }}
    >
      <Text accessibilityRole="header" style={T.title}>
        Question this charge
      </Text>
      {item && (
        <Text style={[T.meta, { marginTop: 4, marginBottom: 16 }]}>
          {item.description} · {formatPeso(item.grossAmount)}
        </Text>
      )}
      <Text style={[T.meta, { color: C.ink, fontWeight: '600', marginBottom: 8 }]}>What seems wrong?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {CATEGORIES.map(([value, label]) => {
          const selected = value === category;
          return (
            <Pressable
              key={value}
              onPress={() => setCategory(value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={{
                minHeight: 40,
                justifyContent: 'center',
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selected ? C.brand : C.border,
                backgroundColor: selected ? C.brandSoft : C.surface,
              }}
            >
              <Text style={{ color: selected ? C.brandDark : C.ink, fontWeight: selected ? '600' : '400' }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Field
        label="Tell us more"
        value={reason}
        onChangeText={setReason}
        editable={!busy}
        hint="A billing staff member will review it. You can still pay; you will be refunded if the charge is removed."
      />
      {error && (
        <Text style={[T.meta, { color: C.danger, marginBottom: 8 }]} accessibilityRole="alert">
          {error}
        </Text>
      )}
      <PrimaryButton
        title={busy ? 'Sending…' : 'Send question'}
        onPress={() => void send()}
        disabled={busy}
      />
      <View style={{ height: 10 }} />
      <SecondaryButton title="Cancel" onPress={close} disabled={busy} />
    </ModalOverlay>
  );
}
