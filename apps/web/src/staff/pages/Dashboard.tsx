import { DISCHARGE_STAGES, STAGE_LABELS } from '@medcore/domain';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Clock,
  CreditCard,
  ShieldCheck,
  UserPlus,
} from '../../components/icons';
import type { ComponentType, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alert, Badge, Button, Card, cx, Empty, PageHeader, Spinner, Stat, Table } from '../../components/ui';
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
const SLA_MINUTES = 45;

export function Dashboard() {
  const { facility, can } = useStaff();
  const navigate = useNavigate();
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

  const a = analytics.data;
  const atRisk = queue.data?.filter((r) => r.sla?.status === 'WARNING' || r.sla?.status === 'BREACH').length;
  const inClearance = a ? IN_CLEARANCE.reduce((n, s) => n + (a.stages[s] ?? 0), 0) : undefined;
  const beds = a ? Object.values(a.beds).reduce<number>((n, v) => n + (v ?? 0), 0) : 0;
  const occupied = a?.beds.OCCUPIED ?? 0;
  const occupancy = beds ? Math.round((occupied / beds) * 100) : 0;
  const median = a?.clearance30d.medianMinutes ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Hospital operations"
        title="Overview"
        subtitle={`${facility.name}${queue.data ? ` · ${queue.data.length} stays in discharge clearance` : ''}`}
        actions={
          can('encounter:admit') && (
            <Button onClick={() => navigate('/staff/encounters?admit=1')}>
              <UserPlus aria-hidden className="size-4" />
              Admit inpatient
            </Button>
          )
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TileLink to="/staff/encounters">
          <Stat
            icon={Clock}
            tone={atRisk ? 'warn' : 'ink'}
            value={`${atRisk ?? '…'} at risk`}
            label="Discharge queue"
          />
        </TileLink>
        <TileLink to={`/staff/encounters?stage=HMO_FINAL_LOA`}>
          <Stat icon={ShieldCheck} value={`${a?.stages.HMO_FINAL_LOA ?? 0} pending`} label="HMO final LOA" />
        </TileLink>
        <TileLink to="/staff/disputes">
          <Stat
            icon={AlertTriangle}
            tone={a?.openDisputes.count ? 'bad' : 'ink'}
            value={`${a?.openDisputes.count ?? 0} open`}
            label="Charge disputes"
          />
        </TileLink>
        <TileLink to="/staff/encounters?stage=PENDING_SETTLEMENT">
          <Stat icon={CreditCard} value={peso(a?.money.outstandingCents ?? 0)} label="Patient receivables" />
        </TileLink>
      </div>

      {a && (
        <div className="mb-5 grid gap-4 lg:grid-cols-3">
          <MetricCard
            icon={BedDouble}
            title="Census & Bed Capacity"
            chip={`${occupancy}% occupancy`}
            chipTone="info"
            value={`${occupied} / ${beds}`}
            caption={`${occupied} occupied · ${a.beds.AVAILABLE ?? 0} available · ${a.beds.HOUSEKEEPING ?? 0} turnover`}
            footer={{ to: '/staff/beds', label: 'View full census & bed matrix' }}
          >
            <div className="mt-3 h-1.5 rounded-full bg-elevated">
              <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${occupancy}%` }} />
            </div>
            {(inClearance ?? 0) > 0 && (
              <div className="mt-3">
                <Badge tone="warn">{inClearance} discharges pending</Badge>
              </div>
            )}
          </MetricCard>
          <MetricCard
            icon={Clock}
            title="Discharge Velocity"
            chip={median === null ? 'No data yet' : median <= SLA_MINUTES ? 'Within SLA' : 'Over SLA'}
            chipTone={median === null ? 'neutral' : median <= SLA_MINUTES ? 'good' : 'warn'}
            value={minutesLabel(median)}
            caption={`Median over 30 days · target under ${SLA_MINUTES} min · ${a.clearance30d.cleared} cleared`}
            footer={{ to: '/staff/encounters', label: 'Open discharge clearance' }}
          >
            <p className="mt-3 flex justify-between border-t border-line-subtle pt-3 text-xs text-muted">
              <span>In clearance now</span>
              <span className="font-semibold text-ink">
                {inClearance} · at risk <span className="text-rose-700">{atRisk ?? 0}</span>
              </span>
            </p>
          </MetricCard>
          <MetricCard
            icon={CreditCard}
            title="Inpatient Receivables"
            chip="In-flight portfolio"
            chipTone="neutral"
            value={peso(a.money.outstandingCents)}
            caption={`Net patient responsibility · ${peso(a.money.collectedCents)} collected`}
            footer={{ to: '/staff/disputes', label: 'Open approvals & disputes' }}
          >
            <p className="mt-3 flex justify-between border-t border-line-subtle pt-3 font-mono text-xs text-muted">
              <span>
                PhilHealth:{' '}
                <span className="font-semibold text-emerald-700">{peso(a.money.philhealthCents)}</span>
              </span>
              <span>
                HMO: <span className="font-semibold text-blue-700">{peso(a.money.hmoCents)}</span>
              </span>
            </p>
          </MetricCard>
        </div>
      )}

      {a && (
        <Card title="Discharge pipeline" className="mb-5">
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {DISCHARGE_STAGES.map((stage) => (
              <li key={stage}>
                <Link
                  to={`/staff/encounters?stage=${stage}`}
                  className="priority-action block rounded-xl border border-line px-3 py-2.5"
                >
                  <p className="tabular text-lg font-semibold">{a.stages[stage] ?? 0}</p>
                  <p className="text-xs text-muted">{STAGE_LABELS[stage]}</p>
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
              <tr key={row.id}>
                <td className="px-3 py-2.5">
                  <Link
                    to={`/staff/encounters/${row.id}`}
                    className="font-semibold text-ink hover:text-brand-800"
                  >
                    {row.patientName}
                  </Link>
                  <p className="font-mono text-xs text-subtle">{row.encounterNumber}</p>
                </td>
                <td className="px-3 py-2.5">{row.bedCode}</td>
                <td className="px-3 py-2.5">
                  <Badge tone="brand">{STAGE_LABELS[row.stage]}</Badge>
                </td>
                <td className="px-3 py-2.5">
                  <SlaBadge sla={row.sla} />
                </td>
                <td className="tabular px-3 py-2.5 font-mono">{peso(row.balanceCents)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}

function TileLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="relative block rounded-2xl">
      {children}
      <ArrowRight aria-hidden className="absolute top-4 right-4 size-4 text-subtle" />
    </Link>
  );
}

function MetricCard({
  icon: Icon,
  title,
  chip,
  chipTone,
  value,
  caption,
  footer,
  children,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  chip: string;
  chipTone: 'good' | 'warn' | 'info' | 'neutral';
  value: string;
  caption: string;
  footer: { to: string; label: string };
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-line bg-surface p-5">
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
          <span className="flex size-7 items-center justify-center rounded-lg border border-line">
            <Icon aria-hidden className="size-3.5 text-muted" />
          </span>
          {title}
        </h2>
        <span
          className={cx(
            'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
            chipTone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
            chipTone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-700',
            chipTone === 'info' && 'border-blue-200 bg-blue-50 text-blue-700',
            chipTone === 'neutral' && 'border-line bg-elevated text-muted',
          )}
        >
          {chip}
        </span>
      </header>
      <p className="tabular mt-4 text-[2rem] leading-tight font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted">{caption}</p>
      {children}
      <Link
        to={footer.to}
        className="mt-auto flex items-center justify-between border-t border-line-subtle pt-3 text-xs font-medium text-ink hover:text-brand-800 [margin-top:max(1rem,auto)]"
      >
        {footer.label}
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </section>
  );
}
