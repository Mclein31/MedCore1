import React from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { formatPhp } from '../../utils/formatters';
import {
  ShieldCheck,
  AlertTriangle,
  Building,
  CheckCircle,
  Clock,
  ArrowRight,
  Send,
  Zap,
  Lock,
  FileSpreadsheet
} from 'lucide-react';

export const DualOperationalPipelines: React.FC = () => {
  const {
    encounters,
    approveHmoFinalLoa,
    supervisoryWaiveItem,
    openPromissoryModal,
    selectEncounter,
    openWhyDoIOweThis,
    setActiveRoute
  } = useMedCore();

  // Active contested line items across all encounters
  const allDisputedItems = encounters.flatMap((enc) =>
    enc.items
      .filter((it) => it.status === 'CONTESTED' || it.isDisputed)
      .map((it) => ({
        ...it,
        encounterId: enc.id,
        patientName: enc.patient.maskedName,
        roomBed: enc.roomBed
      }))
  );

  return (
    <section className="h-64 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070D18]/50 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
      {/* Left Pipeline: Payer Coverage & Approval Watch */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-0 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-blue dark:text-sky-400" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Payer Coverage &amp; Approval Watch
            </h3>
          </div>
          <button
            onClick={() => setActiveRoute('COVERAGE_APPROVALS')}
            className="text-[11px] font-mono text-brand-blue dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>Full Gateway</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* HMO LOA & PhilHealth Status Stream */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {encounters.slice(0, 4).map((enc) => {
            const isApproved = enc.hmo.finalLoaStatus === 'APPROVED';

            return (
              <div
                key={enc.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                    <span>{enc.patient.maskedName}</span>
                    <span className="text-[10px] font-mono text-slate-400">({enc.roomBed})</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {enc.hmo.providerName}
                    </span>
                    <span>• LOA: {formatPhp(enc.hmo.approvedAmount)}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      • PhilHealth: {formatPhp(enc.philhealth.totalCaseRate)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                      isApproved
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {isApproved ? 'LOA APPROVED' : 'PENDING CODE'}
                  </span>

                  {!isApproved ? (
                    <button
                      onClick={() => approveHmoFinalLoa(enc.id)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-brand-blue text-white hover:bg-brand-blue/90 shadow-xs"
                    >
                      Fast-Approve
                    </button>
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Pipeline: Unresolved Billing Disputes & Delays */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-0 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Unresolved Disputes &amp; Delayed Lines
            </h3>
          </div>
          <button
            onClick={() => setActiveRoute('DISPUTES_EXCEPTIONS')}
            className="text-[11px] font-mono text-brand-blue dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>All Exceptions ({allDisputedItems.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Disputes List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {allDisputedItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
              <CheckCircle className="w-6 h-6 text-emerald-500/50 mb-1" />
              <span>Zero unresolved billing exceptions currently flagged</span>
            </div>
          ) : (
            allDisputedItems.map((item) => (
              <div
                key={`${item.encounterId}-${item.id}`}
                className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5 max-w-[65%]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.description}
                    </span>
                    <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                      {formatPhp(item.patientOop)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    {item.patientName} ({item.roomBed}) • {item.plainLanguageExplainer}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openWhyDoIOweThis(item)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50"
                  >
                    Why?
                  </button>
                  <button
                    onClick={() =>
                      supervisoryWaiveItem(
                        item.encounterId,
                        item.id,
                        'Supervisory courtesy discount applied to prevent discharge delay'
                      )
                    }
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                  >
                    Waive
                  </button>
                  <button
                    onClick={() => {
                      selectEncounter(item.encounterId);
                      openPromissoryModal();
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-600 text-white hover:bg-purple-700 shadow-xs"
                  >
                    RA 9439 Note
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
