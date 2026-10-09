import React, { useState, useEffect, useRef } from 'react';
import { GOVERNMENT_ID_RULES, validateGovernmentId, type GovernmentIdType } from '../../../../shared/governmentId';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPeso } from '@/utils/formatters';
import { calculateInstallmentPlan } from '@/utils/financing';
import {
  FileText,
  X,
  CheckCircle2,
  ShieldCheck,
  Scale,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Button, IconButton, Select } from '@/components/common';

export const DigitalPromissoryModal: React.FC = () => {
  const {
    isPromissoryModalOpen,
    closePromissoryModal,
    selectedEncounter,
    executePromissoryNote,
    promissoryCustomAmount,
    promissoryItemContext,
    encounters,
    selectEncounter
  } = useMedCore();

  const enc = selectedEncounter;
  const eligibleEncounters = encounters.filter(e => e.waterfall.netPatientDue > 0);
  const initialPrincipal = promissoryCustomAmount !== null
    ? promissoryCustomAmount
    : (enc ? enc.waterfall.netPatientDue : 0);

  const [principalAmount, setPrincipalAmount] = useState<number>(initialPrincipal);
  const [borrowerName, setBorrowerName] = useState(enc ? enc.patient.fullName || enc.patient.maskedName : '');
  const [idType, setIdType] = useState<GovernmentIdType>('PHILSYS_NATIONAL_ID');
  const [idNumber, setIdNumber] = useState('');
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const [isSuccess, setIsSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const identity = validateGovernmentId(idType, idNumber);
  const idRule = GOVERNMENT_ID_RULES[idType];

  // Sync state whenever selected encounter changes or modal opens
  useEffect(() => {
    if (enc) {
      setBorrowerName(enc.patient.fullName || enc.patient.maskedName);
      const amt = promissoryCustomAmount !== null ? promissoryCustomAmount : enc.waterfall.netPatientDue;
      setPrincipalAmount(amt);
      setIdNumber(''); setIsSuccess(false); setError(null);
    }
  }, [enc?.id, isPromissoryModalOpen, promissoryCustomAmount]);

  if (!isPromissoryModalOpen || !enc) return null;

  const patientDisplayName = enc.patient.fullName || enc.patient.maskedName;
  const balance = principalAmount;

  const plan3 = calculateInstallmentPlan(balance, 3);
  const plan6 = calculateInstallmentPlan(balance, 6);
  const plan12 = calculateInstallmentPlan(balance, 12);
  const currentPlan = months === 3 ? plan3 : months === 6 ? plan6 : plan12;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (balance <= 0 || lock.current) return;
    if (!identity.valid) { setError(identity.error); return; }
    lock.current = true; setBusy(true); setError(null);
    try { await executePromissoryNote(enc.id, borrowerName, idType, identity.normalized, months, balance); setIsSuccess(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'The hospital could not confirm this payment plan.'); }
    finally { lock.current = false; setBusy(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={closePromissoryModal}
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Statutory Promissory Note Guarantee
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                  {enc.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                RA 9439 Anti-Hospital Detention · Patient: <strong className="text-slate-800">{patientDisplayName}</strong> ({enc.roomBed || enc.bedNumber})
              </p>
            </div>
          </div>
          <IconButton
            size="sm"
            variant="ghost"
            icon={X}
            onClick={closePromissoryModal}
            ariaLabel="Close modal"
          />
        </div>

        {/* Form Body */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-lg text-slate-900">
              Promissory Note Executed & Gate Pass Issued
            </h4>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Discharge clearance unlocked. Signed promissory record archived with billing and legal records.
            </p>
          </div>
        ) : balance <= 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-slate-900">
                Zero Outstanding Balance
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {patientDisplayName} has no outstanding patient due ({formatPeso(0)}). A statutory promissory note is not required.
              </p>
            </div>

            {eligibleEncounters.length > 0 && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left max-w-md mx-auto space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Select Patient with Outstanding Balance:
                </label>
                <Select
                  size="sm"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      selectEncounter(e.target.value);
                    }
                  }}
                  wrapperClassName="w-full"
                  className="w-full text-xs font-medium text-slate-800"
                >
                  <option value="" disabled>Choose an inpatient with balance ({eligibleEncounters.length} available)...</option>
                  {eligibleEncounters.map((el) => (
                    <option key={el.id} value={el.id}>
                      {el.patient.fullName || el.patient.maskedName} ({el.roomBed || el.bedNumber}) — {formatPeso(el.waterfall.netPatientDue)}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={closePromissoryModal}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm">
            {/* Statutory Compliance Banner */}
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-purple-900 text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>Republic Act No. 9439 Legal Undertaking</span>
              </div>
              <p className="text-xs text-purple-900/80 leading-relaxed font-normal">
                Under Philippine law, it is unlawful to detain patients who desire to leave hospital premises for nonpayment of hospital bills, provided a signed promissory note or guarantee is executed.
              </p>
            </div>

            {/* Inpatient Switcher (When opened generally without specific item context) */}
            {!promissoryItemContext && eligibleEncounters.length > 1 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800 block">Encounter / Inpatient Account</span>
                  <span>{patientDisplayName} · Bed {enc.roomBed || enc.bedNumber}</span>
                </div>
                <Select
                  size="sm"
                  value={enc.id}
                  onChange={(e) => selectEncounter(e.target.value)}
                  wrapperClassName="max-w-[240px]"
                  className="truncate text-xs font-medium text-slate-800"
                >
                  {eligibleEncounters.map((el) => (
                    <option key={el.id} value={el.id}>
                      {el.patient.fullName || el.patient.maskedName} ({el.roomBed || el.bedNumber}) — {formatPeso(el.waterfall.netPatientDue)}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Itemized Contested Liability Notice if launched from dispute item */}
            {promissoryItemContext?.description && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Itemized Contested Liability Promissory Undertaking</span>
                </div>
                <p>
                  Guarantee covers contested charge: <strong className="text-amber-950 font-semibold">{promissoryItemContext.description}</strong> ({formatPeso(balance)}).
                </p>
              </div>
            )}

            {/* Note Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Guarantor / Borrower Name
                </label>
                <input
                  type="text"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Government ID Type
                </label>
                <Select
                  size="md"
                  value={idType}
                  onChange={(e) => { setIdType(e.target.value as GovernmentIdType); setIdNumber(''); }}
                  wrapperClassName="w-full"
                  className="w-full text-sm text-slate-900"
                >
                  <option value="PHILSYS_NATIONAL_ID">PhilSys National ID</option>
                  <option value="UMID">Unified Multi-Purpose ID (UMID)</option>
                  <option value="DRIVERS_LICENSE">LTO Driver's License</option>
                  <option value="PASSPORT">Philippine Passport</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ID Reference Number
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  required
                  placeholder={idRule.placeholder}
                  autoComplete="off"
                  aria-invalid={idNumber.length > 0 && !identity.valid}
                />
                <p className="mt-2 text-xs text-slate-600">{idRule.hint}</p>
                {idNumber && !identity.valid && <p role="alert" className="mt-2 text-xs text-rose-700">{identity.error}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Financed Principal Amount
                </label>
                <div className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 text-sm font-mono font-bold">
                  {formatPeso(balance)}
                </div>
              </div>
            </div>

            {/* Repayment Amortization Schedule */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 text-sm block">
                    Repayment Schedule (0% Statutory Interest)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Pursuant to RA 9439 · Zero financing fees
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 text-sm tabular-nums block">
                    Principal: {formatPeso(balance)}
                  </span>
                  {promissoryCustomAmount !== null && (
                    <span className="text-[10px] text-purple-700 font-semibold">
                      Contested item amount
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {([
                  { term: 3 as const, plan: plan3 },
                  { term: 6 as const, plan: plan6 },
                  { term: 12 as const, plan: plan12 }
                ]).map(({ term, plan }) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setMonths(term)}
                    className={`py-2.5 px-3 rounded-lg border text-center transition-all ${
                      months === term
                        ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold ring-1 ring-purple-600 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-semibold">{term} Months</div>
                    <div className="text-xs text-purple-700 font-mono mt-0.5 tabular-nums font-semibold">
                      {formatPeso(plan.monthlyInstallment)}/mo
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-3.5 rounded-lg bg-white border border-slate-200 flex justify-between items-center text-sm shadow-xs">
                <div className="space-y-0.5">
                  <span className="text-slate-700 font-medium block">
                    Monthly installment ({months} payments):
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Total repayment: {formatPeso(currentPlan.totalRepayment)} · 0% interest
                  </span>
                </div>
                <span className="font-bold text-purple-900 font-mono tabular-nums text-base">
                  {formatPeso(currentPlan.monthlyInstallment)} / month
                </span>
              </div>
            </div>

            {/* Submit */}
            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                size="md"
                variant="secondary"
                onClick={closePromissoryModal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy || !identity.valid}
                size="md"
                variant="primary"
                icon={FileText}
                className="bg-purple-700 hover:bg-purple-800 focus-visible:ring-purple-500"
              >
                {busy ? 'Confirming with hospital…' : 'Execute Note & Issue Gate Pass'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
