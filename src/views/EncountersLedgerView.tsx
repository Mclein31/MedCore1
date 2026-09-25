import React, { useState } from 'react';
import { useMedCore } from '../context/MedCoreContext';
import { TripartiteWorkbench } from '../components/ledger/TripartiteWorkbench';
import { formatPhp } from '../../utils/formatters';
import {
  Layers,
  Sparkles,
  Calculator,
  ShieldCheck,
  Search,
  ArrowRight,
  FileCheck2,
  CheckCircle2,
  Building,
  UserPlus
} from 'lucide-react';

export const EncountersLedgerView: React.FC = () => {
  const { encounters, selectedEncounterId, selectEncounter, openDossierDrawer } = useMedCore();
  const [activeTab, setActiveTab] = useState<'INPATIENT_LEDGER' | 'PRE_ADMISSION_INTAKE'>('INPATIENT_LEDGER');

  // Estimator State
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
    },
    {
      code: 'APPENDECTOMY',
      name: 'Open Appendectomy with Complicated Peritonitis',
      estGross: 110000,
      philhealthACR: 24000,
      avgHmoLoa: 68000,
      estPatientOop: 18000,
      avgLos: '3.5 Days'
    }
  ];

  const currentProc = procedures.find((p) => p.code === selectedProcedure) || procedures[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#070D18] overflow-hidden">
      {/* Top Navigation Tabs & Quick Patient Strip */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-blue dark:text-sky-400" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Encounters &amp; Ledgers
            </h2>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-mono">
            <button
              onClick={() => setActiveTab('INPATIENT_LEDGER')}
              className={`px-3 py-1 rounded-md transition-all font-semibold ${
                activeTab === 'INPATIENT_LEDGER'
                  ? 'bg-white dark:bg-slate-700 text-brand-blue dark:text-sky-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Active Inpatient Ledgers ({encounters.length})
            </button>
            <button
              onClick={() => setActiveTab('PRE_ADMISSION_INTAKE')}
              className={`px-3 py-1 rounded-md transition-all font-semibold ${
                activeTab === 'PRE_ADMISSION_INTAKE'
                  ? 'bg-white dark:bg-slate-700 text-brand-blue dark:text-sky-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Pre-Admission Intake &amp; Estimator
            </button>
          </div>
        </div>

        {/* Inpatient Patient Quick Selector */}
        {activeTab === 'INPATIENT_LEDGER' && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {encounters.map((enc) => {
              const isSelected = enc.id === selectedEncounterId;
              return (
                <button
                  key={enc.id}
                  onClick={() => selectEncounter(enc.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-500 text-brand-blue dark:text-sky-300 font-semibold shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <span>{enc.patient.maskedName}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({enc.roomBed.replace('Room ', '').replace('Bed ', '')})
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatPhp(enc.waterfall.netPatientDue)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Tab Viewport */}
      {activeTab === 'INPATIENT_LEDGER' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <TripartiteWorkbench />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header Description */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                Pre-Admission Cost Estimation &amp; Financial Orientation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upfront statutory deduction calculations, case rate lookups, and RA 10932 Anti-Deposit compliance.
              </p>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>RA 10932 Deposit-Free: 100% Compliant</span>
            </div>
          </div>

          {/* Intake Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Intake Pipeline Value</span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                ₱18,420,000
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">
                142 scheduled elective/urgent admissions
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Upfront E-Consent Rate</span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                98.6%
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Digital pre-admission disclosure signed
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
              <span className="text-[11px] font-mono text-slate-400 uppercase">Surprise Bill Reduction</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                -78%
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Discharge bill disputes virtually eliminated
              </span>
            </div>
          </div>

          {/* Interactive Procedure Estimator + Scheduled Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Estimator Engine */}
            <div className="lg:col-span-1 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-blue" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
                  Procedure Cost Estimator
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simulates PhilHealth All-Case-Rates (ACR) and contracted HMO allowances before ward entry.
              </p>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Select Procedure Bundle:
                </label>
                <select
                  value={selectedProcedure}
                  onChange={(e) => setSelectedProcedure(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 font-mono"
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
                  <span className="text-slate-500">Estimated Gross Charges:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatPhp(currentProc.estGross)}</span>
                </div>
                <div className="flex justify-between text-sky-600 dark:text-sky-400">
                  <span>Less: PhilHealth ACR:</span>
                  <span>- {formatPhp(currentProc.philhealthACR)}</span>
                </div>
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                  <span>Less: HMO Coverage:</span>
                  <span>- {formatPhp(currentProc.avgHmoLoa)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-rose-600 dark:text-rose-400">
                  <span>Est. Patient Responsibility:</span>
                  <span>{formatPhp(currentProc.estPatientOop)}</span>
                </div>
              </div>

              <button
                onClick={() => alert(`Pre-admission orientation link generated for ${currentProc.name}`)}
                className="w-full py-2.5 px-3 rounded-lg bg-brand-navy hover:bg-slate-800 dark:bg-brand-blue dark:hover:bg-sky-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <span>Send Upfront Orientation SMS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scheduled Intake Encounters */}
            <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
                  Active Pre-Admission Encounters
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  Live Intake Queue
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
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {encounters.map((enc) => (
                      <tr key={enc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {enc.patient.maskedName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {enc.encounterNumber}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">
                          {enc.roomCategory}
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">
                          {enc.hmo.providerName}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatPhp(enc.waterfall.netPatientDue)}
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
                              setActiveTab('INPATIENT_LEDGER');
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-medium text-brand-blue dark:text-sky-400"
                          >
                            Open Ledger
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
      )}
    </div>
  );
};
