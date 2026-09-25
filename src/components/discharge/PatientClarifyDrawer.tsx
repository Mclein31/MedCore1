import React from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { PatientClarifyView } from '../../views/PatientClarifyView';
import { X, Smartphone, Share2, Copy, Check } from 'lucide-react';

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
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container (540px width) */}
      <div className="relative w-full max-w-[540px] bg-slate-100 dark:bg-[#070D18] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
        {/* Header bar */}
        <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider">
                Patient Clarify™ Mobile Preview
              </h3>
              <p className="text-[10px] text-slate-400">Decoupled Patient PWA Web View (SMS / WhatsApp link)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
            <button
              onClick={closePatientClarifyDrawer}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body containing the mobile phone preview */}
        <div className="flex-1 overflow-y-auto flex justify-center py-4">
          <PatientClarifyView />
        </div>
      </div>
    </div>
  );
};
