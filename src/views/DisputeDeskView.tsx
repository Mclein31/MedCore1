import React from 'react';
import { useMedCore } from '../context/MedCoreContext';
import { formatPeso } from '../utils/formatters';
import {
  Scale,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  User,
  Shield,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export const DisputeDeskView: React.FC = () => {
  const {
    encounters,
    selectEncounter,
    supervisoryWaiveItem,
    openWhyDoIOweThis,
    setActiveRoute
  } = useMedCore();

  // Find all items that are disputed across all encounters
  const disputedItems: {
    encounterId: string;
    patientName: string;
    encounterNumber: string;
    bedNumber: string;
    hmoName: string;
    item: any;
  }[] = [];

  encounters.forEach((enc) => {
    enc.items.forEach((item) => {
      if (item.status === 'CONTESTED' || item.isDisputed) {
        disputedItems.push({
          encounterId: enc.id,
          patientName: enc.patient.fullName || enc.patient.maskedName,
          encounterNumber: enc.encounterNumber,
          bedNumber: enc.bedNumber || enc.roomBed,
          hmoName: enc.hmo.hmoName || enc.hmo.providerName,
          item
        });
      }
    });
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-[#0B1120]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              FINANCIAL DISPUTE RESOLUTION DESK
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Freezes contested line items to unblock patient discharge while maintaining statutory compliance under RA 9439.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-mono font-medium flex items-center gap-1.5">
          <Lock className="w-4 h-4" />
          <span>{disputedItems.length} Frozen Disputed Items</span>
        </div>
      </div>

      {/* Disputed Items Table */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
            Active Contested Charges & Hold Registry
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Supervisory Triage Protocol
          </span>
        </div>

        {disputedItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Zero Active Disputed Items
            </div>
            <p className="text-xs text-slate-500">
              All inpatient encounter charges are currently reconciled and accepted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
                <tr>
                  <th className="py-2 px-3">Patient / Case</th>
                  <th className="py-2 px-2">Item Description</th>
                  <th className="py-2 px-2">Category</th>
                  <th className="py-2 px-2 text-right">Contested Amount</th>
                  <th className="py-2 px-3">Reason / Context</th>
                  <th className="py-2 px-3 text-right">Supervisory Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {disputedItems.map(({ encounterId, patientName, encounterNumber, bedNumber, item }) => (
                  <tr key={`${encounterId}-${item.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3 font-sans">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {patientName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {encounterNumber} • {bedNumber}
                      </div>
                    </td>

                    <td className="py-3 px-2 font-sans">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {item.description}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.code}
                      </div>
                    </td>

                    <td className="py-3 px-2 text-slate-500 font-mono text-[11px]">
                      {item.category.replace(/_/g, ' ')}
                    </td>

                    <td className="py-3 px-2 text-right font-bold text-amber-600 dark:text-amber-400">
                      {formatPeso(item.patientOop)}
                    </td>

                    <td className="py-3 px-3 font-sans text-slate-600 dark:text-slate-300 max-w-[240px]">
                      <div className="text-xs">{item.disputeReason || item.exclusionReasonClause || 'Patient contested coverage disparity'}</div>
                    </td>

                    <td className="py-3 px-3 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          supervisoryWaiveItem(
                            encounterId,
                            item.id,
                            'Supervisory waiver issued to unblock discharge'
                          );
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium text-[11px]"
                      >
                        Supervisory Waive
                      </button>
                      <button
                        onClick={() => {
                          selectEncounter(encounterId);
                          setActiveRoute('COMMAND_CENTER');
                        }}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]"
                      >
                        Open Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
