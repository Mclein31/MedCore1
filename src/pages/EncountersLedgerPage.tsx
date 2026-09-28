import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { TripartiteWorkbench } from '@/features/ledger/components/TripartiteWorkbench';
import { formatPhp } from '@/utils/formatters';

export const EncountersLedgerPage: React.FC = () => {
  const { encounters, selectEncounter } = useMedCore();
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
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Top Navigation Tabs & Patient Strip */}
      <div className="border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 bg-white">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-bold text-slate-900">
            Encounters &amp; Ledgers
          </h2>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveTab('INPATIENT_LEDGER')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                activeTab === 'INPATIENT_LEDGER'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Active inpatients ({encounters.length})
            </button>
            <button
              onClick={() => setActiveTab('PRE_ADMISSION_INTAKE')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                activeTab === 'PRE_ADMISSION_INTAKE'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pre-admission cost estimator
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Viewport */}
      {activeTab === 'INPATIENT_LEDGER' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <TripartiteWorkbench />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Pre-Admission Cost Estimation &amp; Orientation
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Upfront statutory deduction calculations, case rate lookups, and RA 10932 Anti-Deposit compliance.
            </p>
          </div>

          {/* Interactive Procedure Estimator + Scheduled Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Estimator Engine */}
            <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 space-y-5 bg-white shadow-2xs">
              <div>
                <h4 className="font-bold text-base text-slate-900">
                  Procedure Cost Calculator
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  PhilHealth All-Case-Rates (ACR) and contracted HMO allowances before admission.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select clinical procedure bundle:
                </label>
                <select
                  value={selectedProcedure}
                  onChange={(e) => setSelectedProcedure(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900"
                >
                  {procedures.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Estimated gross charges</span>
                  <span className="font-mono font-semibold text-slate-900">{formatPhp(currentProc.estGross)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Less: PhilHealth ACR</span>
                  <span className="font-mono text-emerald-700 font-semibold">- {formatPhp(currentProc.philhealthACR)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Less: HMO coverage</span>
                  <span className="font-mono text-blue-700 font-semibold">- {formatPhp(currentProc.avgHmoLoa)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-bold text-base text-slate-900">
                  <span>Estimated Out-of-Pocket</span>
                  <span className="font-mono text-xl text-slate-900 tabular-nums">{formatPhp(currentProc.estPatientOop)}</span>
                </div>
              </div>

              <button
                onClick={() => alert(`Pre-admission orientation link generated for ${currentProc.name}`)}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-xs"
              >
                Send Upfront Orientation SMS
              </button>
            </div>

            {/* Scheduled Intake Encounters */}
            <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 space-y-4 bg-white shadow-2xs">
              <div className="flex items-baseline justify-between">
                <h4 className="font-bold text-base text-slate-900">
                  Scheduled Pre-Admission Encounters
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  {encounters.length} scheduled
                </span>
              </div>

              <div className="max-h-[380px] overflow-y-auto overflow-x-auto overscroll-contain rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-3 text-left">Patient &amp; MRN</th>
                      <th className="py-3 px-3 text-left">Planned Room</th>
                      <th className="py-3 px-3 text-left">Payer</th>
                      <th className="py-3 px-3 text-left">Est. Out-of-Pocket</th>
                      <th className="py-3 px-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {encounters.map((enc) => (
                      <tr key={enc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 text-left">
                          <div className="font-semibold text-slate-900">
                            {enc.patient.fullName || enc.patient.maskedName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {enc.encounterNumber}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-left text-slate-700 font-medium">
                          {enc.roomCategory.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-3 text-left text-slate-700 font-medium">
                          {enc.hmo.hmoName || enc.hmo.providerName}
                        </td>
                        <td className="py-3 px-3 text-left font-mono font-bold text-slate-900">
                          {formatPhp(enc.waterfall.netPatientDue)}
                        </td>
                        <td className="py-3 px-3 text-left">
                          <button
                            onClick={() => {
                              selectEncounter(enc.id);
                              setActiveTab('INPATIENT_LEDGER');
                            }}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 text-left"
                          >
                            Open ledger →
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

export const EncountersLedgerView = EncountersLedgerPage;
