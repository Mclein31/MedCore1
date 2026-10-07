import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FinancialIllustration from '../components/FinancialIllustration';
import { Icon } from '../components/icons';
import { C, PrimaryButton, Screen, T } from '../components/ui';
import type { OnboardingProgress } from '../lib/onboarding';

const PAGES = [
  { kind: 'bill' as const, title: 'Understand your hospital bill', detail: 'See each charge, the benefits applied, and what remains for you to pay.' },
  { kind: 'coverage' as const, title: 'Keep track of your coverage', detail: 'Follow PhilHealth and HMO updates, with clear explanations at every step.' },
  { kind: 'documents' as const, title: 'Payments and papers, together', detail: 'Choose a payment option and keep your receipts, statements and discharge pass within reach.' }
];
export default function OnboardingScreen({ progress, saving, error, onSave }: {
  progress: OnboardingProgress; saving: boolean; error: string | null; onSave: (value: OnboardingProgress) => Promise<void>;
}) {
  const page = PAGES[progress.step];
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (saving) return true;
      if (progress.step === 0) return false;
      void onSave({ completed: false, step: progress.step - 1 }); return true;
    });
    return () => subscription.remove();
  }, [onSave, progress.step, saving]);
  return <Screen safeTop gutter={0} background={C.surface}><StatusBar style="dark" />
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: Math.max(20, insets.bottom) }} showsVerticalScrollIndicator={false}>
      <View style={{ height: 48, justifyContent: 'center' }}>{progress.step > 0 && <Pressable onPress={() => { void onSave({ completed: false, step: progress.step - 1 }); }} disabled={saving} accessibilityRole="button" accessibilityLabel="Previous introduction page" style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name="back" size={20} color={C.ink} /></Pressable>}</View>
      <View style={{ width: Math.min(720, width - insets.left - insets.right), alignSelf: 'center', minHeight: Math.min(414, height * 0.49), justifyContent: 'center', marginHorizontal: -24 }}><FinancialIllustration kind={page.kind} /></View>
      <View style={{ paddingHorizontal: 12, alignItems: 'center', marginTop: 24, gap: 12 }}>
        <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '600', color: C.ink, textAlign: 'center' }}>{page.title}</Text>
        <Text style={[T.body, { color: C.secondary, textAlign: 'center' }]}>{page.detail}</Text>
      </View>
      <View style={{ flex: 1, minHeight: 28 }} />
      <View accessible accessibilityLabel={`Introduction, step ${progress.step + 1} of 3`} style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginVertical: 22 }}>{PAGES.map((_, i) => <View key={i} style={{ width: i === progress.step ? 13 : 5, height: 5, borderRadius: 3, backgroundColor: i === progress.step ? C.brand : C.border }} />)}</View>
      {error && <Text accessibilityRole="alert" style={[T.meta, { color: C.danger, marginBottom: 8 }]}>{error}</Text>}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable disabled={saving} accessibilityState={{ disabled: saving }} accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={() => { void onSave({ ...progress, completed: true }); }} style={({ pressed }) => ({ flex: 1, minHeight: 50, marginTop: 12, borderWidth: 1, borderColor: C.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center', opacity: saving || pressed ? 0.5 : 1 })}><Text style={[T.body, { color: C.brand }]}>Skip</Text></Pressable>
        <View style={{ flex: 1 }}><PrimaryButton compact title={saving ? 'Saving…' : progress.step === 2 ? 'Get started' : 'Next'} disabled={saving} onPress={() => { void onSave({ completed: progress.step === 2, step: Math.min(2, progress.step + 1) }); }} /></View>
      </View>
    </ScrollView>
  </Screen>;
}
