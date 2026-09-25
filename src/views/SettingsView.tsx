import React, { useState } from 'react';
import {
  Settings,
  Database,
  ShieldCheck,
  CreditCard,
  Scale,
  Clock,
  Save,
  CheckCircle2,
  Lock,
  Server
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-[#0B1120]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              SYSTEM SETTINGS & INTEGRATION ENGINE
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure hospital database adapters, insurer gateways, statutory parameters, and SLA timers.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* 1. Database & HIS Adapters */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
            <Database className="w-4 h-4 text-brand-blue" />
            <span>1. Hospital Information System (HIS) Read-Replica Adapter</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-500 mb-1">HIS Core Engine</label>
              <input
                type="text"
                defaultValue="BizBox v8 / Comlogik HIS Bridge"
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                readOnly
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Database Replica Connection URI</label>
              <input
                type="text"
                defaultValue="postgresql://medcore_ro:••••••••@his-replica.stjude.local:5432/bizbox_prod"
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* 2. Statutory Governance & Deduction Rules */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
            <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>2. Statutory Governance & Republic Act Policies</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  Republic Act No. 9439 (Anti-Hospital Detention Law)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Prohibits patient detention for non-payment; mandates execution of promissory note guarantee.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20">
                STRICT ENFORCEMENT
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  PhilHealth Circular 2024-0037 (+50% ACR Increase)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Applies the 50% rate expansion across inpatient medical, surgical, and ICU case rates.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20">
                ACTIVE (+50%)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  Single Period of Confinement (SPC) Repeal (Circ 2024-0021 & 2025-0015)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Permits immediate repeat admissions within 90 days and unlocks retroactive claims back to Feb 20, 2019.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20">
                REPEALED & AUDITED
              </span>
            </div>
          </div>
        </div>

        {/* 3. Operational SLA Timers */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>3. Discharge Workflow SLA Alarm Thresholds</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-500 mb-1">Total Discharge Warning</label>
              <input
                type="text"
                defaultValue="25 Minutes"
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Total Discharge Breach</label>
              <input
                type="text"
                defaultValue="40 Minutes"
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Doctor PF Auto-Ceiling Nudge</label>
              <input
                type="text"
                defaultValue="15 Minutes"
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="py-2.5 px-5 rounded-lg bg-brand-navy hover:bg-slate-800 dark:bg-brand-blue dark:hover:bg-sky-600 text-white font-medium text-xs flex items-center gap-2 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save System Configurations</span>
          </button>
        </div>
      </form>
    </div>
  );
};
