import {
  CHARGE_CATEGORIES,
  DISCHARGE_STAGES,
  DISPUTE_CATEGORIES,
  GOVERNMENT_ID_RULES,
  GOVERNMENT_ID_TYPES,
  INSTALLMENT_TERMS,
  STAFF_PAYMENT_RAILS,
  STAGE_LABELS,
  type InstallmentTerm,
} from '@medcore/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, Check, Printer, Trash2 } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { MoneyInput } from '../../components/MoneyInput';
import { QrCode } from '../../components/QrCode';
import {
  Alert,
  Badge,
  Button,
  Card,
  cx,
  Dialog,
  Empty,
  Field,
  Input,
  Select,
  Spinner,
  Table,
  Textarea,
} from '../../components/ui';
import { api, errorMessage, newIdempotencyKey } from '../../lib/api';
import { day, humanize, peso, when } from '../../lib/format';
import type { EncounterDetail } from '../../lib/types';
import { useStaff } from '../session';
import { BillStateBadge, SlaBadge } from '../widgets';

const key = (id: string) => ['encounter', id] as const;

/** Every write returns the fresh stay; put it straight into the cache. */
function useAction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      path: string;
      method?: 'POST' | 'PUT';
      body?: unknown;
      idempotencyKey?: string;
    }) => {
      const res = await api<EncounterDetail | { detail: EncounterDetail }>(
        `/v1/staff/encounters/${id}${args.path}`,
        {
          method: args.method ?? 'POST',
          body: args.body ?? {},
          idempotencyKey: args.idempotencyKey,
        },
      );
      return 'detail' in res ? res.detail : res;
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(key(id), detail);
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function EncounterPage() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: key(id),
    queryFn: () => api<EncounterDetail>(`/v1/staff/encounters/${id}`),
  });

  if (query.isPending) return <Spinner />;
  if (query.isError) return <Alert>{errorMessage(query.error)}</Alert>;
  const d = query.data;
  return (
    <>
      <Link
        to="/staff/encounters"
        className="mb-4 inline-flex items-center gap-1 text-sm text-subtle hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All stays
      </Link>
      <Header d={d} />
      {d.encounter.voidedAt ? (
        <Alert tone="warn">
          This stay was voided on {when(d.encounter.voidedAt)}. Reason: {d.encounter.voidReason}
        </Alert>
      ) : (
        <NextStep d={d} />
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <BillCard d={d} />
          <SettlementCard d={d} />
          <DisputesCard d={d} />
        </div>
        <div className="flex flex-col gap-6">
          <CoverageCard d={d} />
          <TimelineCard d={d} />
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ header
function Header({ d }: { d: EncounterDetail }) {
  const { can } = useStaff();
  const [voidOpen, setVoidOpen] = useState(false);
  const currentIndex = DISCHARGE_STAGES.indexOf(d.encounter.stage);
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{d.patient.fullName}</h1>
          <p className="mt-1 text-sm text-muted">
            {d.patient.mrn} · {d.encounter.encounterNumber} · Bed {d.encounter.bedCode} ·{' '}
            {d.physician?.fullName}
          </p>
          <p className="mt-1 text-sm text-muted">
            {d.encounter.icd10Code} · {d.encounter.primaryDiagnosis} · admitted {when(d.encounter.admittedAt)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <BillStateBadge state={d.encounter.billState} />
            {d.patient.discountKind !== 'NONE' && (
              <Badge tone="info">
                {d.patient.discountKind === 'SENIOR' ? 'Senior citizen' : 'PWD'} discount
              </Badge>
            )}
            {!d.patient.hasEmail && <Badge tone="warn">No email on file</Badge>}
            <SlaBadge sla={d.encounter.sla} />
          </div>
        </div>
        {can('encounter:void') &&
          !d.encounter.voidedAt &&
          d.payments.length === 0 &&
          d.promissoryNotes.length === 0 && (
            <Button variant="secondary" size="sm" onClick={() => setVoidOpen(true)}>
              <Ban aria-hidden className="size-4" />
              Void stay
            </Button>
          )}
      </div>
      <ol aria-label="Discharge progress" className="mt-5 grid grid-cols-7 gap-1">
        {DISCHARGE_STAGES.map((stage, i) => (
          <li key={stage} aria-current={i === currentIndex ? 'step' : undefined}>
            <div
              className={cx(
                'h-1.5 rounded-full',
                i < currentIndex
                  ? 'bg-brand-600'
                  : i === currentIndex
                    ? 'bg-brand-400 bg-brand-500'
                    : 'bg-slate-200',
              )}
            />
            <p
              className={cx(
                'mt-1.5 hidden text-[11px] leading-tight sm:block',
                i === currentIndex ? 'font-semibold text-ink' : 'text-subtle',
              )}
            >
              {STAGE_LABELS[stage]}
            </p>
          </li>
        ))}
      </ol>
      <VoidDialog open={voidOpen} onClose={() => setVoidOpen(false)} id={d.encounter.id} />
    </div>
  );
}

function VoidDialog({ open, onClose, id }: { open: boolean; onClose: () => void; id: string }) {
  const [reason, setReason] = useState('');
  const action = useAction(id);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Void this stay?"
      description="Voiding is permanent and audited. It is only possible before any payment, note or exit pass exists."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          action.mutate({ path: '/void', body: { reason } }, { onSuccess: onClose });
        }}
      >
        {action.isError && <Alert>{errorMessage(action.error)}</Alert>}
        <Field label="Reason" hint="At least 10 characters. This goes into the audit log.">
          {(f) => (
            <Textarea {...f} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Keep stay
          </Button>
          <Button type="submit" variant="danger" busy={action.isPending} disabled={reason.trim().length < 10}>
            Void stay
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ------------------------------------------------------------------ next step
function NextStep({ d }: { d: EncounterDetail }) {
  const { can, user } = useStaff();
  const action = useAction(d.encounter.id);
  const e = d.encounter;
  const run = (path: string, body?: unknown) => action.mutate({ path, body });

  let content: ReactNode = null;
  if (e.stage === 'ADMITTED') {
    content = can('discharge:declare-mgh') ? (
      <StepRow text="When the attending physician writes the may-go-home order, record it here. This starts the discharge clock.">
        <Button onClick={() => run('/discharge/declare-mgh')} busy={action.isPending}>
          Record may-go-home order
        </Button>
      </StepRow>
    ) : (
      <StepRow text="Waiting for the may-go-home order." />
    );
  } else if (e.stage === 'MGH_DECLARED') {
    content = can('discharge:start') ? (
      <StepRow text="Start clearance: the physician will be asked to confirm the professional fee.">
        <Button onClick={() => run('/discharge/start')} busy={action.isPending}>
          Start clearance
        </Button>
      </StepRow>
    ) : (
      <StepRow text="Waiting for billing to start clearance." />
    );
  } else if (e.stage === 'DOCTOR_PF_PENDING') {
    const isAttending = d.physician?.id === user.id;
    content =
      can('discharge:sign-pf') && (isAttending || can('discharge:sign-pf-on-behalf')) ? (
        <SignPf d={d} onBehalf={!isAttending} />
      ) : (
        <StepRow
          text={`Waiting for ${d.physician?.fullName ?? 'the attending physician'} to confirm the professional fee.`}
        />
      );
  } else if (e.stage === 'PHARMACY_RTS_AUDIT') {
    content = can('discharge:clear-pharmacy') ? (
      <StepRow text="Confirm unused medicines were returned to the pharmacy and credited.">
        <Button onClick={() => run('/discharge/clear-pharmacy')} busy={action.isPending}>
          Pharmacy cleared
        </Button>
      </StepRow>
    ) : (
      <StepRow text="Waiting for the pharmacy return-to-stock check." />
    );
  } else if (e.stage === 'HMO_FINAL_LOA') {
    content = can('discharge:final-loa') ? (
      <FinalLoa d={d} />
    ) : (
      <StepRow text={`Waiting for the final approval from ${d.hmo?.providerName ?? 'the HMO'}.`} />
    );
  } else if (e.stage === 'PENDING_SETTLEMENT') {
    if (e.billState === 'DRAFT') {
      const open = d.disputes.filter((x) => x.status === 'OPEN').length;
      content = can('bill:finalize') ? (
        <StepRow
          text={
            open
              ? `Resolve ${open} open dispute${open > 1 ? 's' : ''} before finalizing.`
              : 'Review the bill below, then finalize it. Charges lock once finalized.'
          }
        >
          <Button onClick={() => run('/bill/finalize')} busy={action.isPending} disabled={open > 0}>
            Finalize bill
          </Button>
        </StepRow>
      ) : (
        <StepRow text="Waiting for billing to finalize the bill." />
      );
    } else {
      content = (
        <StepRow
          text={`Bill ${e.billNumber} is final. Balance due: ${peso(d.ledger?.balanceCents)}. Take a payment or set up a 0% payment plan below.`}
        >
          {can('bill:send') && (
            <Button
              variant="secondary"
              onClick={() => run('/bill/send')}
              busy={action.isPending}
              disabled={!d.patient.hasEmail}
            >
              {e.billSentAt ? 'Email notice again' : 'Notify patient by email'}
            </Button>
          )}
        </StepRow>
      );
    }
  } else if (e.stage === 'CLEARED') {
    content = <ClearedPass d={d} />;
  }

  return (
    <Card title={`Next step · ${STAGE_LABELS[e.stage]}`}>
      {action.isError && (
        <div className="mb-3">
          <Alert>{errorMessage(action.error)}</Alert>
        </div>
      )}
      {content}
    </Card>
  );
}

function StepRow({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-2xl text-sm text-muted">{text}</p>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

function SignPf({ d, onBehalf }: { d: EncounterDetail; onBehalf: boolean }) {
  const action = useAction(d.encounter.id);
  const existing = d.charges.find((c) => c.category === 'PROFESSIONAL_FEE' && !c.removedAt);
  const [cents, setCents] = useState<number | null>(existing?.grossCents ?? null);
  const [reason, setReason] = useState('');
  const excess =
    cents !== null && d.encounter.pfCeilingCents !== null
      ? Math.max(0, cents - d.encounter.pfCeilingCents)
      : 0;
  return (
    <form
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (cents !== null)
          action.mutate({
            path: '/discharge/sign-pf',
            body: { agreedPfCents: cents, ...(onBehalf ? { onBehalfReason: reason } : {}) },
          });
      }}
    >
      {action.isError && (
        <div className="sm:col-span-3">
          <Alert>{errorMessage(action.error)}</Alert>
        </div>
      )}
      <MoneyInput
        label="Professional fee"
        initialCents={cents}
        onChange={setCents}
        hint={
          d.encounter.pfCeilingCents !== null
            ? `Accredited ceiling ${peso(d.encounter.pfCeilingCents)}${excess ? ` · patient pays ${peso(excess)} above it` : ''}`
            : undefined
        }
      />
      {onBehalf ? (
        <Field label="Reason for signing on the physician’s behalf">
          {(f) => <Input {...f} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      ) : (
        <div />
      )}
      <Button
        type="submit"
        busy={action.isPending}
        disabled={cents === null || cents <= 0 || (onBehalf && reason.trim().length < 10)}
      >
        <Check aria-hidden className="size-4" />
        Sign fee
      </Button>
    </form>
  );
}

function FinalLoa({ d }: { d: EncounterDetail }) {
  const action = useAction(d.encounter.id);
  const [cents, setCents] = useState<number | null>(null);
  const [code, setCode] = useState('');
  return (
    <form
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (cents !== null)
          action.mutate({ path: '/discharge/final-loa', body: { approvedCents: cents, approvalCode: code } });
      }}
    >
      {action.isError && (
        <div className="sm:col-span-3">
          <Alert>{errorMessage(action.error)}</Alert>
        </div>
      )}
      <MoneyInput
        label={`Approved by ${d.hmo?.providerName ?? 'HMO'}`}
        hint={`Benefit limit ${peso(d.hmo?.mblCents)}. Enter 0.00 if declined.`}
        onChange={setCents}
      />
      <Field label="Approval code">
        {(f) => (
          <Input {...f} value={code} maxLength={32} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        )}
      </Field>
      <Button type="submit" busy={action.isPending} disabled={cents === null || code.length < 4}>
        Record final LOA
      </Button>
    </form>
  );
}

function ClearedPass({ d }: { d: EncounterDetail }) {
  const { can } = useStaff();
  const active = d.gatePasses.find((p) => p.status === 'ACTIVE');
  const [pass, setPass] = useState<{ passNumber: string; pin: string; expiresAt: string } | null>(null);
  const reveal = useMutation({
    mutationFn: () =>
      api<{ passNumber: string; pin: string; expiresAt: string }>(
        `/v1/staff/encounters/${d.encounter.id}/gate-pass`,
      ),
    onSuccess: setPass,
  });
  const printRef = useRef<HTMLDivElement>(null);
  if (!active) {
    const used = d.gatePasses.find((p) => p.status === 'USED');
    return (
      <StepRow
        text={
          used ? `Patient left through the lobby on ${when(used.usedAt)}.` : 'Cleared. No active exit pass.'
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <StepRow text={`Cleared to exit. Pass ${active.passNumber} is valid until ${when(active.expiresAt)}.`}>
        {can('gatepass:read') && !pass && (
          <Button variant="secondary" onClick={() => reveal.mutate()} busy={reveal.isPending}>
            Show pass to print
          </Button>
        )}
      </StepRow>
      {reveal.isError && <Alert>{errorMessage(reveal.error)}</Alert>}
      {pass && (
        <div ref={printRef} className="flex flex-wrap items-center gap-6 rounded-lg border border-line p-4">
          <QrCode value={pass.passNumber} label={`Exit pass ${pass.passNumber}`} size={140} />
          <div>
            <p className="text-sm text-subtle">Exit pass</p>
            <p className="font-mono text-lg font-semibold">{pass.passNumber}</p>
            <p className="mt-2 text-sm text-subtle">PIN for the lobby</p>
            <p className="tabular font-mono text-2xl font-semibold tracking-[0.3em]">{pass.pin}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer aria-hidden className="size-4" />
            Print
          </Button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ bill
function BillCard({ d }: { d: EncounterDetail }) {
  const { can } = useStaff();
  const action = useAction(d.encounter.id);
  const [addOpen, setAddOpen] = useState(false);
  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const editable =
    d.encounter.billState === 'DRAFT' &&
    !['PENDING_SETTLEMENT', 'CLEARED'].includes(d.encounter.stage) &&
    !d.encounter.voidedAt;
  const live = d.charges.filter((c) => !c.removedAt);
  const l = d.ledger;
  return (
    <Card
      title="Bill"
      actions={
        can('charge:write') &&
        editable && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            Post charge
          </Button>
        )
      }
    >
      {l && (
        <dl className="mb-5 flex max-w-md flex-col gap-y-1 text-sm">
          <Line label="Gross charges" value={peso(l.grossCents)} strong />
          <Line label="VAT exemption (senior/PWD)" value={minus(l.vatExemptionCents)} />
          <Line label="20% senior/PWD discount" value={minus(l.seniorPwdDiscountCents)} />
          <Line label="PhilHealth" value={minus(l.philhealthCents)} />
          <Line label="HMO" value={minus(l.hmoCents)} />
          <Line label="Patient pays" value={peso(l.netPatientDueCents)} strong />
          <Line label="Paid" value={peso(l.paidCents)} />
          <Line label="Financed (promissory)" value={peso(l.financedCents)} />
          <Line label="Balance" value={peso(l.balanceCents)} strong />
          {l.creditCents > 0 && <Line label="Refund due to patient" value={peso(l.creditCents)} strong />}
        </dl>
      )}
      {action.isError && (
        <div className="mb-3">
          <Alert>{errorMessage(action.error)}</Alert>
        </div>
      )}
      {live.length === 0 ? (
        <Empty title="No charges posted yet." />
      ) : (
        <Table head={['Item', 'Qty', 'Unit', 'Amount', 'Coverage', '']} caption="Itemized charges">
          {live.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2.5">
                <p className="font-medium">{c.description}</p>
                <p className="text-xs text-subtle">
                  {c.code} · {humanize(c.category)}
                </p>
              </td>
              <td className="tabular px-3 py-2.5">{c.quantity}</td>
              <td className="tabular px-3 py-2.5">{peso(c.unitPriceCents)}</td>
              <td className="tabular px-3 py-2.5">{peso(c.grossCents)}</td>
              <td className="px-3 py-2.5">
                <Badge
                  tone={c.coverage === 'COVERED' ? 'good' : c.coverage === 'WAIVED' ? 'neutral' : 'warn'}
                >
                  {c.coverage === 'EXCLUDED' ? 'Patient pays' : humanize(c.coverage)}
                </Badge>
                {c.isDisputed && (
                  <span className="ml-1">
                    <Badge tone="bad">Disputed</Badge>
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                {can('dispute:file') &&
                  !c.isDisputed &&
                  c.coverage !== 'WAIVED' &&
                  d.encounter.stage !== 'CLEARED' && (
                    <Button size="sm" variant="ghost" onClick={() => setDisputeFor(c.id)}>
                      Dispute
                    </Button>
                  )}
                {can('charge:write') && editable && !c.isDisputed && (
                  <RemoveCharge id={d.encounter.id} chargeId={c.id} label={c.description} />
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <AddChargeDialog open={addOpen} onClose={() => setAddOpen(false)} id={d.encounter.id} />
      <DisputeDialog chargeId={disputeFor} onClose={() => setDisputeFor(null)} id={d.encounter.id} />
    </Card>
  );
}

const minus = (cents: number) => (cents ? `−${peso(cents)}` : peso(0));

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-line py-1">
      <dt className={strong ? 'font-medium text-ink' : 'text-muted'}>{label}</dt>
      <dd className={cx('tabular', strong && 'font-semibold')}>{value}</dd>
    </div>
  );
}

function RemoveCharge({ id, chargeId, label }: { id: string; chargeId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const action = useAction(id);
  return (
    <>
      <Button size="sm" variant="ghost" aria-label={`Remove ${label}`} onClick={() => setOpen(true)}>
        <Trash2 aria-hidden className="size-4" />
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Remove “${label}”?`}
        description="The line stays in the record as removed, with your reason."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            action.mutate(
              { path: `/charges/${chargeId}/remove`, body: { reason } },
              { onSuccess: () => setOpen(false) },
            );
          }}
        >
          {action.isError && <Alert>{errorMessage(action.error)}</Alert>}
          <Field label="Reason">
            {(f) => (
              <Input {...f} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              busy={action.isPending}
              disabled={reason.trim().length < 5}
            >
              Remove
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

function AddChargeDialog({ open, onClose, id }: { open: boolean; onClose: () => void; id: string }) {
  const action = useAction(id);
  const [form, setForm] = useState({
    code: '',
    description: '',
    category: 'PHARMACY',
    quantity: '1',
    coverage: 'COVERED',
    explainer: '',
  });
  const [unit, setUnit] = useState<number | null>(null);
  const qty = Number(form.quantity);
  const valid =
    form.code.length >= 2 &&
    form.description.trim().length >= 2 &&
    Number.isInteger(qty) &&
    qty >= 1 &&
    unit !== null &&
    unit > 0;
  return (
    <Dialog open={open} onClose={onClose} title="Post a charge" wide>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          action.mutate(
            {
              path: '/charges',
              body: {
                code: form.code,
                description: form.description,
                category: form.category,
                quantity: qty,
                unitPriceCents: unit,
                coverage: form.coverage,
                ...(form.explainer.trim() ? { explainer: form.explainer.trim() } : {}),
              },
            },
            { onSuccess: onClose },
          );
        }}
      >
        {action.isError && (
          <div className="sm:col-span-2">
            <Alert>{errorMessage(action.error)}</Alert>
          </div>
        )}
        <Field label="Code">
          {(f) => (
            <Input
              {...f}
              value={form.code}
              maxLength={32}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
          )}
        </Field>
        <Field label="Category">
          {(f) => (
            <Select
              {...f}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CHARGE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {humanize(c)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            {(f) => (
              <Input
                {...f}
                value={form.description}
                maxLength={200}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            )}
          </Field>
        </div>
        <Field label="Quantity">
          {(f) => (
            <Input
              {...f}
              inputMode="numeric"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value.replace(/\D/g, '') })}
            />
          )}
        </Field>
        <MoneyInput label="Unit price" onChange={setUnit} />
        <Field
          label="Who pays"
          hint="Payers never cover items marked “patient pays” (for example toiletries)."
        >
          {(f) => (
            <Select
              {...f}
              value={form.coverage}
              onChange={(e) => setForm({ ...form, coverage: e.target.value })}
            >
              <option value="COVERED">Payers may cover</option>
              <option value="EXCLUDED">Patient pays</option>
            </Select>
          )}
        </Field>
        <Field label="Plain-language explanation (shown to the patient)">
          {(f) => (
            <Input
              {...f}
              value={form.explainer}
              maxLength={300}
              onChange={(e) => setForm({ ...form, explainer: e.target.value })}
            />
          )}
        </Field>
        <div className="flex items-center justify-between gap-2 sm:col-span-2">
          <p className="tabular text-sm text-muted">Line total: {valid ? peso(qty * unit!) : '—'}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" busy={action.isPending} disabled={!valid}>
              Post charge
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function DisputeDialog({
  chargeId,
  onClose,
  id,
}: {
  chargeId: string | null;
  onClose: () => void;
  id: string;
}) {
  const action = useAction(id);
  const [category, setCategory] = useState<string>('OTHER');
  const [reason, setReason] = useState('');
  return (
    <Dialog
      open={chargeId !== null}
      onClose={onClose}
      title="Dispute a charge"
      description="Another staff member must resolve it (separation of duties)."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          action.mutate(
            { path: '/disputes', body: { chargeId, category, reason } },
            {
              onSuccess: () => {
                setReason('');
                onClose();
              },
            },
          );
        }}
      >
        {action.isError && <Alert>{errorMessage(action.error)}</Alert>}
        <Field label="Why">
          {(f) => (
            <Select {...f} value={category} onChange={(e) => setCategory(e.target.value)}>
              {DISPUTE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {humanize(c)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Details" hint="At least 10 characters.">
          {(f) => (
            <Textarea {...f} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={action.isPending} disabled={reason.trim().length < 10}>
            File dispute
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ------------------------------------------------------------------ coverage
function CoverageCard({ d }: { d: EncounterDetail }) {
  const { can } = useStaff();
  const editable =
    d.encounter.billState === 'DRAFT' &&
    !['PENDING_SETTLEMENT', 'CLEARED'].includes(d.encounter.stage) &&
    !d.encounter.voidedAt;
  return (
    <Card title="Coverage">
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">PhilHealth</h3>
          {d.philhealth ? (
            <p className="mt-1 text-sm">
              {d.philhealth.caseRateCode} · hospital {peso(d.philhealth.hciCents)} · doctor{' '}
              {peso(d.philhealth.pfCents)}
              <span className="block text-xs text-subtle">
                Claim {d.philhealth.claimNumber} · PIN ···{d.patient.philhealthPinLast4 ?? '—'}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-subtle">No case rate yet.</p>
          )}
          {can('coverage:philhealth') && editable && <PhilhealthForm d={d} />}
        </section>
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">HMO</h3>
          {d.hmo ? (
            <p className="mt-1 text-sm">
              {d.hmo.providerName} ···{d.hmo.memberNumberLast4} · limit {peso(d.hmo.mblCents)}
              <span className="block text-xs text-subtle">
                Final LOA: {humanize(d.hmo.loaStatus)}
                {d.hmo.loaStatus === 'APPROVED'
                  ? ` · ${peso(d.hmo.approvedCents)} (${d.hmo.approvalCode})`
                  : ''}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-subtle">No HMO on file.</p>
          )}
          {can('coverage:hmo') && editable && <HmoForm d={d} />}
        </section>
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">Patient-only amounts</h3>
          <p className="mt-1 text-sm">
            Room upgrade {peso(d.encounter.roomUpgradeExcessCents)} · fee above ceiling{' '}
            {peso(d.encounter.doctorExcessPfCents)}
          </p>
          {can('charge:write') && editable && <AdjustmentsForm d={d} />}
        </section>
      </div>
    </Card>
  );
}

function InlineForm({
  label,
  children,
  onSubmit,
  busy,
  error,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onSubmit: () => void;
  busy: boolean;
  error: unknown;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button size="sm" variant="ghost" className="mt-1 -ml-3" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-lg bg-slate-50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {error ? <Alert>{errorMessage(error)}</Alert> : null}
      {children}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" type="submit" busy={busy} disabled={disabled}>
          Save
        </Button>
      </div>
    </form>
  );
}

function PhilhealthForm({ d }: { d: EncounterDetail }) {
  const action = useAction(d.encounter.id);
  const [code, setCode] = useState(d.philhealth?.caseRateCode ?? '');
  const [hci, setHci] = useState<number | null>(d.philhealth?.hciCents ?? null);
  const [pf, setPf] = useState<number | null>(d.philhealth?.pfCents ?? null);
  return (
    <InlineForm
      label={d.philhealth ? 'Edit case rate' : 'Set case rate'}
      busy={action.isPending}
      error={action.error}
      disabled={code.length < 2 || hci === null || pf === null}
      onSubmit={() =>
        action.mutate({
          path: '/philhealth',
          method: 'PUT',
          body: { caseRateCode: code, hciCents: hci, pfCents: pf },
        })
      }
    >
      <Field label="Case rate code">
        {(f) => (
          <Input {...f} value={code} maxLength={16} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        )}
      </Field>
      <MoneyInput label="Hospital share (HCI)" initialCents={hci} onChange={setHci} />
      <MoneyInput label="Professional fee share" initialCents={pf} onChange={setPf} />
    </InlineForm>
  );
}

function HmoForm({ d }: { d: EncounterDetail }) {
  const action = useAction(d.encounter.id);
  const [provider, setProvider] = useState(d.hmo?.providerName ?? '');
  const [last4, setLast4] = useState(d.hmo?.memberNumberLast4 ?? '');
  const [mbl, setMbl] = useState<number | null>(d.hmo?.mblCents ?? null);
  return (
    <InlineForm
      label={d.hmo ? 'Edit HMO' : 'Add HMO'}
      busy={action.isPending}
      error={action.error}
      disabled={provider.trim().length < 2 || !/^\d{4}$/.test(last4) || mbl === null}
      onSubmit={() =>
        action.mutate({
          path: '/hmo',
          method: 'PUT',
          body: { providerName: provider.trim(), memberNumberLast4: last4, mblCents: mbl },
        })
      }
    >
      <Field label="Provider">
        {(f) => (
          <Input {...f} value={provider} maxLength={64} onChange={(e) => setProvider(e.target.value)} />
        )}
      </Field>
      <Field label="Card number, last 4 digits" hint="Never enter the full member number.">
        {(f) => (
          <Input
            {...f}
            inputMode="numeric"
            value={last4}
            maxLength={4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
          />
        )}
      </Field>
      <MoneyInput label="Maximum benefit limit" initialCents={mbl} onChange={setMbl} />
    </InlineForm>
  );
}

function AdjustmentsForm({ d }: { d: EncounterDetail }) {
  const action = useAction(d.encounter.id);
  const [room, setRoom] = useState<number | null>(d.encounter.roomUpgradeExcessCents);
  const [ceiling, setCeiling] = useState<number | null>(d.encounter.pfCeilingCents);
  return (
    <InlineForm
      label="Edit"
      busy={action.isPending}
      error={action.error}
      disabled={room === null}
      onSubmit={() =>
        action.mutate({
          path: '/adjustments',
          method: 'PUT',
          body: { roomUpgradeExcessCents: room, pfCeilingCents: ceiling },
        })
      }
    >
      <MoneyInput label="Room upgrade the patient pays" initialCents={room} onChange={setRoom} />
      <MoneyInput
        label="Accredited professional fee ceiling"
        hint="Leave empty if none applies."
        initialCents={ceiling}
        onChange={setCeiling}
      />
    </InlineForm>
  );
}

// ------------------------------------------------------------------ settlement
function SettlementCard({ d }: { d: EncounterDetail }) {
  const { can } = useStaff();
  const [payOpen, setPayOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const settleable =
    d.encounter.stage === 'PENDING_SETTLEMENT' &&
    d.encounter.billState !== 'DRAFT' &&
    (d.ledger?.balanceCents ?? 0) > 0;
  return (
    <Card
      title="Payments and payment plans"
      actions={
        settleable && (
          <>
            {can('payment:record') && (
              <Button size="sm" onClick={() => setPayOpen(true)}>
                Record payment
              </Button>
            )}
            {can('promissory:create') && !d.promissoryNotes.some((n) => n.status === 'ACTIVE') && (
              <Button size="sm" variant="secondary" onClick={() => setNoteOpen(true)}>
                Promissory note
              </Button>
            )}
          </>
        )
      }
    >
      {d.payments.length === 0 && d.promissoryNotes.length === 0 ? (
        <Empty title="No payments yet." />
      ) : (
        <div className="flex flex-col gap-5">
          {d.payments.length > 0 && (
            <Table head={['Official receipt', 'Method', 'Payer', 'Date', 'Amount']} caption="Payments">
              {d.payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {p.officialReceiptNumber}
                    {p.isSimulated && (
                      <span className="ml-2">
                        <Badge tone="warn">Simulated</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{humanize(p.rail)}</td>
                  <td className="px-3 py-2.5">{p.payerName}</td>
                  <td className="px-3 py-2.5">{when(p.createdAt)}</td>
                  <td className="tabular px-3 py-2.5">{peso(p.amountCents)}</td>
                </tr>
              ))}
            </Table>
          )}
          {d.promissoryNotes.map((n) => (
            <div key={n.id} className="rounded-lg border border-line p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  Promissory note {n.noteNumber} · {peso(n.principalCents)} over {n.months} months, 0%
                  interest
                </p>
                <Badge tone={n.status === 'ACTIVE' ? 'info' : 'good'}>{humanize(n.status)}</Badge>
              </div>
              <p className="mt-1 text-subtle">
                {n.borrowerName} ({humanize(n.relationship)}) · {humanize(n.idType)} ···{n.idLast4} · signed{' '}
                {when(n.signedAt)}
              </p>
              <ol className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-3">
                {n.schedule.map((i) => (
                  <li key={i.sequence} className="tabular">
                    {day(i.dueDate)}: {peso(i.amountCents)}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
      <PaymentDialog open={payOpen} onClose={() => setPayOpen(false)} d={d} />
      <NoteDialog open={noteOpen} onClose={() => setNoteOpen(false)} d={d} />
    </Card>
  );
}

function PaymentDialog({ open, onClose, d }: { open: boolean; onClose: () => void; d: EncounterDetail }) {
  const action = useAction(d.encounter.id);
  const [cents, setCents] = useState<number | null>(d.ledger?.balanceCents ?? null);
  const [rail, setRail] = useState<string>('CASH');
  const [payer, setPayer] = useState('');
  const [reference, setReference] = useState('');
  // One key per dialog session: a double click or a retry after a timeout cannot charge twice.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const balance = d.ledger?.balanceCents ?? 0;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record a payment"
      description={`Balance due ${peso(balance)}. An official receipt number is issued automatically.`}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          action.mutate(
            {
              path: '/payments',
              body: {
                amountCents: cents,
                rail,
                payerName: payer.trim(),
                ...(reference.trim() ? { externalReference: reference.trim() } : {}),
              },
              idempotencyKey,
            },
            {
              onSuccess: () => {
                setIdempotencyKey(newIdempotencyKey());
                onClose();
              },
            },
          );
        }}
      >
        {action.isError && <Alert>{errorMessage(action.error)}</Alert>}
        <MoneyInput label="Amount" initialCents={balance} onChange={setCents} />
        <Field label="Method">
          {(f) => (
            <Select {...f} value={rail} onChange={(e) => setRail(e.target.value)}>
              {STAFF_PAYMENT_RAILS.map((r) => (
                <option key={r} value={r}>
                  {humanize(r)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Paid by">
          {(f) => <Input {...f} value={payer} maxLength={120} onChange={(e) => setPayer(e.target.value)} />}
        </Field>
        <Field label="Terminal or transfer reference (optional)">
          {(f) => (
            <Input {...f} value={reference} maxLength={64} onChange={(e) => setReference(e.target.value)} />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            busy={action.isPending}
            disabled={cents === null || cents <= 0 || cents > balance || payer.trim().length < 2}
          >
            Record {cents ? peso(cents) : ''}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function NoteDialog({ open, onClose, d }: { open: boolean; onClose: () => void; d: EncounterDetail }) {
  const action = useAction(d.encounter.id);
  const balance = d.ledger?.balanceCents ?? 0;
  const [cents, setCents] = useState<number | null>(balance);
  const [form, setForm] = useState({
    borrowerName: d.patient.fullName,
    relationship: 'SELF',
    idType: 'PHILSYS',
    idNumber: '',
    months: 6 as InstallmentTerm,
    acceptTerms: false,
  });
  const rule = GOVERNMENT_ID_RULES[form.idType as keyof typeof GOVERNMENT_ID_RULES];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Promissory note (RA 9439)"
      description="0% interest and no fees. The patient may leave once the remaining balance is covered by the note."
      wide
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          action.mutate(
            { path: '/promissory-notes', body: { ...form, principalCents: cents } },
            { onSuccess: onClose },
          );
        }}
      >
        {action.isError && (
          <div className="sm:col-span-2">
            <Alert>{errorMessage(action.error)}</Alert>
          </div>
        )}
        <Field label="Borrower name">
          {(f) => (
            <Input
              {...f}
              value={form.borrowerName}
              maxLength={120}
              onChange={(e) => setForm({ ...form, borrowerName: e.target.value })}
            />
          )}
        </Field>
        <Field label="Relationship to patient">
          {(f) => (
            <Select
              {...f}
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
            >
              {['SELF', 'SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'GUARANTOR'].map((r) => (
                <option key={r} value={r}>
                  {humanize(r)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Government ID">
          {(f) => (
            <Select {...f} value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })}>
              {GOVERNMENT_ID_TYPES.map((t) => (
                <option key={t} value={t}>
                  {GOVERNMENT_ID_RULES[t].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="ID number" hint={rule.hint}>
          {(f) => (
            <Input
              {...f}
              value={form.idNumber}
              maxLength={32}
              autoComplete="off"
              onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
            />
          )}
        </Field>
        <MoneyInput
          label="Amount financed"
          initialCents={balance}
          hint={`Up to the balance of ${peso(balance)}`}
          onChange={setCents}
        />
        <Field label="Term">
          {(f) => (
            <Select
              {...f}
              value={form.months}
              onChange={(e) => setForm({ ...form, months: Number(e.target.value) as InstallmentTerm })}
            >
              {INSTALLMENT_TERMS.map((m) => (
                <option key={m} value={m}>
                  {m} monthly installments{cents ? ` of about ${peso(Math.floor(cents / m))}` : ''}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-brand-700"
            checked={form.acceptTerms}
            onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
          />
          The borrower read the terms, showed the original ID, and agrees to pay the installments on the due
          dates.
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            busy={action.isPending}
            disabled={!form.acceptTerms || cents === null || cents <= 0 || cents > balance || !form.idNumber}
          >
            Sign note
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ------------------------------------------------------------------ disputes and timeline
function DisputesCard({ d }: { d: EncounterDetail }) {
  if (d.disputes.length === 0) return null;
  const charge = (id: string) => d.charges.find((c) => c.id === id);
  return (
    <Card title="Disputes">
      <ul className="divide-y divide-line">
        {d.disputes.map((x) => (
          <li key={x.id} className="py-3 text-sm first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {charge(x.chargeId)?.description ?? 'Charge'} · {peso(x.contestedCents)}
              </p>
              <Badge tone={x.status === 'OPEN' ? 'warn' : x.status === 'WAIVED' ? 'good' : 'neutral'}>
                {humanize(x.status)}
              </Badge>
            </div>
            <p className="mt-1 text-muted">
              {humanize(x.category)}: {x.reason}
            </p>
            {x.resolutionNote && <p className="mt-1 text-subtle">Resolution: {x.resolutionNote}</p>}
            <p className="mt-1 text-xs text-subtle">
              Filed {when(x.createdAt)} by {x.filedByAccountId ? 'the patient' : 'staff'}
              {x.status === 'OPEN' && ' · resolve it from the Disputes page'}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TimelineCard({ d }: { d: EncounterDetail }) {
  return (
    <Card title="History">
      {d.timeline.length === 0 ? (
        <Empty title="Nothing yet." />
      ) : (
        <ol className="flex flex-col gap-3">
          {d.timeline.map((t) => (
            <li key={t.id} className="border-l-2 border-brand-100 pl-3 text-sm">
              <p className="font-medium">{t.title}</p>
              {t.detail && <p className="text-muted">{t.detail}</p>}
              <p className="text-xs text-subtle">
                {when(t.createdAt)} · {t.actorLabel}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
