import { computeWaterfall, MoneyError, parsePesos } from '@medcore/domain';
import { useState } from 'react';
import { Alert, Card, Field, Input, PageHeader } from '../../components/ui';
import { peso } from '../../lib/format';

/**
 * v1 pre-admission cost estimator, now on the real statutory waterfall engine
 * (@medcore/domain computeWaterfall) instead of hard-coded procedure figures.
 * Nothing is saved; it is a counselling aid before admission.
 */
const PRESETS = [
  {
    label: 'Laparoscopic cholecystectomy',
    hospital: '110,000',
    pf: '25,000',
    hci: '21,000',
    pfShare: '10,000',
  },
  { label: 'Cesarean section (primary)', hospital: '78,000', pf: '20,000', hci: '19,000', pfShare: '9,000' },
  { label: 'Appendectomy', hospital: '88,000', pf: '22,000', hci: '16,000', pfShare: '8,000' },
] as const;

export function Estimator() {
  const [hospital, setHospital] = useState('110,000');
  const [pf, setPf] = useState('25,000');
  const [hci, setHci] = useState('21,000');
  const [pfShare, setPfShare] = useState('10,000');
  const [hmo, setHmo] = useState('0');
  const [excluded, setExcluded] = useState('0');
  const [seniorOrPwd, setSeniorOrPwd] = useState(false);

  let result: ReturnType<typeof computeWaterfall> | null = null;
  let error: string | null = null;
  try {
    const hospitalCents = parsePesos(hospital);
    const excludedCents = parsePesos(excluded);
    if (excludedCents > hospitalCents) throw new MoneyError('Excluded items cannot exceed hospital charges.');
    result = computeWaterfall({
      charges: [
        { grossCents: hospitalCents - excludedCents, category: 'PROCEDURE', coverage: 'COVERED' },
        { grossCents: excludedCents, category: 'SUPPLIES', coverage: 'EXCLUDED' },
        { grossCents: parsePesos(pf), category: 'PROFESSIONAL_FEE', coverage: 'COVERED' },
      ],
      seniorOrPwd,
      philhealthHciCents: parsePesos(hci),
      philhealthPfCents: parsePesos(pfShare),
      hmoApprovedCents: parsePesos(hmo),
      roomUpgradeExcessCents: 0,
      doctorExcessPfCents: 0,
    });
  } catch (err) {
    error = err instanceof MoneyError ? err.message : 'Check the amounts.';
  }

  const money = (label: string, value: string, set: (v: string) => void, hint?: string) => (
    <Field label={label} hint={hint}>
      {(f) => <Input {...f} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} />}
    </Field>
  );

  return (
    <>
      <PageHeader
        eyebrow="Daily operations"
        title="Pre-admission cost estimator"
        subtitle="Counsel patients before admission. Uses the same statutory waterfall as the final bill; nothing is saved."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Expected charges and coverage">
          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setHospital(p.hospital);
                  setPf(p.pf);
                  setHci(p.hci);
                  setPfShare(p.pfShare);
                }}
                className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50"
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mb-4 text-xs text-subtle">
            Presets are illustrative starting points, not the hospital's price list or official PhilHealth
            case rates.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {money('Hospital charges (₱)', hospital, setHospital, 'Room, medicines, supplies, procedures')}
            {money('Professional fees (₱)', pf, setPf)}
            {money('PhilHealth case rate: hospital share (₱)', hci, setHci)}
            {money('PhilHealth case rate: professional share (₱)', pfShare, setPfShare)}
            {money('HMO approved limit (₱)', hmo, setHmo, 'Leave 0 if the patient has no HMO')}
            {money(
              'Items payers exclude (₱)',
              excluded,
              setExcluded,
              'Disallowed sundries; part of hospital charges',
            )}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-brand-700"
              checked={seniorOrPwd}
              onChange={(e) => setSeniorOrPwd(e.target.checked)}
            />
            Senior citizen or PWD (VAT exemption and 20% discount)
          </label>
        </Card>
        <Card title="Estimated bill">
          {error && <Alert>{error}</Alert>}
          {result && (
            <dl className="flex flex-col gap-2 text-sm">
              {(
                [
                  ['Gross charges', result.grossCents, false],
                  ['VAT exemption', -result.vatExemptionCents, true],
                  ['Senior / PWD discount', -result.seniorPwdDiscountCents, true],
                  ['PhilHealth', -result.philhealthCents, true],
                  ['HMO', -result.hmoCents, true],
                ] as const
              ).map(([label, cents, deduction]) => (
                <div key={label} className="flex justify-between border-b border-line-subtle pb-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className={`tabular font-mono ${deduction && cents !== 0 ? 'text-emerald-700' : ''}`}>
                    {cents < 0 ? `−${peso(-cents)}` : peso(cents)}
                  </dd>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between rounded-xl bg-brand-100 px-4 py-3">
                <dt className="font-semibold text-brand-800">Estimated patient share</dt>
                <dd className="tabular font-mono text-xl font-bold text-brand-800">
                  {peso(result.netPatientDueCents)}
                </dd>
              </div>
              {result.coverageShortfallCents > 0 && (
                <p className="text-xs text-subtle">
                  Includes {peso(result.coverageShortfallCents)} of covered charges that no payer picks up.
                </p>
              )}
              <p className="mt-2 text-xs text-subtle">
                An estimate only. The final bill depends on actual charges, the approved case rate and the
                HMO's final LOA.
              </p>
            </dl>
          )}
        </Card>
      </div>
    </>
  );
}
