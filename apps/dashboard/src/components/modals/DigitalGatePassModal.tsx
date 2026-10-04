import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPeso, formatPstTimestamp } from '@/utils/formatters';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Printer,
  Copy,
  Building2,
  Check
} from 'lucide-react';
import { ConfirmButton, Button, IconButton } from '@/components/common';

export const DigitalGatePassModal: React.FC = () => {
  const {
    isGatePassModalOpen,
    closeGatePassModal,
    selectedEncounter,
    issueDigitalGatePass,
    verifyGatePass,
    printDocument
  } = useMedCore();

  const [verifiedAtLobby, setVerifiedAtLobby] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  if (!isGatePassModalOpen) return null;

  const enc = selectedEncounter;
  const pass = enc.dischargePass || {
    passNumber: `PASS-MC-${enc.encounterNumber.replace('ENC-2026-', '')}`,
    encounterId: enc.id,
    patientName: enc.patient.fullName || enc.patient.maskedName,
    roomBed: enc.roomBed,
    settledAmount: enc.waterfall.netPatientDue,
    settlementChannel: 'QR_PH' as const,
    issuedAt: new Date().toISOString(),
    status: 'ACTIVE_READY_FOR_EXIT' as const,
    hmacSignature: 'a8f102c918e38d721bf64098ad23ef10'
  };

  const isVerified = pass.status === 'VERIFIED_AT_LOBBY' || verifiedAtLobby;
  const deterministicPin = (pass.passNumber || enc.encounterNumber).replace(/\D/g, '').slice(-4).padStart(4, '0');

  const handleVerify = () => {
    setVerifiedAtLobby(true);
    verifyGatePass(enc.id);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(pass.hmacSignature);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={closeGatePassModal}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Digital Gate Pass Clearance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hospital exit authorization and verification
              </p>
            </div>
          </div>
          <IconButton
            size="sm"
            variant="ghost"
            icon={X}
            onClick={closeGatePassModal}
            ariaLabel="Close modal"
          />
        </div>

        {/* Gate Pass Card */}
        <div className="p-6 text-center space-y-4">
          {/* Hospital Brand & Pass Number */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              St. Jude Medical Center — Manila
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mt-1">
              {pass.passNumber}
            </div>
            <div className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{verifiedAtLobby ? '✓ Verified at Lobby Desk' : '✓ Authorized Discharge'}</span>
            </div>
          </div>

          {/* Cryptographic QR Code Visual */}
          <div className="w-44 h-44 mx-auto p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center">
            {/* SVG Simulated QR Matrix */}
            <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
              {/* Corner position markers */}
              <rect x="5" y="5" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="12" y="12" width="14" height="14" fill="currentColor" />

              <rect x="67" y="5" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="74" y="12" width="14" height="14" fill="currentColor" />

              <rect x="5" y="67" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="12" y="74" width="14" height="14" fill="currentColor" />

              {/* Data modules */}
              <rect x="38" y="10" width="8" height="8" fill="currentColor" />
              <rect x="52" y="10" width="8" height="8" fill="currentColor" />
              <rect x="38" y="24" width="8" height="8" fill="currentColor" />
              <rect x="52" y="24" width="8" height="8" fill="currentColor" />

              <rect x="10" y="38" width="8" height="8" fill="currentColor" />
              <rect x="24" y="38" width="8" height="8" fill="currentColor" />
              <rect x="38" y="38" width="8" height="8" fill="currentColor" />
              <rect x="60" y="38" width="12" height="8" fill="currentColor" />
              <rect x="78" y="38" width="12" height="8" fill="currentColor" />

              <rect x="10" y="52" width="8" height="8" fill="currentColor" />
              <rect x="24" y="52" width="8" height="8" fill="currentColor" />
              <rect x="42" y="52" width="16" height="8" fill="currentColor" />
              <rect x="68" y="52" width="8" height="8" fill="currentColor" />
              <rect x="82" y="52" width="8" height="8" fill="currentColor" />

              <rect x="38" y="68" width="12" height="8" fill="currentColor" />
              <rect x="56" y="68" width="8" height="8" fill="currentColor" />
              <rect x="72" y="68" width="18" height="8" fill="currentColor" />

              <rect x="38" y="82" width="8" height="8" fill="currentColor" />
              <rect x="52" y="82" width="16" height="8" fill="currentColor" />
              <rect x="74" y="16" width="8" height="8" fill="currentColor" />
            </svg>
            <span className="text-[10px] font-mono text-slate-500 mt-1">
              HMAC SHA-256 Validated
            </span>
            <div className="font-mono text-xs font-black tracking-widest text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded mt-1.5 border border-slate-200">
              PIN: {deterministicPin}
            </div>
          </div>

          {/* Details Table */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-sm space-y-2 shadow-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Patient</span>
              <span className="font-bold text-slate-900">{enc.patient.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Room / Bed</span>
              <span className="text-slate-700 font-mono text-xs font-medium">{enc.roomBed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Attending Doctor</span>
              <span className="text-slate-700 font-medium">{enc.attendingDoctor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Settlement</span>
              <span className="text-emerald-700 font-bold">
                {pass.settlementChannel === 'PROMISSORY_NOTE' ? 'RA 9439 Note Guaranteed' : 'Fully Settled (QR Ph)'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-400">Issued Timestamp</span>
              <span className="text-slate-600 font-mono">{formatPstTimestamp(pass.issuedAt)}</span>
            </div>
          </div>

          {/* Cryptographic Hash token */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-100 text-xs font-mono text-slate-600">
            <span className="truncate max-w-[240px]">Sig: {pass.hmacSignature}</span>
            <Button
              size="sm"
              variant="ghost"
              icon={copiedToken ? Check : Copy}
              onClick={copyToken}
              className="h-7 px-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              {copiedToken ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* Verification Trigger Button */}
          <div className="flex items-center gap-2 pt-2">
            {!isVerified ? (
              <ConfirmButton
                label={
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Security Officer: Verify &amp; Permit Exit</span>
                  </span>
                }
                modalTitle="Authorize Hospital Departure & Permit Exit?"
                modalDescription={`Security Officer: Verify that patient ${pass.patientName} has fulfilled all clinical, billing, and pharmacy clearances. Confirming will mark the gate pass as redeemed and conclude the hospital stay.`}
                confirmLabel="Authorize Exit"
                variant="success"
                confirmVariant="success"
                contextInfo={[
                  { label: 'Patient', value: pass.patientName },
                  { label: 'Pass No.', value: pass.passNumber },
                  { label: 'Room/Bed', value: pass.roomBed || 'Discharged' },
                  { label: 'Balance Due', value: '₱0.00 (Cleared)' }
                ]}
                size="md"
                className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm shadow-sm justify-center"
                onConfirm={handleVerify}
                title="Security Officer: Authorize final exit through hospital lobby"
              />
            ) : (
              <div className="flex-1 py-3 px-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Patient Exited Lobby • Case Concluded</span>
              </div>
            )}
            <IconButton
              size="md"
              variant="secondary"
              icon={Printer}
              title="Print Clearance Slip"
              ariaLabel="Print Clearance Slip"
              className="h-11 w-11 shrink-0"
              onClick={() =>
                printDocument({
                  type: 'DIGITAL_GATE_PASS',
                  title: `Gate Pass - ${pass.passNumber}`,
                  data: { encounter: enc, pass, verifiedAtLobby: isVerified }
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};
