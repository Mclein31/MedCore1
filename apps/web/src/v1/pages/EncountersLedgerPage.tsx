import { Button, SegmentedTabs, Select } from '@/v1/components/common';
import { UserPlus } from '@/v1/components/common/SolarIcons';
import { useMedCore } from '@/v1/context/MedCoreContext';
import { TripartiteWorkbench } from '@/v1/features/ledger/components/TripartiteWorkbench';
import { formatPhp } from '@/v1/utils/formatters';
import React, { useState } from 'react';

export const EncountersLedgerPage: React.FC = () => {
  const { encounters, selectEncounter, openAdmitPatientModal, notifyPatientSms, isSmsSending, activeRole } =
    useMedCore();
  const [activeTab, setActiveTab] = useState<'INPATIENT_LEDGER' | 'PRE_ADMISSION_INTAKE'>('INPATIENT_LEDGER');

  // Estimator State
  const [smsEncounterId, setSmsEncounterId] = useState('');
  const smsEncounter = encounters.find((enc) => enc.id === smsEncounterId);
  const [selectedProcedure, setSelectedProcedure] = useState('LAP_CHOLE');

  const tabs = [
    { id: 'INPATIENT_LEDGER' as const, label: `Active inpatients (${encounters.length})` },
    { id: 'PRE_ADMISSION_INTAKE' as const, label: 'Pre-admission cost estimator' },
  ];

  const procedures = [
    {
      code: 'LAP_CHOLE',
      name: 'Laparoscopic Cholecystectomy (Gallbladder)',
      estGross: 135000,
      philhealthACR: 31000,
      avgHmoLoa: 85000,
      estPatientOop: 19000,
      avgLos: '2.5 Days',
    },
    {
      code: 'CS_SECTION',
      name: 'Primary Cesarean Section Delivery',
      estGross: 98000,
      philhealthACR: 28000,
      avgHmoLoa: 55000,
      estPatientOop: 15000,
      avgLos: '3.0 Days',
    },
    {
      code: 'KNEE_ARTHRO',
      name: 'Total Knee Arthroplasty (Unilateral)',
      estGross: 245000,
      philhealthACR: 45000,
      avgHmoLoa: 160000,
      estPatientOop: 40000,
      avgLos: '4.0 Days',
    },
    {
      code: 'APPENDECTOMY',
      name: 'Open Appendectomy with Complicated Peritonitis',
      estGross: 110000,
      philhealthACR: 24000,
      avgHmoLoa: 68000,
      estPatientOop: 18000,
      avgLos: '3.5 Days',
    },
  ];

  const currentProc = procedures.find((p) => p.code === selectedProcedure) || procedures[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Top Navigation Tabs & Patient Strip */}
      <div className="border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
        <div className="min-w-0 max-w-full flex flex-wrap items-center gap-3">
          <h2 className="text-base font-bold text-slate-900">Encounters &amp; Ledgers</h2>

          {/* Mode Switcher Tabs */}
          <SegmentedTabs
            items={tabs}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id)}
            size="sm"
            ariaLabel="Encounters and Ledgers View Selector"
          />
        </div>

        {/* Right Header Action: Admit Inpatient */}
        <div className="flex items-center gap-3">
          <Button
            permission="encounter:admit"
            type="button"
            size="sm"
            variant="primary"
            icon={UserPlus}
            onClick={openAdmitPatientModal}
            title="Admit new patient and allocate hospital bed"
          >
            Admit Inpatient
          </Button>
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
              Upfront statutory deduction calculations, case rate lookups, and RA 10932 Anti-Deposit
              compliance.
            </p>
          </div>

          {/* Interactive Procedure Estimator + Scheduled Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Estimator Engine */}
            <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 space-y-5 bg-white shadow-2xs">
              <div>
                <h4 className="font-bold text-base text-slate-900">Procedure Cost Calculator</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  PhilHealth All-Case-Rates (ACR) and contracted HMO allowances before admission.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select clinical procedure bundle:
                </label>
                <Select
                  size="md"
                  value={selectedProcedure}
                  onChange={(e) => setSelectedProcedure(e.target.value)}
                  className="w-full font-semibold"
                  wrapperClassName="w-full"
                >
                  {procedures.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Estimated gross charges</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatPhp(currentProc.estGross)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Less: PhilHealth ACR</span>
                  <span className="font-mono text-emerald-700 font-semibold">
                    - {formatPhp(currentProc.philhealthACR)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Less: HMO coverage</span>
                  <span className="font-mono text-blue-700 font-semibold">
                    - {formatPhp(currentProc.avgHmoLoa)}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-bold text-base text-slate-900">
                  <span>Estimated Out-of-Pocket</span>
                  <span className="font-mono text-xl text-slate-900 tabular-nums">
                    {formatPhp(currentProc.estPatientOop)}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="intake-sms-recipient"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  SMS recipient
                </label>
                <select
                  id="intake-sms-recipient"
                  value={smsEncounterId}
                  onChange={(event) => setSmsEncounterId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Choose a registered patient encounter</option>
                  {encounters.map((enc) => (
                    <option key={enc.id} value={enc.id}>
                      {enc.patient.fullName || enc.patient.maskedName} · {enc.encounterNumber}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  The simulated reminder includes the admission reference and IDs to prepare.
                </p>
              </div>
              <Button
                fullWidth
                size="md"
                variant="primary"
                disabled={
                  !smsEncounter ||
                  isSmsSending(smsEncounter.id) ||
                  !['BILLING_SPECIALIST', 'HOSPITAL_CFO'].includes(activeRole)
                }
                onClick={() => {
                  if (smsEncounter) void notifyPatientSms(smsEncounter.id, 'INTAKE_ORIENTATION');
                }}
              >
                {smsEncounter && isSmsSending(smsEncounter.id)
                  ? 'Preparing…'
                  : 'Send Intake Orientation (SMS)'}
              </Button>
            </div>

            {/* Scheduled Intake Encounters */}
            <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 space-y-4 bg-white shadow-2xs">
              <div className="flex items-baseline justify-between">
                <h4 className="font-bold text-base text-slate-900">Scheduled Pre-Admission Encounters</h4>
                <span className="text-xs text-slate-500 font-medium">{encounters.length} scheduled</span>
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
                          <div className="text-xs text-slate-500 font-mono">{enc.encounterNumber}</div>
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
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800"
                            onClick={() => {
                              selectEncounter(enc.id);
                              setActiveTab('INPATIENT_LEDGER');
                            }}
                          >
                            Open ledger →
                          </Button>
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
