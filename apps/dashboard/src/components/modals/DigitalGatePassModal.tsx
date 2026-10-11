import { ViewportOverlay } from '@/components/common/ViewportOverlay';
import GatePassQr from '../common/GatePassQr';
import {gatePassPayload} from '../../../../shared/gatePassPayload';
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
    verifyGatePass,
    printDocument
  } = useMedCore();

  const [copiedToken, setCopiedToken] = useState(false);
  const [copyError,setCopyError]=useState<string|null>(null);

  if (!isGatePassModalOpen) return null;

  const enc = selectedEncounter;
  const pass = enc.dischargePass;
  if (!pass) return <ViewportOverlay onDismiss={closeGatePassModal}><div className="bg-white p-6 rounded-2xl" role="dialog" aria-modal="true"><p>Discharge clearance is still being processed.</p><Button onClick={closeGatePassModal}>Close</Button></div></ViewportOverlay>;
  const isVerified = pass.status === 'VERIFIED_AT_LOBBY';
  const deterministicPin = pass.exitPin || 'Unavailable';
  const qrPayload=gatePassPayload(pass);
  const active=pass.status==='ACTIVE_READY_FOR_EXIT';
  const handleVerify = async () => { await verifyGatePass(enc.id); };

  const copyToken = async () => {
    setCopyError(null);
    try {await navigator.clipboard.writeText(pass.hmacSignature);setCopiedToken(true);setTimeout(()=>setCopiedToken(false),2000);}
    catch {setCopyError('Clipboard access failed.');}
  };

  return (
    <ViewportOverlay
      className="flex items-center justify-center p-4" backdropClassName="bg-slate-900/40 backdrop-blur-xs" motion="rise" layer="modal"
      onDismiss={closeGatePassModal}
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
              <span>{isVerified ? '✓ Verified at Lobby Desk' : '✓ Authorized Discharge'}</span>
            </div>
          </div>

          {active&&qrPayload?<div className="space-y-3"><GatePassQr payload={qrPayload}/><div className="text-center"><p className="text-xs text-slate-500">Exit PIN</p><p className="mt-1 font-mono text-3xl font-bold tracking-[0.25em] text-slate-900">{deterministicPin}</p></div><p className="text-xs text-slate-500">Show the QR and private PIN to lobby staff. The hospital verifies this pass online.</p></div>:<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">{isVerified?'Exit already verified. This pass cannot be reused.':'No active QR is available. Refresh the hospital pass.'}</div>}

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
              onClick={()=>void copyToken()}
              className="h-7 px-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              {copyError|| (copiedToken ? 'Copied' : 'Copy')}
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
    </ViewportOverlay>
  );
};
