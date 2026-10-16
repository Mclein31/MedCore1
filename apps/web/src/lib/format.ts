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

export function minutesLabel(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `${h} h ${minutes % 60} min`;
}
