// Dashboard navy/blue/slate palette, with one accessible teal primary.
// Apple-inspired grouped surfaces retain MedCore's accessible teal accent.
export const C = {
  paper: '#F5F6F8', surface: '#FFFFFF', elevated: '#EEF0F3', border: '#D3DCE5', inputBorder: '#7F8EA0',
  ink: '#0F172A', secondary: '#475569', faint: '#64748B',
  brand: '#087F70', brandDark: '#096659', brandSoft: '#DCF1EB', brandBorder: '#AAD5C9',
  blue: '#0275B5', blueDark: '#0369A1', blueSoft: '#E0F2FE', blueBorder: '#B7D9EE',
  hero: '#0F2A4A', heroLight: '#18385E', heroSub: 'rgba(255,255,255,0.92)',
  success: '#047857', successBg: '#ECFDF5', warning: '#B45309', warningBg: '#FFFBEB',
  danger: '#BE123C', dangerBg: '#FFF1F2',
  gcash: '#175CD3', maya: '#14242A', mayaAccent: '#6DE6AA', note: '#93470B',
  scrim: 'rgba(15,23,42,0.45)',
  receiptSurround: '#CBD5E1',
  bg: '#F5F6F8', surfaceAlias: '#FFFFFF', primary: '#087F70', primaryDark: '#096659', text: '#0F172A'
} as const;
export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, section: 28, gutter: 22 } as const;
export const Radius = { control: 12, surface: 16, summary: 22, badge: 8, pill: 28, sheet: 28 } as const;
export const HeaderLayout = { height: 56, gutter: 22, titleSize: 20, titleLineHeight: 26, actionSize: 48, iconSize: 20, backSize: 42, borderWidth: 1 } as const;
export const NavigationLayout = { iconSize: 24, shortcutSize: 44, shortcutHeight: 84, labelSize: 12 } as const;
export const TabBarLayout = { height: 64, target: 48, gutter: 12, padding: 4, maxWidth: 560, activeWidth: 116, duration: 180, nudge: 2 } as const;
