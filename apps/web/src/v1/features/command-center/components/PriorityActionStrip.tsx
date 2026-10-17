import { ArrowRight, Clock, CreditCard, FileCheck, ShieldAlert } from '@/v1/components/common/SolarIcons';
import { useMedCore } from '@/v1/context/MedCoreContext';
import { formatPhp } from '@/v1/utils/formatters';
import React from 'react';

export const PriorityActionStrip: React.FC = () => {
  const { encounters, setActiveFilter, setActiveRoute } = useMedCore();
  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING').length;
  const breachCount = encounters.filter((e) => e.slaStatus === 'BREACH').length;
  const hmoPending = encounters.filter(
    (e) => e.hmo.finalLoaStatus === 'PENDING_SUBMISSION' || e.hmo.finalLoaStatus === 'AWAITING_CODE',
  );

  const trappedCapital = encounters.reduce((sum, enc) => sum + (enc.remainingBalance ?? 0), 0);
  const actions = [
    {
      label: 'Discharge queue',
      value: breachCount
        ? `${breachCount} breached`
        : warningCount
          ? `${warningCount} at risk`
          : 'On schedule',
      icon: Clock,
      attention: breachCount > 0 || warningCount > 0,
      onClick: () => {
        setActiveFilter(breachCount ? 'BREACH' : warningCount ? 'WARNING' : 'ALL');
        setActiveRoute('DISCHARGE_CLEARANCE');
      },
    },
    {
      label: 'HMO authorizations',
      value: `${hmoPending.length} pending`,
      icon: ShieldAlert,
      attention: false,
      onClick: () => setActiveRoute('COVERAGE_APPROVALS'),
    },
    {
      label: 'Claims to review',
      value: 'Risk unavailable',
      icon: FileCheck,
      attention: false,
      onClick: () => setActiveRoute('CLAIMS_ESOA'),
    },
    {
      label: 'Patient receivables',
      value: formatPhp(trappedCapital),
      icon: CreditCard,
      attention: false,
      onClick: () => setActiveRoute('ENCOUNTERS_LEDGER'),
    },
  ];
  return (
    <section aria-label="Priority queues" className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {actions.map(({ label, value, icon: Icon, attention, onClick }) => (
        <button key={label} type="button" onClick={onClick} className="priority-action group text-left">
          <div className="flex items-center justify-between gap-2">
            <Icon className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <ArrowRight
              className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-teal-dark"
              aria-hidden="true"
            />
          </div>
          <div
            className={`mt-3 text-base font-semibold tabular-nums break-words ${attention ? 'text-amber-800' : 'text-slate-900'}`}
          >
            {value}
          </div>
          <div className="mt-1 text-xs text-slate-600">{label}</div>
        </button>
      ))}
    </section>
  );
};
