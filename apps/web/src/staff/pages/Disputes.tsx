import { WAIVER_LIMIT_CENTS } from '@medcore/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Empty,
  Field,
  PageHeader,
  Select,
  Spinner,
  Table,
  Textarea,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { humanize, peso, when } from '../../lib/format';
import type { Page } from '../../lib/types';
import { useStaff } from '../session';

interface DisputeRow {
  id: string;
  encounterId: string;
  encounterNumber: string;
  patientName: string;
  chargeDescription: string;
  contestedCents: number;
  category: string;
  reason: string;
  status: 'OPEN' | 'WAIVED' | 'UPHELD';
  filedByPatient: boolean;
  filedByStaffId: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export function Disputes() {
  const { can, user } = useStaff();
  const [status, setStatus] = useState('OPEN');
  const [resolving, setResolving] = useState<DisputeRow | null>(null);
  const query = useQuery({
    queryKey: ['disputes', status],
    queryFn: () =>
      api<Page<DisputeRow>>(`/v1/staff/disputes?pageSize=100${status ? `&status=${status}` : ''}`),
  });
  return (
    <>
      <PageHeader
        title="Disputes"
        subtitle={`Questioned charges. Whoever filed a dispute cannot resolve it; waivers above ${peso(WAIVER_LIMIT_CENTS)} need the CFO.`}
      />
      <Card
        actions={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-auto"
          >
            <option value="OPEN">Open</option>
            <option value="WAIVED">Waived</option>
            <option value="UPHELD">Upheld</option>
            <option value="">All</option>
          </Select>
        }
        title="Queue"
      >
        {query.isPending && <Spinner />}
        {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
        {query.data && query.data.items.length === 0 && <Empty title="No disputes here." />}
        {query.data && query.data.items.length > 0 && (
          <Table head={['Patient', 'Charge', 'Amount', 'Reason', 'Filed', '']} caption="Disputes">
            {query.data.items.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2.5">
                  <Link
                    to={`/staff/encounters/${d.encounterId}`}
                    className="font-medium hover:text-brand-800"
                  >
                    {d.patientName}
                  </Link>
                  <p className="text-xs text-subtle">{d.encounterNumber}</p>
                </td>
                <td className="px-3 py-2.5">{d.chargeDescription}</td>
                <td className="tabular px-3 py-2.5">{peso(d.contestedCents)}</td>
                <td className="max-w-xs px-3 py-2.5">
                  <p className="text-xs font-medium text-subtle">{humanize(d.category)}</p>
                  <p className="line-clamp-2">{d.reason}</p>
                  {d.resolutionNote && (
                    <p className="mt-1 text-xs text-subtle">Resolution: {d.resolutionNote}</p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-subtle">
                  {when(d.createdAt)}
                  <br />
                  {d.filedByPatient ? 'by patient' : d.filedByStaffId === user.id ? 'by you' : 'by staff'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {d.status === 'OPEN' ? (
                    can('dispute:resolve') && d.filedByStaffId !== user.id ? (
                      <Button size="sm" onClick={() => setResolving(d)}>
                        Resolve
                      </Button>
                    ) : (
                      <Badge tone="warn">Open</Badge>
                    )
                  ) : (
                    <Badge tone={d.status === 'WAIVED' ? 'good' : 'neutral'}>{humanize(d.status)}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <ResolveDialog dispute={resolving} onClose={() => setResolving(null)} />
    </>
  );
}

function ResolveDialog({ dispute, onClose }: { dispute: DisputeRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<'WAIVE' | 'UPHOLD'>('UPHOLD');
  const [note, setNote] = useState('');
  const resolve = useMutation({
    mutationFn: () =>
      api(`/v1/staff/disputes/${dispute!.id}/resolve`, { method: 'POST', body: { decision, note } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['encounter', dispute!.encounterId] });
      setNote('');
      onClose();
    },
  });
  return (
    <Dialog
      open={dispute !== null}
      onClose={onClose}
      title="Resolve dispute"
      description={dispute ? `${dispute.chargeDescription} · ${peso(dispute.contestedCents)}` : undefined}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          resolve.mutate();
        }}
      >
        {resolve.isError && <Alert>{errorMessage(resolve.error)}</Alert>}
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-medium">Decision</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="decision"
              className="accent-brand-700"
              checked={decision === 'UPHOLD'}
              onChange={() => setDecision('UPHOLD')}
            />
            Keep the charge (it was correct)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="decision"
              className="accent-brand-700"
              checked={decision === 'WAIVE'}
              onChange={() => setDecision('WAIVE')}
            />
            Remove the charge from the bill
          </label>
        </fieldset>
        <Field label="Explanation for the patient and the record" hint="At least 10 characters.">
          {(f) => <Textarea {...f} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={resolve.isPending} disabled={note.trim().length < 10}>
            Save decision
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
