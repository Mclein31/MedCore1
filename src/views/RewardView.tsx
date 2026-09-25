import React from 'react';
import { useMedCore } from '../context/MedCoreContext';
import { formatPeso, formatPstTimestamp } from '../utils/formatters';
import {
  Award,
  QrCode,
  CreditCard,
  FileText,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Building2,
  ArrowRight
} from 'lucide-react';

export const RewardView: React.FC = () => {
  const { encounters, selectEncounter, openPromissoryModal, setActiveRoute } = useMedCore();

  const clearedEncounters = encounters.filter(
    (e) => e.stage === 'CLEARED_GATE_PASS' || Boolean(e.dischargePass)
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-[#0B1120]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              PILLAR 3: REWARD — Settlement & Discharge Throughput Engine
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Accelerates discharge settlement at point-of-sale via QR Ph interoperability & RA 9439 structured promissory notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>91.8% Same-Day Collection</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Settled Today</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            ₱4,215,800
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
            28 discharges processed
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">QR Ph National Interop</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            74.5%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Instant BSP-regulated digital payments
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">RA 9439 Promissory Notes</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            ₱124,500
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            2 statutory notes executed (100% legal clearance)
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Bed-Hours Saved Today</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            342 Hours
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Fast bed turnover for incoming admissions
          </span>
        </div>
      </div>

      {/* Discharge & Settlement Audit Feed */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
            Settled Discharges & Active Gate Passes
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Real-Time Cashier & Gate Pass Stream
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
              <tr>
                <th className="py-2 px-3">Gate Pass #</th>
                <th className="py-2 px-2">Patient Name</th>
                <th className="py-2 px-2">Room / Bed</th>
                <th className="py-2 px-2 text-right">Settled Amount</th>
                <th className="py-2 px-2 text-center">Settlement Channel</th>
                <th className="py-2 px-2">Clearance Time</th>
                <th className="py-2 px-3 text-right">Gate Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {clearedEncounters.map((enc) => {
                const pass = enc.dischargePass;
                return (
                  <tr key={enc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3 font-bold text-brand-navy dark:text-sky-300">
                      {pass?.passNumber || `PASS-MC-${enc.encounterNumber.replace('ENC-2026-', '')}`}
                    </td>
                    <td className="py-3 px-2 font-sans font-medium text-slate-900 dark:text-slate-100">
                      {enc.patient.fullName}
                    </td>
                    <td className="py-3 px-2 text-slate-500">
                      {enc.bedNumber} ({enc.roomType})
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatPeso(pass?.settledAmount ?? enc.waterfall.netPatientDue)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {pass?.settlementChannel ?? 'QR_PH Interop'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-400 text-[11px]">
                      {formatPstTimestamp(pass?.issuedAt ?? new Date().toISOString())}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        {pass?.status === 'VERIFIED_AT_LOBBY' ? 'Exited Lobby' : 'Pass Issued'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
