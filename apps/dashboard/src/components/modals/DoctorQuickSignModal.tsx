import { ViewportOverlay } from '@/components/common/ViewportOverlay';
import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPeso } from '@/utils/formatters';
import {
  Stethoscope,
  X,
  FileCheck2,
  CheckCircle2,
  Send,
  AlertTriangle
} from '@/components/common/SolarIcons';
import { ConfirmButton, Button, IconButton } from '@/components/common';

export const DoctorQuickSignModal: React.FC = () => {
  const {
    isDoctorQuickSignOpen,
    closeDoctorQuickSign,
    selectedEncounter,
    applyAccreditedCeiling,
    signDoctorFee, nudgeDoctor, isSmsSending, activeRole
  } = useMedCore();

  const [signedSuccess, setSignedSuccess] = useState(false);

  if (!isDoctorQuickSignOpen) return null;

  const doctorName = selectedEncounter.attendingDoctor;
  const declared = selectedEncounter.doctorAgreedFee;
  const excess = selectedEncounter.doctorExcessPf;
  const ceiling = Math.max(0, declared - excess);
  const prc = selectedEncounter.attendingDoctorObj?.prcLicense || 'Not provided';
  const hmoName = selectedEncounter.hmo.hmoName || selectedEncounter.hmo.providerName;
  const isSigned = Boolean(selectedEncounter.doctorSignedAt);

  const handleApplyCeiling = async () => {
    await applyAccreditedCeiling(selectedEncounter.id);
    setSignedSuccess(true);
    setTimeout(() => {
      setSignedSuccess(false);
      closeDoctorQuickSign();
    }, 1200);
  };

  const handleSignDeclared = async () => {
    await signDoctorFee(selectedEncounter.id, declared);
    setSignedSuccess(true);
    setTimeout(() => {
      setSignedSuccess(false);
      closeDoctorQuickSign();
    }, 1200);
  };

  return (
    <ViewportOverlay
      className="flex items-center justify-center p-4" backdropClassName="bg-slate-900/40 backdrop-blur-xs" motion="rise" layer="modal"
      onDismiss={closeDoctorQuickSign}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Physician Professional Fee Clearance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                15-minute SLA statutory ceiling protection
              </p>
            </div>
          </div>
          <IconButton
            size="sm"
            variant="ghost"
            icon={X}
            onClick={closeDoctorQuickSign}
            ariaLabel="Close modal"
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-sm">
          {/* Doctor Profile Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-xs">
            <div>
              <div className="font-bold text-slate-900 text-base">
                {doctorName}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                License: <span className="font-mono font-medium text-slate-800">{prc}</span> • {selectedEncounter.attendingDoctorObj?.specialization || 'Attending physician'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-mono">
                {selectedEncounter.attendingDoctorObj?.contactNumber || 'Contact hospital billing'}
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                isSigned ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSigned ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  }`}
                />
                {isSigned ? '✓ Signed' : '● Pending Signature'}
              </span>
            </div>
          </div>

          {/* Fee Comparison Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Declared Fee
              </span>
              <span className="text-2xl font-bold font-mono text-slate-900 mt-1.5 block tabular-nums">
                {formatPeso(declared)}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Physician requested amount
              </span>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 shadow-xs">
              <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider block">
                {hmoName} Schedule Ceiling
              </span>
              <span className="text-2xl font-bold font-mono text-blue-700 mt-1.5 block tabular-nums">
                {formatPeso(ceiling)}
              </span>
              <span className="text-xs text-blue-700/80 mt-1 block">
                Contracted tariff limit
              </span>
            </div>
          </div>

          {/* Excess Fee Warning */}
          {excess > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold text-amber-900 block mb-0.5 text-sm">
                  Excess Fee Identified: {formatPeso(excess)}
                </span>
                <p className="text-amber-800">
                  Signing without capping charges the {formatPeso(excess)} difference directly to the patient out-of-pocket, risking discharge dispute and delay.
                </p>
              </div>
            </div>
          )}

          {signedSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-emerald-800 font-semibold">
              <CheckCircle2 className="w-7 h-7 mx-auto mb-1.5 text-emerald-600" />
              Doctor professional fee signed and tripartite ledger updated.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <ConfirmButton
                label={
                  <span className="flex items-center justify-center gap-2">
                    <FileCheck2 className="w-4 h-4" />
                    <span>Apply Schedule Ceiling ({formatPeso(ceiling)})</span>
                  </span>
                }
                modalTitle="Apply Doctor Schedule Ceiling Rate?"
                modalDescription={`This will cap ${selectedEncounter.attendingDoctor}'s professional fee at the accredited ceiling of ${formatPeso(ceiling)}, eliminating the ${formatPeso(excess)} excess patient charge.`}
                confirmLabel="Apply Ceiling"
                variant="primary"
                confirmVariant="primary"
                size="md"
                className="w-full py-3 px-4 rounded-lg font-semibold text-sm shadow-sm justify-center"
                contextInfo={[
                  { label: 'Attending Physician', value: selectedEncounter.attendingDoctor },
                  { label: 'Declared PF', value: formatPeso(declared) },
                  { label: 'Accredited Ceiling', value: formatPeso(ceiling) },
                  { label: 'Patient Excess Eliminated', value: formatPeso(excess) }
                ]}
                onConfirm={handleApplyCeiling}
                title="Cap fee to HMO accredited ceiling"
              />

              <div className="grid grid-cols-2 gap-3">
                <ConfirmButton
                  label={`Sign As Declared (${formatPeso(declared)})`}
                  modalTitle="Sign Doctor PF As Declared (Uncapped)?"
                  modalDescription={`Warning: Signing without capping will bill the ${formatPeso(excess)} difference directly to the patient as an out-of-pocket obligation, which may delay discharge settlement.`}
                  confirmLabel="Sign As Declared"
                  variant="warning"
                  confirmVariant="warning"
                  size="md"
                  className="!h-14 w-full px-3 rounded-lg font-semibold text-sm shadow-xs justify-center leading-5"
                  contextInfo={[
                    { label: 'Attending Physician', value: selectedEncounter.attendingDoctor },
                    { label: 'Declared PF', value: formatPeso(declared) },
                    { label: 'Direct Patient Liability', value: formatPeso(excess) }
                  ]}
                  onConfirm={handleSignDeclared}
                  title="Sign fee as declared, charging excess to patient"
                />
                <Button
                  size="md"
                  variant="secondary"
                  icon={Send}
                  disabled={isSmsSending(selectedEncounter.id) || selectedEncounter.stage !== 'DOCTOR_PF_PENDING' || !['BILLING_SPECIALIST', 'HOSPITAL_CFO'].includes(activeRole)}
                  onClick={() => void nudgeDoctor(selectedEncounter.id)} title="Prepare an SMS update for the doctor" className="!h-14 w-full px-3 justify-center !whitespace-normal leading-5"
                >
                  {isSmsSending(selectedEncounter.id) ? 'Preparing…' : 'Nudge Doctor (SMS)'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ViewportOverlay>
  );
};
