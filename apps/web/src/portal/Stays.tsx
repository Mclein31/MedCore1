import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Alert, Badge, Empty, Spinner } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { day, peso, stageLabel } from '../lib/format';
import type { PortalStayRow } from '../lib/types';

export function PortalStays() {
  const stays = useQuery({
    queryKey: ['portal', 'stays'],
    queryFn: () => api<{ items: PortalStayRow[] }>('/v1/patient/stays'),
  });
  if (stays.isPending) return <Spinner />;
  if (stays.isError) return <Alert>{errorMessage(stays.error)}</Alert>;
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Your hospital stays</h1>
      {stays.data.items.length === 0 ? (
        <Empty title="No stays are linked to this email yet." />
      ) : (
        <ul className="flex flex-col gap-3">
          {stays.data.items.map((s) => (
            <li key={s.id}>
              <Link
                to={`/portal/stays/${s.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 hover:border-brand-200"
              >
                <div>
                  <p className="font-medium">{s.patientName}</p>
                  <p className="text-sm text-subtle">
                    Admitted {day(s.admittedAt)} · {s.encounterNumber}
                  </p>
                  <div className="mt-2">
                    {s.stage === 'CLEARED' ? (
                      <Badge tone="good">Cleared to go home</Badge>
                    ) : s.billReady ? (
                      <Badge tone="info">Bill ready</Badge>
                    ) : (
                      <Badge>{stageLabel(s.stage)}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-right">
                  {s.billReady && (
                    <div>
                      <p className="text-xs text-subtle">Balance</p>
                      <p className="tabular font-semibold">{peso(s.balanceCents)}</p>
                    </div>
                  )}
                  <ChevronRight aria-hidden className="size-5 text-subtle" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
