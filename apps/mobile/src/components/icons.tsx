import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  ArrowLeft, Eye, EyeOff, Mail, Phone, LogOut, LockKeyhole, Info, Bell, Building2, Check, ChevronRight, CircleCheck, Clock, CreditCard,
  FileText, Home, QrCode, Receipt, Scale, ShieldCheck, Smartphone, TriangleAlert, User
} from 'lucide-react-native';
import { ASSETS } from '../lib/assets';
import { C } from './theme';

// Central icon system. Generic interface icons come from lucide (matching
// the dashboard's lucide-react usage); only brand/provider artwork lives in
// PNG files via the asset registry.

const LUCIDE: Record<string, React.ComponentType<{ size?: number | string; color?: string; strokeWidth?: number | string }>> = {
  back: ArrowLeft, eye: Eye, eyeOff: EyeOff, mail: Mail, contact: Phone, logout: LogOut, lock: LockKeyhole, info: Info,
  home: Home,
  bill: Receipt,
  coverage: ShieldCheck,
  payments: CreditCard,
  profile: User,
  bell: Bell,
  check: Check,
  success: CircleCheck,
  warning: TriangleAlert,
  clock: Clock,
  qr: QrCode,
  phone: Smartphone,
  bank: Building2,
  scale: Scale,
  file: FileText,
  chevron: ChevronRight
};

export function Icon({ name, size = 22, color = C.secondary }: { name: keyof typeof LUCIDE | string; size?: number; color?: string }) {
  const Cmp = LUCIDE[name] || FileText;
  return <Cmp size={size} color={color} strokeWidth={1.7} />;
}

export function TabGlyph({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={[glyph.pill, focused && glyph.pillActive]}>
      <Icon name={name} size={24} color={focused ? C.brand : C.secondary} />
      {focused && <View style={glyph.dot} />}
    </View>
  );
}

// Provider brand mark from the filename-stable registry. Falls back to a
// monogram tile so the UI never breaks if an asset is swapped out.
export function ProviderMark({ rail, size = 46 }: { rail: string; size?: number }) {
  const src = (ASSETS.providerLogo as Record<string, number>)[rail];
  if (!src) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.42, fontWeight: '800', color: C.brand }}>{rail.charAt(0)}</Text>
      </View>
    );
  }
  return <Image source={src} resizeMode="contain" style={{ width: size, height: size }} accessibilityLabel={`${rail} logo`} />;
}

export function AvatarImage({ size = 42 }: { size?: number }) {
  return (
    <Image
      source={ASSETS.avatarDefault}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#E6EBF3' }}
      accessibilityLabel="Patient profile photo"
    />
  );
}

const glyph = StyleSheet.create({
  pill: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 4, gap: 3 },
  pillActive: {},
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.brand }
});
