import { STAGE_LABELS, type DischargeStage } from '@medcore/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from '../../components/icons';
import { useState } from 'react';
import { Link } from 'react-router';
import { Alert, Badge, Button, Card, Empty, PageHeader, Spinner, Table } from '../../components/ui';
import { ApiRequestError, errorMessage, api } from '../../lib/api';
import { humanize, peso, when } from '../../lib/format';
import type { Page } from '../../lib/types';
import { useStaff } from '../session';

interface ClaimRow {
  id: string;
  claimNumber: string;
  encounterId: string;
  encounterNumber: string;
  patientName: string;
  caseRateCode: string;
  hciCents: number;
  pfCents: number;
  status: string;
  stage: DischargeStage;
  transmittedAt: string | null;
}

export function Claims() {
  const { can } = useStaff();
  const queryClient = useQueryClient();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['claims'],
    queryFn: () => api<Page<ClaimRow>>('/v1/staff/claims?pageSize=100'),
  });
  const transmit = useMutation({
    mutationFn: (id: string) => api(`/v1/staff/claims/${id}/mark-transmitted`, { method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['claims'] }),
  });

  // Download through fetch (same-origin, cookie session) and save as a file; no token in any URL.
  const download = async (row: ClaimRow) => {
    setDownloadError(null);
    const res = await fetch(`/api/v1/staff/encounters/${row.encounterId}/esoa.xml`, {
      credentials: 'same-origin',
      headers: { 'X-MedCore-CSRF': '1' },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setDownloadError(body?.error?.message ?? 'The eSOA could not be generated.');
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `${row.claimNumber}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="PhilHealth claims"
        subtitle="eSOA export (eClaims 3.0 structure; not yet certified against the official DTD)."
      />
      <Card>
        {downloadError && (
          <div className="mb-3">
            <Alert>{downloadError}</Alert>
          </div>
        )}
        {transmit.isError && (
          <div className="mb-3">
            <Alert>{errorMessage(transmit.error)}</Alert>
          </div>
        )}
        {query.isPending && <Spinner />}
        {query.isError && (
          <Alert>
            {query.error instanceof ApiRequestError ? query.error.message : 'Could not load claims.'}
          </Alert>
        )}
        {query.data && query.data.items.length === 0 && <Empty title="No claims yet." />}
        {query.data && query.data.items.length > 0 && (
          <Table
            head={['Claim', 'Patient', 'Case rate', 'Hospital', 'Doctor', 'Status', '']}
            caption="Claims"
          >
            {query.data.items.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2.5 font-mono text-xs">{c.claimNumber}</td>
                <td className="px-3 py-2.5">
                  <Link
                    to={`/staff/encounters/${c.encounterId}`}
                    className="font-medium hover:text-brand-800"
                  >
                    {c.patientName}
                  </Link>
                  <p className="text-xs text-subtle">{STAGE_LABELS[c.stage]}</p>
                </td>
                <td className="px-3 py-2.5">{c.caseRateCode}</td>
                <td className="tabular px-3 py-2.5">{peso(c.hciCents)}</td>
                <td className="tabular px-3 py-2.5">{peso(c.pfCents)}</td>
                <td className="px-3 py-2.5">
                  <Badge tone={c.status === 'TRANSMITTED' ? 'good' : 'neutral'}>{humanize(c.status)}</Badge>
                  {c.transmittedAt && <p className="text-xs text-subtle">{when(c.transmittedAt)}</p>}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => download(c)}>
                    <Download aria-hidden className="size-4" />
                    eSOA
                  </Button>
                  {can('claim:write') && c.status !== 'TRANSMITTED' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => transmit.mutate(c.id)}
                      busy={transmit.isPending && transmit.variables === c.id}
                    >
                      Mark transmitted
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
