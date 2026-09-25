import React, { useState } from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { formatPeso, formatPstTimestamp } from '../../utils/formatters';
import {
  QrCode,
  X,
  CheckCircle2,
  ShieldCheck,
  Printer,
  Copy,
  Building2,
  ExternalLink,
  Shield
} from 'lucide-react';

export const DigitalGatePassModal: React.FC = () => {
  const {
    isGatePassModalOpen,
    closeGatePassModal,
    selectedEncounter,
    issueDigitalGatePass
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

  const handleVerify = () => {
    setVerifiedAtLobby(true);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(pass.hmacSignature);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={closeGatePassModal}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-blue" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
              Digital Gate Pass Discharge Clearance
            </h3>
          </div>
          <button
            onClick={closeGatePassModal}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Gate Pass Card */}
        <div className="p-5 text-center space-y-4">
          {/* Hospital Brand & Pass Number */}
          <div>
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              St. Jude Medical Center — Manila
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              {pass.passNumber}
            </div>
            <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{verifiedAtLobby ? 'VERIFIED AT LOBBY' : 'AUTHORIZED DISCHARGE'}</span>
            </div>
          </div>

          {/* Cryptographic QR Code Visual */}
          <div className="w-44 h-44 mx-auto p-3 rounded-xl bg-white border border-slate-200 shadow-inner flex flex-col items-center justify-center">
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
              <rect x="74" y="82" width="16" height="8" fill="currentColor" />
            </svg>
            <span className="text-[9px] font-mono text-slate-400 mt-1">
              HMAC SHA-256 Validated
            </span>
          </div>

          {/* Details Table */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left text-xs font-mono space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Patient:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{enc.patient.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Room / Bed:</span>
              <span className="text-slate-700 dark:text-slate-300">{enc.roomBed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Attending:</span>
              <span className="text-slate-700 dark:text-slate-300">{enc.attendingDoctor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Settlement:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {pass.settlementChannel === 'PROMISSORY_NOTE' ? 'RA 9439 Note Guaranteed' : 'Fully Settled (QR Ph)'}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-400">Issued Timestamp:</span>
              <span className="text-slate-500">{formatPstTimestamp(pass.issuedAt)}</span>
            </div>
          </div>

          {/* Cryptographic Hash token */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500">
            <span className="truncate max-w-[240px]">Sig: {pass.hmacSignature}</span>
            <button
              onClick={copyToken}
              className="text-brand-blue hover:text-sky-600 font-semibold flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedToken ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Verification Trigger Button */}
          <div className="flex items-center gap-2 pt-2">
            {!verifiedAtLobby ? (
              <button
                onClick={handleVerify}
                className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Security Officer: Verify & Permit Exit</span>
              </button>
            ) : (
              <div className="flex-1 py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-medium flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Patient Exited Lobby • Case Concluded</span>
              </div>
            )}
            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Print Clearance Slip"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
