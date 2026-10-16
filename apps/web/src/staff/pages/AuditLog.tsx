import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Badge, Card, Input, PageHeader, Spinner, Table } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { when } from '../../lib/format';
import type { Page } from '../../lib/types';
import { Pagination } from '../widgets';

interface AuditRow {
  id: number;
  createdAt: string;
  actorType: string;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  requestId: string | null;
  ip: string | null;
  detail: Record<string, unknown> | null;
}

export function AuditLog() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const filter = /^[A-Z_]{2,64}$/.test(action) ? action : '';
  const query = useQuery({
    queryKey: ['audit', page, filter],
    queryFn: () =>
      api<Page<AuditRow>>(
        `/v1/staff/audit-logs?page=${page}&pageSize=50${filter ? `&action=${filter}` : ''}`,
      ),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Append-only: the database refuses edits and deletions of these rows."
      />
      <Card
        title="Events"
        actions={
          <Input
            aria-label="Filter by action"
            placeholder="Action, e.g. ENCOUNTER_VIEWED"
            className="h-8 w-64 text-xs"
            value={action}
            onChange={(e) => {
              setAction(e.target.value.toUpperCase());
              setPage(1);
            }}
          />
        }
      >
        {query.isPending && <Spinner />}
        {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
        {query.data && (
          <>
            <Table head={['When', 'Who', 'Action', 'Record', 'Details']} caption="Audit events">
              {query.data.items.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{when(r.createdAt)}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.actorEmail ?? <Badge>{r.actorType.toLowerCase()}</Badge>}
                    {r.ip && <p className="text-subtle">{r.ip}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={/FAILED|LOCKED|REJECTED|TAMPERED|VOIDED/.test(r.action) ? 'bad' : 'neutral'}>
                      {r.action}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-subtle">
                    {r.resourceType}
                    {r.resourceId ? ` ${r.resourceId.slice(0, 8)}` : ''}
                  </td>
                  <td className="max-w-sm px-3 py-2 font-mono text-[11px] break-all text-subtle">
                    {r.detail ? JSON.stringify(r.detail) : ''}
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination page={page} pageSize={50} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
