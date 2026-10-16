import {
  DISPUTE_CATEGORIES,
  GOVERNMENT_ID_RULES,
  GOVERNMENT_ID_TYPES,
  INSTALLMENT_TERMS,
  ONLINE_BANKS,
  ONLINE_PAYMENT_RAILS,
  type InstallmentTerm,
} from '@medcore/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { MoneyInput } from '../components/MoneyInput';
import { QrCode } from '../components/QrCode';
import {
  Alert,
  Badge,
  Button,
  Card,
  cx,
  Dialog,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';
import { api, errorMessage, newIdempotencyKey } from '../lib/api';
import { day, humanize, peso, stageLabel, when } from '../lib/format';
import type { PortalStay as PortalStayData } from '../lib/types';

type Charge = NonNullable<PortalStayData['charges']>[number];

export function PortalStay() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['portal', 'stay', id],
    queryFn: () => api<PortalStayData>(`/v1/patient/stays/${id}`),
  });
  if (query.isPending) return <Spinner />;
  if (query.isError) return <Alert>{errorMessage(query.error)}</Alert>;
  const d = query.data;

  return (
    <>
      <Link to="/portal" className="mb-4 inline-flex items-center gap-1 text-sm text-subtle hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        Your stays
      </Link>
      <h1 className="text-xl font-semibold">{d.stay.patientName}</h1>
      <p className="mt-1 text-sm text-muted">
        {d.stay.facilityName} · admitted {day(d.stay.admittedAt)} · {d.stay.encounterNumber}
      </p>

      {!d.stay.billReady ? (
        <div className="mt-6">
          <Alert tone="info">
            Your bill is still being prepared ({stageLabel(d.stay.stage).toLowerCase()}). You will get an
            email when it is ready to view.
          </Alert>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {d.gatePass && <ExitPass pass={d.gatePass} />}
          <Summary d={d} />
          {d.ledger && d.ledger.balanceCents > 0 && d.stay.stage !== 'CLEARED' && (
            <PayOptions d={d} id={id} />
          )}
          <Charges d={d} id={id} />
          <History d={d} />
        </div>
      )}
    </>
  );
}

function ExitPass({ pass }: { pass: NonNullable<PortalStayData['gatePass']> }) {
  return (
    <section className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5">
      <div className="flex items-center gap-2 text-emerald-900">
        <CheckCircle2 aria-hidden className="size-5" />
        <h2 className="font-semibold">You are cleared to go home</h2>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <QrCode value={pass.passNumber} label={`Exit pass ${pass.passNumber}`} size={150} />
        <div>
          <p className="text-sm text-emerald-900">Show this at the lobby, then tell the guard your PIN.</p>
          <p className="mt-2 font-mono text-lg font-semibold">{pass.passNumber}</p>
          <p className="mt-2 text-xs text-emerald-800">PIN</p>
          <p className="tabular font-mono text-3xl font-semibold tracking-[0.3em]">{pass.pin}</p>
          <p className="mt-2 text-xs text-emerald-800">
            Valid until {when(pass.expiresAt)}. Do not share the PIN with anyone else.
          </p>
        </div>
      </div>
    </section>
  );
}

