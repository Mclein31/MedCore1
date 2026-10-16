import { DISCHARGE_STAGES, STAGE_LABELS } from '@medcore/domain';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Alert, Badge, Card, Empty, PageHeader, Spinner, Stat, Table } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { minutesLabel, peso } from '../../lib/format';
import type { Analytics, EncounterRow, Page } from '../../lib/types';
import { useStaff } from '../session';
import { SlaBadge } from '../widgets';

const IN_CLEARANCE = [
  'MGH_DECLARED',
  'DOCTOR_PF_PENDING',
  'PHARMACY_RTS_AUDIT',
  'HMO_FINAL_LOA',
  'PENDING_SETTLEMENT',
] as const;

export function Dashboard() {
  const { user, facility, can } = useStaff();
  const analytics = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api<Analytics>('/v1/staff/analytics/summary'),
    enabled: can('analytics:read'),
    refetchInterval: 30_000,
  });
  const queue = useQuery({
    queryKey: ['encounters', 'clearance-queue'],
    queryFn: async () => {
      const pages = await Promise.all(
        IN_CLEARANCE.map((stage) =>
          api<Page<EncounterRow>>(`/v1/staff/encounters?stage=${stage}&pageSize=50`),
        ),
      );
      return pages
        .flatMap((p) => p.items)
        .sort((a, b) => (b.sla?.elapsedMinutes ?? 0) - (a.sla?.elapsedMinutes ?? 0));
    },
    refetchInterval: 20_000,
  });

  return (
    <>
      <PageHeader
        title={`Good day, ${user.fullName.split(' ')[0]}`}
        subtitle={`${facility.name} · discharge clearance and billing`}
      />
      {analytics.data && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="In discharge clearance"
            value={IN_CLEARANCE.reduce((n, s) => n + (analytics.data.stages[s] ?? 0), 0)}
            hint={`${analytics.data.stages.ADMITTED ?? 0} still admitted`}
          />
          <Stat
            label="Median clearance (30 days)"
            value={minutesLabel(analytics.data.clearance30d.medianMinutes)}
            hint={`${analytics.data.clearance30d.cleared} stays cleared`}
          />
          <Stat
            label="Outstanding patient balance"
            value={peso(analytics.data.money.outstandingCents)}
            hint={`${peso(analytics.data.money.collectedCents)} collected`}
          />
          <Stat
            label="Open disputes"
            value={analytics.data.openDisputes.count}
            hint={peso(analytics.data.openDisputes.cents)}
          />
        </div>
      )}

      {analytics.data && (
        <Card title="Where every stay is" className="mb-6">
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {DISCHARGE_STAGES.map((stage) => (
              <li key={stage}>
                <Link
                  to={`/staff/encounters?stage=${stage}`}
                  className="block rounded-lg border border-line px-3 py-2.5 hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <p className="tabular text-lg font-semibold">{analytics.data.stages[stage] ?? 0}</p>
                  <p className="text-xs text-subtle">{STAGE_LABELS[stage]}</p>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card title="Clearance queue (longest wait first)">
        {queue.isPending && <Spinner />}
        {queue.isError && <Alert>{errorMessage(queue.error)}</Alert>}
        {queue.data && queue.data.length === 0 && (
          <Empty title="Nobody is waiting for discharge clearance." />
        )}
        {queue.data && queue.data.length > 0 && (
          <Table
            head={['Patient', 'Bed', 'Stage', 'Waiting', 'Balance']}
            caption="Patients in discharge clearance"
          >
            {queue.data.slice(0, 15).map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <Link
                    to={`/staff/encounters/${row.id}`}
                    className="font-medium text-ink hover:text-brand-800"
                  >
                    {row.patientName}
                  </Link>
                  <p className="text-xs text-subtle">{row.encounterNumber}</p>
                </td>
                <td className="px-3 py-2.5">{row.bedCode}</td>
                <td className="px-3 py-2.5">
                  <Badge tone="brand">{STAGE_LABELS[row.stage]}</Badge>
                </td>
                <td className="px-3 py-2.5">
                  <SlaBadge sla={row.sla} />
                </td>
                <td className="tabular px-3 py-2.5">{peso(row.balanceCents)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
