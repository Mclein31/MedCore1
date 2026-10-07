import { useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Brand from '../components/Brand';
import { Icon } from '../components/icons';
import { C, LedgerRow, PrimaryButton, Screen, SecondaryButton, T } from '../components/ui';
import type { OnboardingProgress } from '../lib/onboarding';

const PAGES = [
  { icon: 'bill', eyebrow: 'Your bill, explained', title: 'Know what you owe.\nUnderstand why.', detail: 'See hospital charges, benefits and discounts together, with a clear view of your remaining balance.', rows: ['Itemized hospital charges', 'Coverage and discounts applied', 'Your remaining balance'] },
  { icon: 'coverage', eyebrow: 'Coverage without the guesswork', title: 'Follow your benefits,\none step at a time.', detail: 'Track PhilHealth and HMO review status, see the benefits applied, and understand what still needs attention.', rows: ['PhilHealth claim updates', 'HMO authorization status', 'Clear coverage explanations'] },
  { icon: 'file', eyebrow: 'Everything within reach', title: 'Payments and papers.\nAll in one place.', detail: 'Choose a payment option, find your receipts and repayment plans, and access your hospital discharge documents.', rows: ['Flexible payment options', 'Receipts and statements', 'Your discharge pass'] }
];

export default function OnboardingScreen({ progress, saving, error, onSave }: {
  progress: OnboardingProgress; saving: boolean; error: string | null; onSave: (value: OnboardingProgress) => Promise<void>;
}) {
  const page = PAGES[progress.step];
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (saving) return true;
      if (progress.step === 0) return false;
      void onSave({ completed: false, step: progress.step - 1 }); return true;
    });
    return () => subscription.remove();
  }, [onSave, progress.step, saving]);
  return <Screen safeTop><ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(24, insets.bottom) }} showsVerticalScrollIndicator={false}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <Brand size={36} />
      <Pressable disabled={saving} accessibilityState={{ disabled: saving }} accessibilityRole="button" accessibilityLabel="Skip introduction" style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }} onPress={() => { void onSave({ ...progress, completed: true }); }}><Text style={[T.section, { color: C.brand }]}>Skip</Text></Pressable>
    </View>
    <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 28 }}>
      <View accessible={false} style={{ width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: C.brandSoft, marginBottom: 28 }}><Icon name={page.icon} size={40} color={C.brand} /></View>
      <Text style={T.eyebrow}>{page.eyebrow}</Text>
      <Text accessibilityRole="header" style={[T.display, { marginTop: 12, lineHeight: 38 }]}>{page.title}</Text>
      <Text style={[T.body, { color: C.secondary, marginTop: 16, marginBottom: 24 }]}>{page.detail}</Text>
      <View style={{ backgroundColor: C.surface, borderRadius: 20 }}>{page.rows.map((row, i) => <LedgerRow key={row} title={row} last={i === 2} />)}</View>
    </View>
    <View accessible accessibilityLabel={`Introduction, step ${progress.step + 1} of 3`} style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>{PAGES.map((_, i) => <View key={i} style={{ height: 5, width: i === progress.step ? 28 : 8, borderRadius: 4, backgroundColor: i === progress.step ? C.brand : C.border }} />)}</View>
    {error && <Text accessibilityRole="alert" style={[T.meta, { color: C.danger }]}>{error}</Text>}
    <PrimaryButton title={saving ? 'Saving…' : progress.step === 2 ? 'Get started' : 'Next'} disabled={saving} onPress={() => { void onSave({ completed: progress.step === 2, step: Math.min(2, progress.step + 1) }); }} />
    {progress.step > 0 && <SecondaryButton title="Back" disabled={saving} onPress={() => { void onSave({ completed: false, step: progress.step - 1 }); }} />}
  </ScrollView></Screen>;
}
