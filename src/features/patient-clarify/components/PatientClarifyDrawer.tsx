import React from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { PatientClarifyView } from './PatientClarifyView';
import { X, Smartphone, Copy, Check } from 'lucide-react';

export const PatientClarifyDrawer: React.FC = () => {
  const { isPatientClarifyDrawerOpen, closePatientClarifyDrawer, clarifyTokenEncounter } = useMedCore();
  const [copied, setCopied] = React.useState(false);

  if (!isPatientClarifyDrawerOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://medcore.stjude.ph/clarify/${clarifyTokenEncounter?.id || 'enc-8812'}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closePatientClarifyDrawer}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container (540px width) */}
      <div className="relative w-full max-w-[540px] bg-slate-100 border-l border-slate-200 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
        {/* Header bar */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Patient Clarify Mobile Preview
              </h3>
              <p className="text-xs text-slate-500">
                Patient SMS / messaging billing view
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
            <button
              onClick={closePatientClarifyDrawer}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body containing the mobile phone preview */}
        <div className="flex-1 overflow-y-auto overscroll-contain flex justify-center py-4">
          <PatientClarifyView />
        </div>
      </div>
    </div>
  );
};
