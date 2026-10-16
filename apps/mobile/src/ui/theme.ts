import { StyleSheet } from 'react-native';

// The v1 MedCore palette, shared with the staff dashboard (apps/web/src/index.css):
// navy/slate surfaces with one accessible teal, mint for selection.
export const C = {
  paper: '#F5F6F8',
  surface: '#FFFFFF',
  elevated: '#EEF0F3',
  input: '#F3F5F7',
  border: '#D3DCE5',
  inputBorder: '#7F8EA0',
  ink: '#0F172A',
  secondary: '#475569',
  faint: '#64748B',
  brand: '#087F70',
  brandDark: '#096659',
  brandSoft: '#DCF1EB',
  brandBorder: '#AAD5C9',
  hero: '#0F2A4A',
  heroSub: 'rgba(255,255,255,0.92)',
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

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, section: 28, gutter: 22 } as const;
export const R = { control: 12, card: 16, hero: 22, pill: 28 } as const;

export const T = StyleSheet.create({
  display: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    color: C.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
  heroFigure: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  heroEyebrow: { fontSize: 14, fontWeight: '600', color: C.heroSub },
  heroSub: { fontSize: 14, lineHeight: 19, color: C.heroSub },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '600', color: C.ink, letterSpacing: -0.2 },
  section: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: C.ink },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: C.ink },
  body: { fontSize: 16, lineHeight: 23, color: C.ink },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: C.ink },
  row: { fontSize: 14, lineHeight: 20, color: C.ink },
  meta: { fontSize: 13, lineHeight: 19, color: C.secondary },
  small: { fontSize: 12, lineHeight: 16, color: C.faint },
  money: { fontSize: 15, lineHeight: 21, color: C.ink, fontVariant: ['tabular-nums'] },
});
