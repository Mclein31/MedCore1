// `fil` remains the legacy Taglish API code; `tl` is the distinct Tagalog mode.
export const CORA_LANGUAGE_IDS = ['en', 'fil', 'tl', 'ilo'] as const;
export type CoraLanguage = (typeof CORA_LANGUAGE_IDS)[number];
export const CORA_LANGUAGE_LABELS: Record<CoraLanguage, string> = {
  en: 'English',
  fil: 'Taglish',
  tl: 'Tagalog',
  ilo: 'Ilokano',
};
export const CORA_LANGUAGE_OPTIONS: CoraLanguage[] = ['fil', 'en', 'tl', 'ilo'];
export const CORA_TYPING_LABELS: Record<CoraLanguage, string> = {
  en: 'Cora is typing',
  fil: 'Typing si Cora',
  tl: 'Sumasagot si Cora',
  ilo: 'Agsursurat ni Cora',
};
export const CORA_ACTION_LABELS: Record<
  CoraLanguage,
  Record<'NAVIGATE_BILL' | 'NAVIGATE_PAYMENT' | 'NAVIGATE_COVERAGE' | 'NAVIGATE_DOCUMENTS', string>
> = {
  en: {
    NAVIGATE_BILL: 'Review bill',
    NAVIGATE_PAYMENT: 'View payment options',
    NAVIGATE_COVERAGE: 'Review coverage',
    NAVIGATE_DOCUMENTS: 'View documents',
  },
  fil: {
    NAVIGATE_BILL: 'I-review ang bill',
    NAVIGATE_PAYMENT: 'Tingnan ang payment options',
    NAVIGATE_COVERAGE: 'I-check ang coverage',
    NAVIGATE_DOCUMENTS: 'Tingnan ang documents',
  },
  tl: {
    NAVIGATE_BILL: 'Suriin ang bayarin',
    NAVIGATE_PAYMENT: 'Tingnan ang mga paraan ng pagbabayad',
    NAVIGATE_COVERAGE: 'Suriin ang saklaw ng benepisyo',
    NAVIGATE_DOCUMENTS: 'Tingnan ang mga dokumento',
  },
  ilo: {
    NAVIGATE_BILL: 'Kitaen ti bill',
    NAVIGATE_PAYMENT: 'Kitaen dagiti pagbayadan',
    NAVIGATE_COVERAGE: 'Kitaen ti coverage',
    NAVIGATE_DOCUMENTS: 'Kitaen dagiti dokumento',
  },
};
