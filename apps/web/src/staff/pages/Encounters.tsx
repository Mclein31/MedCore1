import { AdmitBody, DISCHARGE_STAGES, STAGE_LABELS } from '@medcore/domain';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Empty,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { day, peso } from '../../lib/format';
import type { Bed, EncounterDetail, EncounterRow, Page, PatientRow } from '../../lib/types';
import { useStaff } from '../session';
import { BillStateBadge, Pagination, SlaBadge } from '../widgets';

export function Encounters() {
  const { can } = useStaff();
  const [params, setParams] = useSearchParams();
  const stage = params.get('stage') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? '1') || 1;
  const [search, setSearch] = useState(q);
  const [admitOpen, setAdmitOpen] = useState(false);

  const query = useQuery({
    queryKey: ['encounters', { stage, q, page }],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (stage) qs.set('stage', stage);
      if (q) qs.set('q', q);
      return api<Page<EncounterRow>>(`/v1/staff/encounters?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

  const update = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    setParams(merged);
  };

  return (
    <>
      <PageHeader
        title="Stays"
        subtitle="Every admission, its discharge stage and its bill."
        actions={
          can('encounter:admit') && (
            <Button onClick={() => setAdmitOpen(true)}>
              <Plus aria-hidden className="size-4" />
              Admit patient
            </Button>
          )
        }
      />
      <Card>
        <form
          role="search"
          className="mb-4 flex flex-wrap gap-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            update({ q: search.trim(), page: '' });
          }}
        >
          <div className="relative min-w-56 flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-3 size-4 text-subtle" />
            <Input
              aria-label="Search by patient, record number or stay number"
              placeholder="Search patient, MRN or stay number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              maxLength={80}
            />
          </div>
          <Select
            aria-label="Filter by stage"
            value={stage}
            onChange={(e) => update({ stage: e.target.value, page: '' })}
            className="w-auto"
          >
            <option value="">All stages</option>
            {DISCHARGE_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        {query.isPending && <Spinner />}
        {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
        {query.data && query.data.items.length === 0 && <Empty title="No stays match these filters." />}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table
              head={['Patient', 'Bed', 'Physician', 'Stage', 'Clearance', 'Bill', 'Balance']}
              caption="Stays"
            >
              {query.data.items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/staff/encounters/${row.id}`}
                      className="font-medium text-ink hover:text-brand-800"
                    >
                      {row.patientName}
                    </Link>
                    <p className="text-xs text-subtle">
                      {row.mrn} · admitted {day(row.admittedAt)}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">{row.bedCode}</td>
                  <td className="px-3 py-2.5 text-muted">{row.physicianName}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={row.stage === 'CLEARED' ? 'good' : 'brand'}>{STAGE_LABELS[row.stage]}</Badge>
                    {row.openDisputes > 0 && (
                      <span className="ml-1">
                        <Badge tone="warn">
                          {row.openDisputes} dispute{row.openDisputes > 1 ? 's' : ''}
                        </Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <SlaBadge sla={row.sla} />
                  </td>
                  <td className="px-3 py-2.5">
                    <BillStateBadge state={row.billState} />
                  </td>
                  <td className="tabular px-3 py-2.5">{peso(row.balanceCents)}</td>
                </tr>
              ))}
            </Table>
            <Pagination
              page={page}
              pageSize={25}
              total={query.data.total}
              onPage={(p) => update({ page: String(p) })}
            />
          </>
        )}
      </Card>
      <AdmitDialog open={admitOpen} onClose={() => setAdmitOpen(false)} />
    </>
  );
}

function AdmitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [patientQuery, setPatientQuery] = useState('');
  const [form, setForm] = useState({
    patientId: '',
    bedId: '',
    attendingPhysicianId: '',
    primaryDiagnosis: '',
    icd10Code: '',
  });
  const patients = useQuery({
    queryKey: ['patients', patientQuery],
    queryFn: () =>
      api<Page<PatientRow>>(`/v1/staff/patients?pageSize=10&q=${encodeURIComponent(patientQuery)}`),
    enabled: open && patientQuery.trim().length >= 2,
  });
  const beds = useQuery({
    queryKey: ['beds'],
    queryFn: () => api<{ items: Bed[] }>('/v1/staff/beds'),
    enabled: open,
  });
  const physicians = useQuery({
    queryKey: ['physicians'],
    queryFn: () =>
      api<{ items: { id: string; fullName: string; title: string }[] }>('/v1/staff/directory/physicians'),
    enabled: open,
  });
  const admit = useMutation({
    mutationFn: (body: typeof form) =>
      api<EncounterDetail>('/v1/staff/encounters', { method: 'POST', body: AdmitBody.parse(body) }),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      onClose();
      navigate(`/staff/encounters/${detail.encounter.id}`);
    },
  });
  const valid = AdmitBody.safeParse(form).success;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Admit a patient"
      description="Register the patient first if they are new."
      wide
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          admit.mutate(form);
        }}
      >
        {admit.isError && (
          <div className="sm:col-span-2">
            <Alert>{errorMessage(admit.error)}</Alert>
          </div>
        )}
        <div className="sm:col-span-2">
          <Field label="Find patient" hint="Type at least two letters of the name or the record number.">
            {(f) => (
              <Input
                {...f}
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                maxLength={80}
              />
            )}
          </Field>
          {patients.data && (
            <div
              className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-line"
              role="listbox"
              aria-label="Matching patients"
            >
              {patients.data.items.length === 0 && (
                <p className="px-3 py-2 text-sm text-subtle">No patients found.</p>
              )}
              {patients.data.items.map((p) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={form.patientId === p.id}
                  key={p.id}
                  onClick={() => setForm({ ...form, patientId: p.id })}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${form.patientId === p.id ? 'bg-brand-50' : ''}`}
                >
                  <span className="font-medium">{p.fullName}</span>{' '}
                  <span className="text-subtle">· {p.mrn}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Field label="Bed">
          {(f) => (
            <Select {...f} value={form.bedId} onChange={(e) => setForm({ ...form, bedId: e.target.value })}>
              <option value="">Choose an available bed</option>
              {beds.data?.items
                .filter((b) => b.status === 'AVAILABLE')
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} · {b.ward} · {peso(b.dailyRateCents)}/day
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label="Attending physician">
          {(f) => (
            <Select
              {...f}
              value={form.attendingPhysicianId}
              onChange={(e) => setForm({ ...form, attendingPhysicianId: e.target.value })}
            >
              <option value="">Choose a physician</option>
              {physicians.data?.items.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} · {d.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Admitting diagnosis">
          {(f) => (
            <Input
              {...f}
              value={form.primaryDiagnosis}
              maxLength={300}
              onChange={(e) => setForm({ ...form, primaryDiagnosis: e.target.value })}
            />
          )}
        </Field>
        <Field label="ICD-10 code" hint="For example J18.9">
          {(f) => (
            <Input
              {...f}
              value={form.icd10Code}
              maxLength={10}
              onChange={(e) => setForm({ ...form, icd10Code: e.target.value.toUpperCase() })}
            />
          )}
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={admit.isPending} disabled={!valid}>
            Admit
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
