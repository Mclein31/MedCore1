import React, { useState } from 'react';
import { Button, Select } from '@/components/common';

export const ConfigurationPage: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-slate-50/50 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            System Settings &amp; Rule Engines
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Enterprise configuration for HIS CDC replication, PhilHealth HITP credentials, statutory deduction policies, and discharge SLA thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="text-sm font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-lg border border-emerald-200">
              ✓ Configurations saved successfully.
            </div>
          )}
          <Button
            type="submit"
            form="config-form"
            size="md"
            variant="primary"
          >
            Save Configurations
          </Button>
        </div>
      </div>

      <form id="config-form" onSubmit={handleSave} className="space-y-6 w-full">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
          {/* 1. Database & HIS Adapters */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Hospital Information System (HIS) CDC Connector
              </h3>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Live CDC Active
              </span>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  HIS Core Engine Integration
                </label>
                <input
                  type="text"
                  defaultValue="BizBox v8 / Comlogik HIS Enterprise Bridge"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Database Read-Replica Connection URI
                </label>
                <input
                  type="text"
                  defaultValue="postgresql://medcore_ro:••••••••@his-replica.stjude.local:5432/bizbox_prod"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm font-mono"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sync Poll Interval
                  </label>
                  <input
                    type="text"
                    defaultValue="1,000 ms (Real-time Stream)"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Fallback Mode
                  </label>
                  <Select size="md" wrapperClassName="w-full" className="w-full">
                    <option>HL7 FHIR R4 Microservice</option>
                    <option>Direct SQL Replication</option>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* 2. PhilHealth HITP API & eClaims 3.0 Keys */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                PhilHealth HITP Gateway &amp; eClaims 3.0
              </h3>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Accredited Level 3
              </span>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    PhilHealth Accreditation Number (PAN)
                  </label>
                  <input
                    type="text"
                    defaultValue="PAN-NCR-HOSP-004921"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    HITP Client ID
                  </label>
                  <input
                    type="text"
                    defaultValue="HITP-MEDCORE-MANILA-092"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  eClaims 3.0 Web Service Secret Key
                </label>
                <input
                  type="password"
                  defaultValue="ph_hitp_sec_993847291823749"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    API Endpoint Environment
                  </label>
                  <Select size="md" wrapperClassName="w-full" className="w-full">
                    <option>Production (api.philhealth.gov.ph)</option>
                    <option>Staging Testbed Sandbox</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    XML Schema Validation
                  </label>
                  <Select size="md" wrapperClassName="w-full" className="w-full">
                    <option>Strict Circular 2023-0026 (Enforced)</option>
                    <option>Permissive Legacy Mode</option>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Statutory Governance & Deduction Rules */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Statutory Deduction Rules &amp; Precedence
              </h3>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Philippine Law
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-sm">
              <div className="p-4 flex items-center justify-between bg-slate-50/50">
                <div>
                  <div className="font-bold text-slate-900">
                    RA 9994 / RA 10754 (Senior Citizen &amp; PWD Waterfall)
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    12% VAT exemption on base + 20% statutory discount before PhilHealth and HMO.
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  ✓ Active (Strict)
                </span>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">
                    Republic Act No. 9439 (Anti-Hospital Detention Law)
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Prohibits patient detention for non-payment; mandates 0% interest promissory note execution.
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  ✓ Active (0% Int.)
                </span>
              </div>

              <div className="p-4 flex items-center justify-between bg-slate-50/50">
                <div>
                  <div className="font-bold text-slate-900">
                    PhilHealth Circular 2024-0037 (+50% ACR Increase)
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Applies the 50% rate expansion across inpatient medical, surgical, and ICU case rates.
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  ✓ Active (+50%)
                </span>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">
                    Single Period of Confinement (SPC) Repeal (Circ 2024-0021 &amp; 2025-0015)
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Permits repeat admissions within 90 days and unlocks retroactive claims back to Feb 2019.
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  ✓ Active Rule
                </span>
              </div>
            </div>
          </div>

          {/* 4. Operational SLA Timers */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Discharge Bottleneck SLA Thresholds
              </h3>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                SLA Guard Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Discharge Warning
                </label>
                <input
                  type="text"
                  defaultValue="25 minutes"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Discharge Breach
                </label>
                <input
                  type="text"
                  defaultValue="40 minutes (45m statutory)"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Doctor PF Timeout
                </label>
                <input
                  type="text"
                  defaultValue="15 minutes"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-500 leading-relaxed">
              When an attending physician does not sign off the professional fee within the 15-minute threshold, the automated prompt recommends applying the accredited HMO ceiling schedule to unblock patient discharge.
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            MedCore Enterprise Engine v3.2 · Philippine Hospital RCM Operating System
          </div>
          <Button
            type="submit"
            size="md"
            variant="primary"
          >
            Save All System Configurations
          </Button>
        </div>
      </form>
    </div>
  );
};

export const ConfigurationView = ConfigurationPage;
