import { STAGE_LABELS } from '@medcore/domain';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Alert, Badge, PageHeader, Spinner } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { peso } from '../../lib/format';
import type { EncounterRow, Page } from '../../lib/types';
import { SlaBadge } from '../widgets';

const COLUMNS = [
  'MGH_DECLARED',
  'DOCTOR_PF_PENDING',
  'PHARMACY_RTS_AUDIT',
  'HMO_FINAL_LOA',
  'PENDING_SETTLEMENT',
] as const;

/** v1 "Discharge Clearance" mission control: one column per clearance step, longest wait first. */
export function DischargeBoard() {
  const board = useQuery({
    queryKey: ['encounters', 'discharge-board'],
    queryFn: async () => {
      const pages = await Promise.all(
        COLUMNS.map((stage) => api<Page<EncounterRow>>(`/v1/staff/encounters?stage=${stage}&pageSize=50`)),
      );
      return COLUMNS.map((stage, i) => ({
        stage,
        rows: [...(pages[i]?.items ?? [])].sort(
          (a, b) => (b.sla?.elapsedMinutes ?? 0) - (a.sla?.elapsedMinutes ?? 0),
        ),
      }));
    },
    refetchInterval: 20_000,
  });
  const total = board.data?.reduce((n, c) => n + c.rows.length, 0) ?? 0;
  const atRisk =
    board.data?.reduce(
      (n, c) => n + c.rows.filter((r) => r.sla?.status === 'WARNING' || r.sla?.status === 'BREACH').length,
      0,
    ) ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Daily operations"
        title="Discharge Clearance"
        subtitle={`${total} patients cleared to go home are moving through clearance · ${atRisk} at risk of the SLA`}
      />
      {board.isPending && <Spinner />}
      {board.isError && <Alert>{errorMessage(board.error)}</Alert>}
      {board.data && (
        <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-5">
          {board.data.map(({ stage, rows }) => (
            <section
              key={stage}
              className="flex min-w-56 flex-col rounded-2xl border border-line bg-elevated/60 p-2"
            >
              <header className="flex items-center justify-between px-2 py-2">
                <h2 className="text-xs font-semibold text-ink">{STAGE_LABELS[stage]}</h2>
                <span className="tabular rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-muted">
                  {rows.length}
                </span>
              </header>
              <ul className="flex flex-col gap-2">
                {rows.length === 0 && (
                  <li className="px-2 py-6 text-center text-xs text-subtle">Nobody here</li>
                )}
                {rows.map((row) => (
                  <li key={row.id}>
                    <Link
                      to={`/staff/encounters/${row.id}`}
                      className="priority-action block rounded-xl border border-line bg-white p-3"
                    >
                      <p className="text-sm font-semibold text-ink">{row.patientName}</p>
                      <p className="font-mono text-[11px] text-subtle">
                        {row.encounterNumber} · Bed {row.bedCode}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <SlaBadge sla={row.sla} />
                        {row.openDisputes > 0 ? (
                          <Badge tone="bad">{row.openDisputes} disputed</Badge>
                        ) : (
                          <span className="tabular text-xs font-semibold text-ink">
                            {peso(row.balanceCents)}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
