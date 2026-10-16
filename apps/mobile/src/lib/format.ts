import { formatPeso, STAGE_LABELS, type DischargeStage } from '@medcore/domain';

export const peso = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? '—' : formatPeso(cents);

const dateTime = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const dateOnly = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export const when = (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : '—');
export const day = (iso: string | null | undefined) =>
  iso ? dateOnly.format(new Date(iso.length === 10 ? `${iso}T00:00:00+08:00` : iso)) : '—';

export const stageLabel = (stage: string) => STAGE_LABELS[stage as DischargeStage] ?? stage;

export const humanize = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');

const RAIL_LABELS: Record<string, string> = {
  GCASH: 'GCash',
  MAYA: 'Maya',
  QR_PH: 'QR Ph',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
  CASH: 'Cash',
  CARD_TERMINAL: 'Card (cashier)',
  PROMISSORY_NOTE: 'Payment plan',
};
export const railLabel = (rail: string) => RAIL_LABELS[rail] ?? humanize(rail);

export function firstName(full: string): string {
  const given = full.includes(',') ? (full.split(',')[1] ?? full) : full;
  return given.trim().split(/\s+/)[0] || full;
}
