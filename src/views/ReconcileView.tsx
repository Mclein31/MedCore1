import React from 'react';
import { useMedCore } from '../context/MedCoreContext';
import { TripartiteWorkbench } from '../components/ledger/TripartiteWorkbench';
import { formatPeso } from '../utils/formatters';
import { Calculator, User, Bed, Shield } from 'lucide-react';

export const ReconcileView: React.FC = () => {
  const { encounters, selectedEncounterId, selectEncounter } = useMedCore();

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0B1120] overflow-hidden">
      {/* Top Patient Selector Bar */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider shrink-0">
          <Calculator className="w-3.5 h-3.5 text-brand-blue" />
          <span>Active Patient Ledgers:</span>
        </div>

        {encounters.map((enc) => {
          const isSelected = enc.id === selectedEncounterId;
          return (
            <button
              key={enc.id}
              onClick={() => selectEncounter(enc.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-2 border ${
                isSelected
                  ? 'bg-sky-500/10 border-sky-500 text-sky-900 dark:text-sky-300 font-semibold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>{enc.patient.fullName}</span>
              <span className="text-[10px] font-mono text-slate-400">
                ({enc.bedNumber})
              </span>
              <span className="text-[11px] font-mono font-bold">
                {formatPeso(enc.waterfall.netPatientDue)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Full-Width Reconciled Ledger Workbench */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TripartiteWorkbench />
      </div>
    </div>
  );
};
