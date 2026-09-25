import React, { useState } from 'react';
import { useMedCore } from '../context/MedCoreContext';
import { formatPeso } from '../utils/formatters';
import {
  Compass,
  ShieldCheck,
  FileCheck2,
  AlertCircle,
  TrendingUp,
  UserPlus,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle2
} from 'lucide-react';

export const GuideView: React.FC = () => {
  const { encounters, selectEncounter, setActiveRoute } = useMedCore();
  const [selectedProcedure, setSelectedProcedure] = useState('LAP_CHOLE');

  const procedures = [
    {
      code: 'LAP_CHOLE',
      name: 'Laparoscopic Cholecystectomy (Gallbladder)',
      estGross: 135000,
      philhealthACR: 31000,
      avgHmoLoa: 85000,
      estPatientOop: 19000,
      avgLos: '2.5 Days'
    },
    {
      code: 'CS_SECTION',
      name: 'Primary Cesarean Section Delivery',
      estGross: 98000,
      philhealthACR: 28000,
      avgHmoLoa: 55000,
      estPatientOop: 15000,
      avgLos: '3.0 Days'
    },
    {
      code: 'KNEE_ARTHRO',
      name: 'Total Knee Arthroplasty (Unilateral)',
      estGross: 245000,
      philhealthACR: 45000,
      avgHmoLoa: 160000,
      estPatientOop: 40000,
      avgLos: '4.0 Days'
    }
  ];

  const currentProc =
    procedures.find((p) => p.code === selectedProcedure) || procedures[0];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-[#0B1120]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-brand-blue dark:text-sky-400 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              PILLAR 1: GUIDE — Pre-Admission Financial Orientation
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Replaces blind admission surprise bills with upfront statutory deduction estimates & RA 10932 compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>RA 10932 Deposit-Free: 100% Compliant</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Intake Pipeline Value</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            ₱18,420,000
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
            142 scheduled elective/urgent admissions
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Upfront E-Consent Rate</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            98.6%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Digital pre-admission financial disclosure signed
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Estimation Accuracy</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            ±4.2%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Actual discharge SOA vs pre-admission estimate
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Dispute Reduction</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            -78%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Discharge bill surprises virtually eliminated
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive Procedure Estimator + Active Scheduled Admissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estimator Engine */}
        <div className="lg:col-span-1 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-blue" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
              Pre-Admission Cost Estimator
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adjudicates PhilHealth Case Rates and contracted HMO allowances before patient touches a bed.
          </p>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Select Procedure Bundle:
            </label>
            <select
              value={selectedProcedure}
              onChange={(e) => setSelectedProcedure(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100"
            >
              {procedures.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Estimated Gross Total:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{formatPeso(currentProc.estGross)}</span>
            </div>
            <div className="flex justify-between text-sky-600 dark:text-sky-400">
              <span>Less: PhilHealth ACR:</span>
              <span>- {formatPeso(currentProc.philhealthACR)}</span>
            </div>
            <div className="flex justify-between text-sky-600 dark:text-sky-400">
              <span>Less: HMO Coverage:</span>
              <span>- {formatPeso(currentProc.avgHmoLoa)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-amber-600 dark:text-amber-400">
              <span>Estimated Out-of-Pocket:</span>
              <span>{formatPeso(currentProc.estPatientOop)}</span>
            </div>
          </div>

          <button
            onClick={() => setActiveRoute('COMMAND_CENTER')}
            className="w-full py-2.5 px-3 rounded-lg bg-brand-navy hover:bg-slate-800 dark:bg-brand-blue dark:hover:bg-sky-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <span>Send Financial Orientation SMS Link</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active Intake Encounters Table */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
              Active Pre-Admission Encounters
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              Live Intake Feed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
                <tr>
                  <th className="py-2 px-3">Patient / MRN</th>
                  <th className="py-2 px-2">Planned Room</th>
                  <th className="py-2 px-2">Payer</th>
                  <th className="py-2 px-2 text-right">Est. Out-of-Pocket</th>
                  <th className="py-2 px-2 text-center">E-Consent</th>
                  <th className="py-2 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {encounters.map((enc) => (
                  <tr key={enc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {enc.patient.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {enc.encounterNumber}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">
                      {enc.roomType}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">
                      {enc.hmo.hmoName}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatPeso(enc.waterfall.netPatientDue)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Signed
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          selectEncounter(enc.id);
                          setActiveRoute('COMMAND_CENTER');
                        }}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-medium text-brand-blue"
                      >
                        Open Case
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
