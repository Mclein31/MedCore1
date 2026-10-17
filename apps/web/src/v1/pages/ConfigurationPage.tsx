import { defaultApiClient } from '@/v1/api';
import { Button, Select } from '@/v1/components/common';
import { useMedCore } from '@/v1/context/MedCoreContext';
import React, { useEffect, useState } from 'react';

interface FacilitySettings {
  id: string;
  code: string;
  name: string;
  philhealthPan: string;
  slaWarningMinutes: number;
  slaBreachMinutes: number;
  doctorPfTimeoutMinutes: number;
}

export const ConfigurationPage: React.FC = () => {
  const { currentUser } = useMedCore();
  const canEdit =
    currentUser?.permissions?.includes('admin:settings') || currentUser?.role === 'HOSPITAL_CFO';

  const [facilityName, setFacilityName] = useState('St. Jude Medical Center');
  const [philhealthPan, setPhilhealthPan] = useState('PAN-NCR-HOSP-004921');
  const [slaWarningMinutes, setSlaWarningMinutes] = useState(25);
  const [slaBreachMinutes, setSlaBreachMinutes] = useState(40);
  const [doctorPfTimeoutMinutes, setDoctorPfTimeoutMinutes] = useState(15);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    defaultApiClient
      .request<{ facility?: FacilitySettings }>('/facility')
      .then((res) => {
        if (!active || !res?.facility) return;
        setFacilityName(res.facility.name || 'St. Jude Medical Center');
        setPhilhealthPan(res.facility.philhealthPan || 'PAN-NCR-HOSP-004921');
        setSlaWarningMinutes(res.facility.slaWarningMinutes ?? 25);
        setSlaBreachMinutes(res.facility.slaBreachMinutes ?? 40);
        setDoctorPfTimeoutMinutes(res.facility.doctorPfTimeoutMinutes ?? 15);
      })
      .catch(() => {
        // Keep defaults if user lacks admin:settings
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      await defaultApiClient.request('/facility', {
        method: 'PUT',
        body: JSON.stringify({
          name: facilityName,
          slaWarningMinutes: Number(slaWarningMinutes),
          slaBreachMinutes: Number(slaBreachMinutes),
          doctorPfTimeoutMinutes: Number(doctorPfTimeoutMinutes),
        }),
      });
      setSaveMessage('Hospital SLA thresholds and configuration saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-slate-50/50 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings &amp; Rule Engines</h1>
          <p className="text-sm text-slate-600 mt-1">
            Enterprise configuration for HIS CDC replication, PhilHealth HITP credentials, statutory deduction
            policies, and discharge SLA thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            disabled={!canEdit || isSaving}
            onClick={() => void handleSave()}
            form="config-form"
            size="md"
            variant="primary"
          >
            {isSaving ? 'Saving…' : 'Save Configurations'}
          </Button>
        </div>
      </div>

      {saveMessage && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 font-medium"
        >
          {saveMessage}
        </div>
      )}
      {saveError && (
        <div
          role="alert"
          className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 font-medium"
        >
          {saveError}
        </div>
      )}

      <fieldset disabled={!canEdit || isSaving} id="config-form" className="space-y-6 w-full">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
          {/* 1. Database & HIS Adapters */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
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
                  Hospital Facility Name
                </label>
                <input
                  type="text"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-medium"
                />
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fallback Mode</label>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
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
                    value={philhealthPan}
                    onChange={(e) => setPhilhealthPan(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">HITP Client ID</label>
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
                  defaultValue="••••••••••••••••••••"
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 text-sm font-mono focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-base text-slate-900">
                Statutory Deduction Rules &amp; Precedence
              </h3>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Philippine Law
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-sm">
              <div className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 bg-slate-50/50">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900">
                    RA 9994 / RA 10754 (Senior Citizen &amp; PWD Waterfall)
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    12% VAT exemption on base + 20% statutory discount before PhilHealth and HMO.
                  </div>
                </div>
                <span className="shrink-0 self-start whitespace-nowrap text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 sm:self-center">
                  ✓ Active (Strict)
                </span>
              </div>

              <div className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900">
                    Republic Act No. 9439 (Anti-Hospital Detention Law)
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Prohibits patient detention for non-payment; mandates 0% interest promissory note
                    execution.
                  </div>
                </div>
                <span className="shrink-0 self-start whitespace-nowrap text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 sm:self-center">
                  ✓ Active (0% Int.)
                </span>
              </div>

              <div className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 bg-slate-50/50">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900">
                    PhilHealth Circular 2024-0037 (+50% ACR Increase)
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Applies the 50% rate expansion across inpatient medical, surgical, and ICU case rates.
                  </div>
                </div>
                <span className="shrink-0 self-start whitespace-nowrap text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 sm:self-center">
                  ✓ Active (+50%)
                </span>
              </div>

              <div className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900">
                    Single Period of Confinement (SPC) Repeal (Circ 2024-0021 &amp; 2025-0015)
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Permits repeat admissions within 90 days and unlocks retroactive claims back to Feb 2019.
                  </div>
                </div>
                <span className="shrink-0 self-start whitespace-nowrap text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 sm:self-center">
                  ✓ Active Rule
                </span>
              </div>
            </div>
          </div>

          {/* 4. Operational SLA Timers */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-base text-slate-900">Discharge Bottleneck SLA Thresholds</h3>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                SLA Guard Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Discharge Warning (mins)
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={slaWarningMinutes}
                  onChange={(e) => setSlaWarningMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Discharge Breach (mins)
                </label>
                <input
                  type="number"
                  min={10}
                  max={480}
                  value={slaBreachMinutes}
                  onChange={(e) => setSlaBreachMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Doctor PF Timeout (mins)
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={doctorPfTimeoutMinutes}
                  onChange={(e) => setDoctorPfTimeoutMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-500 leading-relaxed">
              When an attending physician does not sign off the professional fee within the{' '}
              {doctorPfTimeoutMinutes}-minute threshold, the automated prompt recommends applying the
              accredited HMO ceiling schedule to unblock patient discharge.
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            MedCore Enterprise Engine v3.2 · Philippine Hospital RCM Operating System
          </div>
          <Button
            type="button"
            disabled={!canEdit || isSaving}
            onClick={() => void handleSave()}
            size="md"
            variant="primary"
          >
            {isSaving ? 'Saving…' : 'Save All System Configurations'}
          </Button>
        </div>
      </fieldset>
      <p className="text-xs text-slate-500">
        <a
          href="https://solar-icons.vercel.app/docs/v2/community/license"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Solar icons by 480 Design · CC BY 4.0
        </a>
      </p>
    </div>
  );
};

export const ConfigurationView = ConfigurationPage;
