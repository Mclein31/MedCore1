import React from 'react';
import { DischargePass } from '@/types/domain';
import { formatPeso, formatPstDateTime } from '../utils/billFormatters';
import { QrCode, CheckCircle2, ShieldCheck, Lock, Building, ArrowLeft } from 'lucide-react';

interface Props {
  gatePass?: DischargePass;
  patientName: string;
  roomBed: string;
  attendingDoctor?: string;
  onBack?: () => void;
}

export const PatientGatePassView: React.FC<Props> = ({
  gatePass,
  patientName,
  roomBed,
  attendingDoctor = 'Dr. Manuel Reyes (FPCP)',
  onBack
}) => {
  const passNum = gatePass?.passNumber || 'PASS-MC-88120';
  const hmac = gatePass?.hmacSignature || 'hmac_sha256_e901bca2_8812';
  const pin = '8492';
  const issuedAt = gatePass?.issuedAt || new Date().toISOString();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-md w-full mx-auto font-sans">
      {/* Top Banner */}
      <div className="bg-emerald-600 text-white p-5 text-center relative">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute left-4 top-5 p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-700/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h3 className="font-extrabold text-lg tracking-tight">
          CLEARED FOR EXIT
        </h3>
        <p className="text-xs text-emerald-100 font-medium">
          Official Digital Lobby Discharge Gate Pass
        </p>
      </div>

      {/* Pass Body */}
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs text-center">
        {/* QR Code Container */}
        <div className="flex flex-col items-center">
          <div className="p-3.5 sm:p-4 bg-white rounded-2xl border-2 border-slate-900 shadow-md">
            <div className="w-36 h-36 sm:w-44 sm:h-44 bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center relative">
              <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                <rect x="5" y="5" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
                <rect x="11" y="11" width="16" height="16" rx="2" />
                
                <rect x="67" y="5" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
                <rect x="73" y="11" width="16" height="16" rx="2" />
                
                <rect x="5" y="67" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
                <rect x="11" y="73" width="16" height="16" rx="2" />

                <rect x="42" y="10" width="8" height="8" />
                <rect x="54" y="16" width="6" height="6" />
                <rect x="42" y="30" width="16" height="6" />
                <rect x="10" y="44" width="8" height="8" />
                <rect x="22" y="44" width="8" height="8" />
                <rect x="16" y="54" width="6" height="6" />
                <rect x="70" y="42" width="10" height="10" />
                <rect x="84" y="54" width="8" height="8" />
                <rect x="42" y="70" width="10" height="10" />
                <rect x="56" y="78" width="8" height="8" />
                <rect x="72" y="72" width="16" height="16" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="p-1 bg-white rounded border border-slate-300 shadow-2xs text-[9px] font-black text-emerald-700 tracking-tighter">
                  PASS
                </div>
              </div>
            </div>
            <div className="mt-2 font-mono font-bold text-slate-900 text-sm tracking-wider">
              {passNum}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1.5">
            Present this scannable token to ground floor lobby security
          </span>
        </div>

        {/* Security Quick PIN */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Guard Check PIN</span>
            <span className="font-mono font-black text-xl text-slate-900 tracking-widest">{pin}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>● Active & Verified</span>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Patient:</span>
            <span className="font-bold text-slate-900">{patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Room / Bed:</span>
            <span className="font-mono font-semibold text-slate-800">{roomBed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Attending Physician:</span>
            <span className="font-semibold text-slate-800">{attendingDoctor}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Clearance Issued:</span>
            <span className="font-mono text-slate-700">{formatPstDateTime(issuedAt)}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono truncate">
            HMAC: {hmac}
          </div>
        </div>
      </div>
    </div>
  );
};
