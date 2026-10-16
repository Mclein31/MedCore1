import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Alert, Card, cx, PageHeader, Select, Spinner } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { humanize, peso } from '../../lib/format';
import type { Bed } from '../../lib/types';
import { useStaff } from '../session';

const STATUS_STYLE: Record<Bed['status'], string> = {
  AVAILABLE: 'border-emerald-200 bg-emerald-50',
  OCCUPIED: 'border-sky-200 bg-sky-50',
  HOUSEKEEPING: 'border-amber-200 bg-amber-50',
  MAINTENANCE: 'border-slate-200 bg-slate-100',
};

export function Beds() {
  const { can } = useStaff();
  const queryClient = useQueryClient();
  const beds = useQuery({
    queryKey: ['beds'],
    queryFn: () => api<{ items: Bed[] }>('/v1/staff/beds'),
    refetchInterval: 30_000,
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/v1/staff/beds/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beds'] }),
  });
  if (beds.isPending) return <Spinner />;
  if (beds.isError) return <Alert>{errorMessage(beds.error)}</Alert>;
  const floors = [...new Set(beds.data.items.map((b) => b.floor))];
  const counts = beds.data.items.reduce<Record<string, number>>(
    (acc, b) => ({ ...acc, [b.status]: (acc[b.status] ?? 0) + 1 }),
    {},
  );
  return (
    <>
      <PageHeader
        title="Beds"
        subtitle={Object.entries(counts)
          .map(([s, n]) => `${n} ${humanize(s).toLowerCase()}`)
          .join(' · ')}
      />
      {update.isError && (
        <div className="mb-4">
          <Alert>{errorMessage(update.error)}</Alert>
        </div>
      )}
      <div className="flex flex-col gap-6">
        {floors.map((floor) => (
          <Card key={floor} title={`Floor ${floor}`}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {beds.data.items
                .filter((b) => b.floor === floor)
                .map((b) => (
                  <li key={b.id} className={cx('rounded-lg border p-3 text-sm', STATUS_STYLE[b.status])}>
                    <p className="font-semibold">{b.code}</p>
                    <p className="text-xs text-muted">
                      {b.ward} · {peso(b.dailyRateCents)}
                    </p>
                    {b.status === 'OCCUPIED' && b.encounterId ? (
                      <Link
                        to={`/staff/encounters/${b.encounterId}`}
                        className="mt-2 block text-xs font-medium text-brand-800 underline"
                      >
                        Occupied · open stay
                      </Link>
                    ) : can('bed:write') ? (
                      <Select
                        aria-label={`Status of bed ${b.code}`}
                        className="mt-2 h-8 text-xs"
                        value={b.status}
                        onChange={(e) => update.mutate({ id: b.id, status: e.target.value })}
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="HOUSEKEEPING">Housekeeping</option>
                        <option value="MAINTENANCE">Maintenance</option>
                      </Select>
                    ) : (
                      <p className="mt-2 text-xs">{humanize(b.status)}</p>
                    )}
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
