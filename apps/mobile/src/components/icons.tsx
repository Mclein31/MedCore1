import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Phone,
  LogOut,
  LockKeyhole,
  Info,
  Bell,
  Building2,
  Check,
  ChevronRight,
  CircleCheck,
  Clock,
  CreditCard,
  ChevronDown,
  FileText,
  Home,
  QrCode,
  Receipt,
  Scale,
  Search,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  User,
} from './SolarIcons';
import { ASSETS } from '../lib/assets';
import { C, NavigationLayout } from './theme';

// Solar Linear for controls; Bold indicates selected navigation on both apps.
// Original brand/provider artwork stays in the asset registry.

const SOLAR: Record<
  string,
  React.ComponentType<{
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    weight?: 'Linear' | 'Bold';
  }>
> = {
  back: ArrowLeft,
  eye: Eye,
  eyeOff: EyeOff,
  mail: Mail,
  contact: Phone,
  logout: LogOut,
  lock: LockKeyhole,
  info: Info,
  search: Search,
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
  chevron: ChevronRight,
  chevronDown: ChevronDown,
};

export function Icon({
  name,
  size = 22,
  color = C.secondary,
  weight = 'Linear',
}: {
  name: keyof typeof SOLAR | string;
  size?: number;
  color?: string;
  weight?: 'Linear' | 'Bold';
}) {
  const Cmp = SOLAR[name] || FileText;
  return <Cmp size={size} color={color} strokeWidth={1.7} weight={weight} />;
}

export function TabGlyph({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={[glyph.pill, focused && glyph.pillActive]}>
      <Icon
        name={name}
        size={NavigationLayout.iconSize}
        color={focused ? C.brand : C.secondary}
        weight={focused ? 'Bold' : 'Linear'}
      />
      {focused && <View style={glyph.dot} />}
    </View>
  );
}

// Original provider artwork, contained without changing proportions/colors.
// Unsupported brand marks use a semantic interface icon, never fake lettering.
export function ProviderMark({ rail, size = 46 }: { rail: string; size?: number }) {
  const src = (ASSETS.providerLogo as Record<string, number>)[rail];
  if (!src) {
    return (
      <Icon
        name={rail === 'QR_PH' ? 'qr' : rail === 'GCASH' || rail === 'MAYA' ? 'phone' : 'payments'}
        size={size}
        color={C.brand}
      />
    );
  }
  return (
    <Image
      source={src}
      resizeMode="contain"
      accessible={false}
      style={{
        width: rail === 'QR_PH' ? size * 2 : size,
        height: size,
        borderRadius: rail === 'QR_PH' ? 0 : 6,
      }}
    />
  );
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
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.brand },
});
