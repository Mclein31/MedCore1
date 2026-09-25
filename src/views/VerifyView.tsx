import React, { useState } from 'react';
import { useMedCore } from '../context/MedCoreContext';
import { formatPeso } from '../utils/formatters';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export const VerifyView: React.FC = () => {
  const { encounters, selectEncounter, setActiveRoute, approveHmoFinalLoa } = useMedCore();
  const [isVerifying, setIsVerifying] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');

  const triggerBatchVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
    }, 1500);
  };

  const hmoGateways = [
    { name: 'Maxicare Lifeline eLOA', status: 'ONLINE', latency: '420ms', successRate: '99.4%' },
    { name: 'Intellicare / Asalus Gateway', status: 'ONLINE', latency: '580ms', successRate: '98.8%' },
    { name: 'Medicard MediLink EDI', status: 'ONLINE', latency: '390ms', successRate: '99.1%' },
    { name: 'PhilCare Snap Portal API', status: 'ONLINE', latency: '610ms', successRate: '97.9%' },
    { name: 'PhilHealth PEC Webhook', status: 'ONLINE', latency: '820ms', successRate: '99.2%' }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-[#0B1120]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              PILLAR 2: VERIFY — Eligibility & eLOA Verification Engine
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time PhilHealth PEC validation and automated HMO electronic Letters of Authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerBatchVerification}
            disabled={isVerifying}
            className="px-3 py-1.5 rounded-lg bg-brand-navy hover:bg-slate-800 dark:bg-brand-blue dark:hover:bg-sky-600 text-white text-xs font-medium flex items-center gap-2 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Pinging Payer APIs...' : 'Batch Re-verify All Encounters'}</span>
          </button>
        </div>
      </div>

      {/* Gateway Telemetry Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono">
        {hmoGateways.map((g) => (
          <div
            key={g.name}
            className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {g.name}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
              <span>Latency: {g.latency}</span>
              <span className="text-emerald-600 dark:text-emerald-400">{g.successRate}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Encounters Verification Table */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
            Active Multi-Payer Adjudication Roster
          </h2>
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] ${
                filterStatus === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
              }`}
            >
              All Cases
            </button>
            <button
              onClick={() => setFilterStatus('VERIFIED')}
              className={`px-2.5 py-1 rounded text-[11px] ${
                filterStatus === 'VERIFIED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500/10 text-emerald-600'
              }`}
            >
              Verified (100%)
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-2.5 py-1 rounded text-[11px] ${
                filterStatus === 'PENDING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-500/10 text-amber-600'
              }`}
            >
              Pending LOA
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
              <tr>
                <th className="py-2 px-3">Patient / PIN</th>
                <th className="py-2 px-2">PhilHealth Status</th>
                <th className="py-2 px-2">HMO Carrier</th>
                <th className="py-2 px-2">LOA Number</th>
                <th className="py-2 px-2 text-right">Approved MBL</th>
                <th className="py-2 px-2 text-center">Status</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {encounters.map((enc) => (
                <tr key={enc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-3 font-sans">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {enc.patient.fullName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      PIN: {enc.patient.pin} • {enc.bedNumber}
                    </div>
                  </td>

                  <td className="py-3 px-2">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> PEC Valid
                    </span>
                    <div className="text-[10px] text-slate-400 font-sans truncate max-w-[140px]">
                      {enc.primaryDiagnosis || enc.philhealth.primaryDescription}
                    </div>
                  </td>

                  <td className="py-3 px-2 text-slate-800 dark:text-slate-200 font-medium">
                    {enc.hmo.hmoName}
                  </td>

                  <td className="py-3 px-2 text-slate-500 font-mono">
                    {enc.hmo.loaNumber}
                  </td>

                  <td className="py-3 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                    {formatPeso(enc.waterfall.hmoApprovedAmount)}
                  </td>

                  <td className="py-3 px-2 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {enc.hmo.loaStatus}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right space-x-1.5">
                    {enc.hmo.loaStatus !== 'APPROVED' ? (
                      <button
                        onClick={() => approveHmoFinalLoa(enc.id)}
                        className="px-2 py-1 rounded bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 text-brand-blue dark:text-sky-300 font-medium text-[11px]"
                      >
                        Approve eLOA
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          selectEncounter(enc.id);
                          setActiveRoute('COMMAND_CENTER');
                        }}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]"
                      >
                        View Ledger
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