function Summary({ d }: { d: PortalStayData }) {
  const l = d.ledger!;
  const rows: [string, number, string?][] = [
    ['Total hospital charges', l.grossCents],
    ...(l.vatExemptionCents
      ? ([
          [
            'VAT exemption (senior/PWD)',
            -l.vatExemptionCents,
            'By law, senior citizens and PWDs do not pay VAT on hospital care.',
          ],
        ] as [string, number, string][])
      : []),
    ...(l.seniorPwdDiscountCents
      ? ([['20% senior/PWD discount', -l.seniorPwdDiscountCents, 'Required by RA 9994 and RA 10754.']] as [
          string,
          number,
          string,
        ][])
      : []),
    ...(l.philhealthCents
      ? ([
          ['Paid by PhilHealth', -l.philhealthCents, 'Your PhilHealth case rate, applied before any HMO.'],
        ] as [string, number, string][])
      : []),
    ...(l.hmoCents
      ? ([['Paid by your HMO', -l.hmoCents, 'What your HMO approved after PhilHealth.']] as [
          string,
          number,
          string,
        ][])
      : []),
  ];
  return (
    <Card title={`Your bill ${d.stay.billNumber ? `· ${d.stay.billNumber}` : ''}`}>
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map(([label, cents, hint]) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <dt>
              {label}
              {hint && <span className="block text-xs text-subtle">{hint}</span>}
            </dt>
            <dd className="tabular">{cents < 0 ? `−${peso(-cents)}` : peso(cents)}</dd>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-line pt-3 text-base font-semibold">
          <dt>Your share</dt>
          <dd className="tabular">{peso(l.netPatientDueCents)}</dd>
        </div>
        {l.paidCents > 0 && (
          <div className="flex justify-between">
            <dt>Already paid</dt>
            <dd className="tabular">−{peso(l.paidCents)}</dd>
          </div>
        )}
        {l.financedCents > 0 && (
          <div className="flex justify-between">
            <dt>On your payment plan (0% interest)</dt>
            <dd className="tabular">−{peso(l.financedCents)}</dd>
          </div>
        )}
        <div className="flex justify-between rounded-lg bg-brand-50 px-3 py-2 text-base font-semibold text-brand-900">
          <dt>Left to pay now</dt>
          <dd className="tabular">{peso(l.balanceCents)}</dd>
        </div>
        {l.creditCents > 0 && (
          <Alert tone="info">
            The hospital owes you a refund of {peso(l.creditCents)}. The billing desk will contact you.
          </Alert>
        )}
      </dl>
    </Card>
  );
}

function PayOptions({ d, id }: { d: PortalStayData; id: string }) {
  const [payOpen, setPayOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const canPay = d.options?.onlinePayments;
  const canPlan = d.options?.onlinePromissory && !d.promissoryNotes?.some((n) => n.status === 'ACTIVE');
  const hasOpenDispute = d.disputes?.some((x) => x.status === 'OPEN');
  return (
    <Card title="How would you like to settle?">
      <div className="flex flex-col gap-3 text-sm">
        {hasOpenDispute && (
          <Alert tone="info">
            You questioned a charge. You can still pay now; we will refund you if the charge is removed.
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          {canPay && <Button onClick={() => setPayOpen(true)}>Pay online</Button>}
          {canPlan && (
            <Button variant="secondary" onClick={() => setPlanOpen(true)}>
              Pay in installments (0% interest)
            </Button>
          )}
        </div>
        <p className="text-subtle">
          You can also pay at the cashier. Under RA 9439 a hospital cannot hold you for unpaid bills; a
          promissory note lets you go home and pay later.
        </p>
      </div>
      <PayDialog open={payOpen} onClose={() => setPayOpen(false)} d={d} id={id} />
      <PlanDialog open={planOpen} onClose={() => setPlanOpen(false)} d={d} id={id} />
    </Card>
  );
}

function useRefresh(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['portal', 'stay', id] });
    queryClient.invalidateQueries({ queryKey: ['portal', 'stays'] });
  };
}

function PayDialog({
  open,
  onClose,
  d,
  id,
}: {
  open: boolean;
  onClose: () => void;
  d: PortalStayData;
  id: string;
}) {
  const refresh = useRefresh(id);
  const balance = d.ledger?.balanceCents ?? 0;
  const [cents, setCents] = useState<number | null>(balance);
  const [rail, setRail] = useState<string>('GCASH');
  const [payer, setPayer] = useState('');
  const [cardBrand, setCardBrand] = useState('VISA');
  const [cardLast4, setCardLast4] = useState('');
  const [bank, setBank] = useState<string>('BPI');
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const pay = useMutation({
    mutationFn: () =>
      api<{ officialReceiptNumber: string; amountCents: number }>(`/v1/patient/stays/${id}/payments`, {
        method: 'POST',
        idempotencyKey,
        body: {
          amountCents: cents,
          rail,
          payerName: payer.trim(),
          ...(rail === 'CARD' ? { cardBrand, cardLast4 } : {}),
          ...(rail === 'BANK_TRANSFER' ? { bank } : {}),
        },
      }),
    onSuccess: () => {
      setIdempotencyKey(newIdempotencyKey());
      refresh();
    },
  });
  const close = () => {
    pay.reset();
    onClose();
  };
  const valid =
    cents !== null &&
    cents > 0 &&
    cents <= balance &&
    payer.trim().length >= 2 &&
    (rail !== 'CARD' || /^\d{4}$/.test(cardLast4));

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Pay online"
      description="This is a demonstration checkout: no money moves and no card details are collected."
    >
      {pay.isSuccess ? (
        <div className="flex flex-col gap-4">
          <Alert tone="good">
            Payment of {peso(pay.data.amountCents)} received. Official receipt{' '}
            {pay.data.officialReceiptNumber}.
          </Alert>
          <Button onClick={close}>Done</Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) pay.mutate();
          }}
        >
          {pay.isError && <Alert>{errorMessage(pay.error)}</Alert>}
          <MoneyInput
            label="Amount"
            initialCents={balance}
            hint={`Up to ${peso(balance)}`}
            onChange={setCents}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Method</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ONLINE_PAYMENT_RAILS.map((r) => (
                <label
                  key={r}
                  className={cx(
                    'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                    rail === r ? 'border-brand-600 bg-brand-50' : 'border-line',
                  )}
                >
                  <input
                    type="radio"
                    name="rail"
                    className="accent-brand-700"
                    checked={rail === r}
                    onChange={() => setRail(r)}
                  />
                  {r === 'QR_PH' ? 'QR Ph' : r === 'GCASH' ? 'GCash' : humanize(r)}
                </label>
              ))}
            </div>
          </fieldset>
          {rail === 'CARD' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Card brand">
                {(f) => (
                  <Select {...f} value={cardBrand} onChange={(e) => setCardBrand(e.target.value)}>
                    <option value="VISA">Visa</option>
                    <option value="MASTERCARD">Mastercard</option>
                    <option value="JCB">JCB</option>
                  </Select>
                )}
              </Field>
              <Field label="Last 4 digits only">
                {(f) => (
                  <Input
                    {...f}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                  />
                )}
              </Field>
            </div>
          )}
          {rail === 'BANK_TRANSFER' && (
            <Field label="Bank">
              {(f) => (
                <Select {...f} value={bank} onChange={(e) => setBank(e.target.value)}>
                  {ONLINE_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field label="Name of the person paying">
            {(f) => (
              <Input
                {...f}
                autoComplete="name"
                maxLength={120}
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" busy={pay.isPending} disabled={!valid}>
              Pay {cents ? peso(cents) : ''}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function PlanDialog({
  open,
  onClose,
  d,
  id,
}: {
  open: boolean;
  onClose: () => void;
  d: PortalStayData;
  id: string;
}) {
  const refresh = useRefresh(id);
  const balance = d.ledger?.balanceCents ?? 0;
  const [form, setForm] = useState({
    borrowerName: d.stay.patientName,
    relationship: 'SELF',
    idType: 'PHILSYS',
    idNumber: '',
    months: 6 as InstallmentTerm,
    acceptTerms: false,
  });
  const sign = useMutation({
    mutationFn: () =>
      api(`/v1/patient/stays/${id}/promissory-notes`, {
        method: 'POST',
        body: { ...form, principalCents: balance },
      }),
    onSuccess: () => {
      refresh();
      onClose();
    },
  });
  const rule = GOVERNMENT_ID_RULES[form.idType as keyof typeof GOVERNMENT_ID_RULES];
  const monthly = Math.floor(balance / form.months);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pay in installments"
      description={`${peso(balance)} over a few months. 0% interest, no fees (RA 9439).`}
      wide
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          sign.mutate();
        }}
      >
        {sign.isError && (
          <div className="sm:col-span-2">
            <Alert>{errorMessage(sign.error)}</Alert>
          </div>
        )}
        <Field label="Term">
          {(f) => (
            <Select
              {...f}
              value={form.months}
              onChange={(e) => setForm({ ...form, months: Number(e.target.value) as InstallmentTerm })}
            >
              {INSTALLMENT_TERMS.map((m) => (
                <option key={m} value={m}>
                  {m} months · about {peso(Math.floor(balance / m))} a month
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Borrower’s full name">
          {(f) => (
            <Input
              {...f}
              value={form.borrowerName}
              maxLength={120}
              onChange={(e) => setForm({ ...form, borrowerName: e.target.value })}
            />
          )}
        </Field>
        <Field label="Relationship to the patient">
          {(f) => (
            <Select
              {...f}
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
            >
              {['SELF', 'SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'GUARANTOR'].map((r) => (
                <option key={r} value={r}>
                  {r === 'SELF' ? 'I am the patient' : humanize(r)}
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
        <div className="sm:col-span-2">
          <Field label="ID number" hint={rule.hint}>
            {(f) => (
              <Input
                {...f}
                autoComplete="off"
                maxLength={32}
                value={form.idNumber}
                onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
              />
            )}
          </Field>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm sm:col-span-2">
          You agree to pay {peso(balance)} in {form.months} monthly payments of about {peso(monthly)},
          starting one month from today, with no interest and no fees. The ID number is stored encrypted; only
          its last 4 digits are shown.
        </div>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-brand-700"
            checked={form.acceptTerms}
            onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
          />
          I have read and accept these terms.
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            busy={sign.isPending}
            disabled={!form.acceptTerms || !form.idNumber || form.borrowerName.trim().length < 2}
          >
            Sign payment plan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Charges({ d, id }: { d: PortalStayData; id: string }) {
  const [asking, setAsking] = useState<Charge | null>(null);
  const charges = (d.charges ?? []).filter((c) => c.coverage !== 'WAIVED');
  const removed = (d.charges ?? []).filter((c) => c.coverage === 'WAIVED');
  const categories = [...new Set(charges.map((c) => c.category))];
  return (
    <Card title="What you were charged for">
      <div className="flex flex-col gap-5">
        {categories.map((cat) => (
          <section key={cat}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">{humanize(cat)}</h3>
            <ul className="mt-2 divide-y divide-line">
              {charges
                .filter((c) => c.category === cat)
                .map((c) => (
                  <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {c.description}
                        {c.quantity > 1 && <span className="font-normal text-subtle"> × {c.quantity}</span>}
                      </p>
                      {c.explainer && <p className="text-subtle">{c.explainer}</p>}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.coverage === 'EXCLUDED' && <Badge tone="warn">Not covered by insurers</Badge>}
                        {c.isDisputed && <Badge tone="info">Under review</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="tabular">{peso(c.grossCents)}</p>
                      {!c.isDisputed && d.stay.stage !== 'CLEARED' && (
                        <button
                          type="button"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-800"
                          onClick={() => setAsking(c)}
                        >
                          <HelpCircle aria-hidden className="size-3.5" />
                          Question this charge
                        </button>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        ))}
        {removed.length > 0 && (
          <p className="text-sm text-subtle">
            Removed after review: {removed.map((c) => `${c.description} (${peso(c.grossCents)})`).join(', ')}.
          </p>
        )}
      </div>
      <AskDialog charge={asking} onClose={() => setAsking(null)} id={id} />
    </Card>
  );
}

function AskDialog({ charge, onClose, id }: { charge: Charge | null; onClose: () => void; id: string }) {
  const refresh = useRefresh(id);
  const [category, setCategory] = useState<string>('NOT_RECEIVED');
  const [reason, setReason] = useState('');
  const ask = useMutation({
    mutationFn: () =>
      api(`/v1/patient/stays/${id}/disputes`, {
        method: 'POST',
        body: { chargeId: charge!.id, category, reason },
      }),
    onSuccess: () => {
      refresh();
      setReason('');
      onClose();
    },
  });
  return (
    <Dialog
      open={charge !== null}
      onClose={onClose}
      title="Question this charge"
      description={charge ? `${charge.description} · ${peso(charge.grossCents)}` : undefined}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          ask.mutate();
        }}
      >
        {ask.isError && <Alert>{errorMessage(ask.error)}</Alert>}
        <Field label="What seems wrong?">
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
        <Field label="Tell us more" hint="At least 10 characters. A billing staff member will review it.">
          {(f) => (
            <Textarea {...f} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={ask.isPending} disabled={reason.trim().length < 10}>
            Send question
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function History({ d }: { d: PortalStayData }) {
  return (
    <Card title="Payments and updates">
      <div className="flex flex-col gap-4 text-sm">
        {(d.payments ?? []).map((p) => (
          <div key={p.reference} className="flex justify-between gap-3">
            <div>
              <p className="font-medium">Payment · {humanize(p.rail)}</p>
              <p className="text-xs text-subtle">
                Official receipt {p.officialReceiptNumber} · {when(p.createdAt)}
              </p>
            </div>
            <p className="tabular">{peso(p.amountCents)}</p>
          </div>
        ))}
        {(d.promissoryNotes ?? []).map((n) => (
          <div key={n.noteNumber}>
            <p className="font-medium">
              Payment plan {n.noteNumber} · {peso(n.principalCents)} over {n.months} months
            </p>
            <ul className="mt-1 grid gap-0.5 text-xs text-subtle sm:grid-cols-2">
              {n.schedule.map((i) => (
                <li key={i.sequence} className="tabular">
                  {day(i.dueDate)}: {peso(i.amountCents)}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {(d.disputes ?? []).map((x) => (
          <div key={x.id}>
            <p className="font-medium">
              Charge question ·{' '}
              <Badge tone={x.status === 'OPEN' ? 'info' : x.status === 'WAIVED' ? 'good' : 'neutral'}>
                {x.status === 'OPEN'
                  ? 'Under review'
                  : x.status === 'WAIVED'
                    ? 'Removed from bill'
                    : 'Charge confirmed'}
              </Badge>
            </p>
            <p className="text-subtle">{x.reason}</p>
            {x.resolutionNote && <p className="text-subtle">Answer: {x.resolutionNote}</p>}
          </div>
        ))}
        {(d.timeline ?? []).length > 0 && (
          <ol className="flex flex-col gap-2 border-t border-line pt-3">
            {d.timeline!.map((t, i) => (
              <li key={i} className="text-xs text-subtle">
                <span className="font-medium text-ink">{t.title}</span> · {when(t.createdAt)}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}
