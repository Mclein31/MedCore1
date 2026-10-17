/**
 * MedCore Enterprise Control Tokens
 * Standardized dimensions, typography, radii, states, and variants across all UI controls.
 * Inspired by Linear + Stripe + Apple HIG for high-density hospital operational cockpits.
 */

export type ControlSize = 'sm' | 'md' | 'lg';

export const CONTROL_SIZES = {
  sm: {
    height: 'h-8',
    py: 'py-1',
    px: 'px-2.5',
    text: 'text-xs',
    icon: 'w-3.5 h-3.5',
    gap: 'gap-1.5',
    radius: 'rounded-lg',
  },
  md: {
    height: 'h-9',
    py: 'py-1.5',
    px: 'px-3.5',
    text: 'text-xs sm:text-sm',
    icon: 'w-4 h-4',
    gap: 'gap-2',
    radius: 'rounded-lg',
  },
  lg: {
    height: 'h-11',
    py: 'py-2.5',
    px: 'px-5',
    text: 'text-sm font-semibold',
    icon: 'w-4.5 h-4.5',
    gap: 'gap-2.5',
    radius: 'rounded-lg',
  },
} as const;

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'destructive'
  | 'destructiveOutline'
  | 'success'
  | 'warning'
  | 'outline'
  | 'subtle';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-teal hover:bg-brand-teal-dark active:bg-brand-teal-dark text-white font-semibold shadow-2xs focus-visible:ring-2 focus-visible:ring-brand-teal-dark focus-visible:ring-offset-2',
  secondary:
    'border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400/25',
  tertiary:
    'text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400/25',
  ghost:
    'text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400/25',
  destructive:
    'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold shadow-2xs focus:outline-none focus:ring-2 focus:ring-rose-500/25',
  destructiveOutline:
    'border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-400/25',
  success:
    'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2',
  warning:
    'bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-semibold shadow-2xs focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2',
  outline:
    'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400/25',
  subtle:
    'border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400/25',
};

export const INPUT_CONTAINER_STYLES = {
  sm: 'h-8 text-xs rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 focus-within:bg-white transition-colors',
  md: 'h-9 text-xs sm:text-sm rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 focus-within:bg-white transition-colors',
} as const;

export const SELECT_STYLES = {
  sm: 'h-8 text-xs pl-2.5 pr-7 bg-white border border-slate-200 hover:border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-800 font-medium appearance-none cursor-pointer shadow-2xs transition-colors',
  md: 'h-9 text-xs sm:text-sm pl-3 pr-8 bg-white border border-slate-200 hover:border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-800 font-medium appearance-none cursor-pointer shadow-2xs transition-colors',
} as const;

export const SEGMENTED_CONTAINER_STYLE =
  'inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs shrink-0';

export const SEGMENTED_ITEM_STYLE = (isActive: boolean) =>
  `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
    isActive
      ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/60'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
  }`;
