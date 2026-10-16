import { Badge } from '../components/ui';
import { minutesLabel } from '../lib/format';
import type { Sla } from '../lib/types';

export function SlaBadge({ sla }: { sla: Sla | null | undefined }) {
  if (!sla || sla.elapsedMinutes === null) return <span className="text-subtle">—</span>;
  const tone = sla.status === 'BREACH' ? 'bad' : sla.status === 'WARNING' ? 'warn' : 'good';
  return <Badge tone={tone}>{minutesLabel(sla.elapsedMinutes)}</Badge>;
}

export function BillStateBadge({ state }: { state: string }) {
  const tone =
    state === 'SETTLED'
      ? 'good'
      : state === 'DRAFT'
        ? 'neutral'
        : state === 'PARTIALLY_PAID'
          ? 'warn'
          : 'info';
  const label: Record<string, string> = {
    DRAFT: 'Draft',
    FINALIZED: 'Finalized',
    SENT: 'Sent to patient',
    PARTIALLY_PAID: 'Partly paid',
    SETTLED: 'Settled',
  };
  return <Badge tone={tone}>{label[state] ?? state}</Badge>;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total?: number;
  onPage: (p: number) => void;
}) {
  const last = total === undefined ? undefined : Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-subtle">
      <span>
        Page {page}
        {last ? ` of ${last}` : ''}
        {total !== undefined ? ` · ${total} total` : ''}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-md border border-line px-3 py-1 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={last !== undefined && page >= last}
          onClick={() => onPage(page + 1)}
          className="rounded-md border border-line px-3 py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
