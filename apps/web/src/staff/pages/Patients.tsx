import { CreatePatientBody } from '@medcore/domain';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from '../../components/icons';
import { useState } from 'react';
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
import { day, humanize } from '../../lib/format';
import type { Page, PatientRow } from '../../lib/types';
import { useStaff } from '../session';
import { Pagination } from '../widgets';

export function Patients() {
  const { can } = useStaff();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [emailFor, setEmailFor] = useState<PatientRow | null>(null);
  const query = useQuery({
    queryKey: ['patients', 'list', search, page],
    queryFn: () =>
      api<Page<PatientRow>>(`/v1/staff/patients?page=${page}&pageSize=25&q=${encodeURIComponent(search)}`),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Registration and the email address patient sign-in codes are sent to."
        actions={
          can('patient:write') && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden className="size-4" />
              Register patient
            </Button>
          )
        }
      />
      <Card>
        <form
          role="search"
          className="mb-4 flex gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(q.trim());
          }}
        >
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-3 size-4 text-subtle" />
            <Input
              aria-label="Search patients"
              placeholder="Name or MRN"
              className="pl-9"
              value={q}
              maxLength={80}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        {query.isPending && <Spinner />}
        {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
        {query.data && query.data.items.length === 0 && <Empty title="No patients found." />}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table head={['Name', 'MRN', 'Born', 'Discount', 'App email', '']} caption="Patients">
              {query.data.items.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2.5 font-medium">{p.fullName}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{p.mrn}</td>
                  <td className="px-3 py-2.5">{day(p.dateOfBirth)}</td>
                  <td className="px-3 py-2.5">
                    {p.discountKind === 'NONE' ? '—' : <Badge tone="info">{humanize(p.discountKind)}</Badge>}
                  </td>
                  <td className="px-3 py-2.5">
                    {p.hasEmail ? <Badge tone="good">On file</Badge> : <Badge tone="warn">Missing</Badge>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {can('patient:contact') && (
                      <Button size="sm" variant="ghost" onClick={() => setEmailFor(p)}>
                        {p.hasEmail ? 'Change email' : 'Add email'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination page={page} pageSize={25} onPage={setPage} />
          </>
        )}
      </Card>
      <CreatePatientDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EmailDialog patient={emailFor} onClose={() => setEmailFor(null)} />
    </>
  );
}

function CreatePatientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const empty = {
    mrn: '',
    fullName: '',
    dateOfBirth: '',
    sex: 'F',
    contactPhone: '',
    email: '',
    philhealthPin: '',
    discountKind: 'NONE',
    discountIdNumber: '',
  };
  const [form, setForm] = useState(empty);
  const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
  const parsed = CreatePatientBody.safeParse(body);
  const fieldError = (name: string) =>
    form[name as keyof typeof form] && !parsed.success
      ? parsed.error.issues.find((i) => i.path[0] === name)?.message
      : undefined;
  const create = useMutation({
    mutationFn: () => api('/v1/staff/patients', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setForm(empty);
      onClose();
    },
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Register a patient"
      description="Identifiers are encrypted at rest; only the last 4 digits are ever shown."
      wide
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (parsed.success) create.mutate();
        }}
      >
        {create.isError && (
          <div className="sm:col-span-2">
            <Alert>{errorMessage(create.error)}</Alert>
          </div>
        )}
        <Field label="Hospital record number (MRN)" error={fieldError('mrn')}>
          {(f) => <Input {...f} value={form.mrn} maxLength={32} onChange={set('mrn')} />}
        </Field>
        <Field label="Full name" error={fieldError('fullName')}>
          {(f) => <Input {...f} value={form.fullName} maxLength={120} onChange={set('fullName')} />}
        </Field>
        <Field label="Date of birth" error={fieldError('dateOfBirth')}>
          {(f) => <Input {...f} type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />}
        </Field>
        <Field label="Sex">
          {(f) => (
            <Select {...f} value={form.sex} onChange={set('sex')}>
              <option value="F">Female</option>
              <option value="M">Male</option>
              <option value="X">Unspecified</option>
            </Select>
          )}
        </Field>
        <Field label="Mobile number" error={fieldError('contactPhone')}>
          {(f) => (
            <Input
              {...f}
              inputMode="tel"
              value={form.contactPhone}
              maxLength={13}
              onChange={set('contactPhone')}
            />
          )}
        </Field>
        <Field
          label="Email for the patient app sign-in"
          hint="Check it with the patient. Sign-in codes only ever go here."
          error={fieldError('email')}
        >
          {(f) => <Input {...f} type="email" value={form.email} maxLength={254} onChange={set('email')} />}
        </Field>
        <Field label="PhilHealth PIN (optional)" error={fieldError('philhealthPin')}>
          {(f) => (
            <Input
              {...f}
              value={form.philhealthPin}
              maxLength={14}
              autoComplete="off"
              onChange={set('philhealthPin')}
            />
          )}
        </Field>
        <Field label="Discount">
          {(f) => (
            <Select {...f} value={form.discountKind} onChange={set('discountKind')}>
              <option value="NONE">None</option>
              <option value="SENIOR">Senior citizen (RA 9994)</option>
              <option value="PWD">Person with disability (RA 10754)</option>
            </Select>
          )}
        </Field>
        {form.discountKind !== 'NONE' && (
          <Field label="Senior citizen or PWD ID number" error={fieldError('discountIdNumber')}>
            {(f) => (
              <Input
                {...f}
                value={form.discountIdNumber}
                maxLength={32}
                autoComplete="off"
                onChange={set('discountIdNumber')}
              />
            )}
          </Field>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={create.isPending} disabled={!parsed.success}>
            Register
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function EmailDialog({ patient, onClose }: { patient: PatientRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () =>
      api(`/v1/staff/patients/${patient!.id}/contact`, {
        method: 'PUT',
        body: { email: email.trim() || null, reason },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setEmail('');
      setReason('');
      onClose();
    },
  });
  return (
    <Dialog
      open={patient !== null}
      onClose={onClose}
      title={`App sign-in email for ${patient?.fullName ?? ''}`}
      description="Only change this after checking the patient’s or guarantor’s ID in person. The change is audited."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
        <Field label="Email" hint="Leave empty to remove app access.">
          {(f) => (
            <Input
              {...f}
              type="email"
              value={email}
              maxLength={254}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Field label="How was identity checked?">
          {(f) => (
            <Input
              {...f}
              value={reason}
              maxLength={300}
              placeholder="PhilSys ID shown at billing desk"
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={save.isPending} disabled={reason.trim().length < 5}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
