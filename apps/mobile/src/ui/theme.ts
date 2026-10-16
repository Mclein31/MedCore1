import { StyleSheet } from 'react-native';

// Navy, slate and one accessible teal, carried over from the first MedCore app.
export const C = {
  paper: '#F5F6F8',
  surface: '#FFFFFF',
  elevated: '#EEF0F3',
  border: '#D3DCE5',
  inputBorder: '#7F8EA0',
  ink: '#0F172A',
  secondary: '#475569',
  faint: '#64748B',
  brand: '#087F70',
  brandDark: '#096659',
  brandSoft: '#DCF1EB',
  hero: '#0F2A4A',
  heroSub: 'rgba(255,255,255,0.86)',
  success: '#047857',
  successBg: '#ECFDF5',
  successBorder: '#6EE7B7',
  warning: '#B45309',
  warningBg: '#FFFBEB',
  danger: '#BE123C',
  dangerBg: '#FFF1F2',
  info: '#0369A1',
  infoBg: '#E0F2FE',
  scrim: 'rgba(15,23,42,0.45)',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, gutter: 20 } as const;
export const R = { control: 12, card: 16, hero: 22, pill: 999 } as const;

export const T = StyleSheet.create({
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: C.ink },
  section: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: C.ink },
  body: { fontSize: 16, lineHeight: 22, color: C.ink },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: C.ink },
  meta: { fontSize: 14, lineHeight: 19, color: C.secondary },
  small: { fontSize: 12, lineHeight: 16, color: C.faint },
  money: { fontSize: 16, lineHeight: 22, color: C.ink, fontVariant: ['tabular-nums'] },
});
