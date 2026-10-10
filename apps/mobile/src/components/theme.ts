// Dashboard navy/blue/slate palette, with one accessible teal primary.
// Geometry is normalized from UI_INSPO to a 390px phone (see reference mapping).
export const C = {
  paper: '#F8FAFC', surface: '#FFFFFF', elevated: '#F1F5F9', border: '#E2E8F0',
  ink: '#0F172A', secondary: '#475569', faint: '#64748B',
  brand: '#11806D', brandDark: '#0F6D5F', brandSoft: '#E7F4F0',
  blue: '#0284C7', blueDark: '#0369A1', blueSoft: '#E0F2FE',
  hero: '#0F2A4A', heroLight: '#18385E', heroSub: 'rgba(255,255,255,0.92)',
  success: '#047857', successBg: '#ECFDF5', warning: '#B45309', warningBg: '#FFFBEB',
  danger: '#BE123C', dangerBg: '#FFF1F2',
  gcash: '#175CD3', maya: '#14242A', mayaAccent: '#6DE6AA', note: '#93470B',
  scrim: 'rgba(15,23,42,0.45)',
  receiptSurround: '#CBD5E1',
  bg: '#F8FAFC', surfaceAlias: '#FFFFFF', primary: '#11806D', primaryDark: '#0F6D5F', text: '#0F172A'
} as const;
export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, section: 28, gutter: 22 } as const;
export const Radius = { control: 10, surface: 12, summary: 18, badge: 8, pill: 28, sheet: 28 } as const;
export const HeaderLayout = { height: 56, gutter: 22, titleSize: 20, titleLineHeight: 26, actionSize: 48, iconSize: 20, backSize: 42 } as const;
export const NavigationLayout = { iconSize: 24, shortcutSize: 44, shortcutHeight: 84, labelSize: 12 } as const;
