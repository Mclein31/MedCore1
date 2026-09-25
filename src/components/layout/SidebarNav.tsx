import React from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { NavRoute } from '../../types/navigation';
import {
  Activity,
  DoorOpen,
  Layers,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  BarChart3,
  Sliders,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';

interface SidebarNavProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { activeRoute, setActiveRoute, encounters, openPatientClarifyDrawer } = useMedCore();

  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING' || e.slaStatus === 'BREACH').length;
  const disputedCount = encounters.filter(
    (e) => e.items.some((i) => i.status === 'CONTESTED' || i.isDisputed) || e.disputes.length > 0
  ).length;
  const hmoPendingCount = encounters.filter(
    (e) => e.hmo.finalLoaStatus === 'PENDING_SUBMISSION' || e.hmo.finalLoaStatus === 'AWAITING_CODE'
  ).length;
  const claimsRiskCount = encounters.filter((e) => e.philhealth.rthRiskScore > 0.4).length;

  const navItems: {
    route: NavRoute;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: number;
    badgeVariant?: 'red' | 'amber' | 'blue';
  }[] = [
    {
      route: 'COMMAND_CENTER',
      label: 'Command Center',
      sublabel: 'Mission Control',
      icon: Activity
    },
    {
      route: 'DISCHARGE_CLEARANCE',
      label: 'Discharge Clearance',
      sublabel: '45-Min MGH Queue',
      icon: DoorOpen,
      badge: warningCount > 0 ? warningCount : undefined,
      badgeVariant: 'red'
    },
    {
      route: 'ENCOUNTERS_LEDGER',
      label: 'Encounters & Ledgers',
      sublabel: 'Running Bill & Intake',
      icon: Layers
    },
    {
      route: 'COVERAGE_APPROVALS',
      label: 'Coverage & Approvals',
      sublabel: 'PhilHealth & HMO eLOAs',
      icon: ShieldCheck,
      badge: hmoPendingCount > 0 ? hmoPendingCount : undefined,
      badgeVariant: 'amber'
    },
    {
      route: 'DISPUTES_EXCEPTIONS',
      label: 'Disputes & Exceptions',
      sublabel: 'Contested & Promissory',
      icon: AlertTriangle,
      badge: disputedCount > 0 ? disputedCount : undefined,
      badgeVariant: 'red'
    },
    {
      route: 'CLAIMS_ESOA',
      label: 'Claims & eSOA XML',
      sublabel: 'Pre-Flight Scrubber',
      icon: FileCheck2,
      badge: claimsRiskCount > 0 ? claimsRiskCount : undefined,
      badgeVariant: 'blue'
    },
    {
      route: 'RCM_ANALYTICS',
      label: 'RCM Analytics',
      sublabel: 'CFO Suite & Denial Pareto',
      icon: BarChart3
    },
    {
      route: 'CONFIGURATION',
      label: 'Configuration & Rules',
      sublabel: 'CDC, Keys & Policies',
      icon: Sliders
    }
  ];

  return (
    <aside
      className={`h-[calc(100vh-3.5rem)] bg-white dark:bg-[#0B1120] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-200 z-20 shrink-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top: Nav list */}
      <div className="p-3 space-y-1 overflow-y-auto">
        <div
          className={`px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono ${
            isCollapsed ? 'text-center' : ''
          }`}
        >
          {isCollapsed ? 'NAV' : 'OPERATIONAL WORKFLOW'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.route;

          return (
            <button
              key={item.route}
              onClick={() => setActiveRoute(item.route)}
              title={isCollapsed ? `${item.label} (${item.sublabel})` : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-xs font-medium transition-all group relative ${
                isActive
                  ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive
                    ? 'text-brand-blue dark:text-sky-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`}
              />

              {!isCollapsed && (
                <div className="flex-1 text-left flex items-center justify-between min-w-0">
                  <div className="truncate">
                    <div className="truncate font-semibold tracking-tight">{item.label}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">
                      {item.sublabel}
                    </div>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono border ${
                        item.badgeVariant === 'red'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : item.badgeVariant === 'amber'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Indicator line for active item */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-brand-blue" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom: Decoupled Patient Clarify preview trigger + Statutory Compliance + Collapse toggle */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
        {/* Patient Clarify Preview Drawer trigger (Decoupled PWA) */}
        <button
          onClick={() => openPatientClarifyDrawer()}
          title="Patient Clarify Preview (Mobile PWA)"
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                Patient Clarify
              </div>
              <div className="text-[10px] text-slate-400 truncate">Preview Mobile SOA</div>
            </div>
          )}
        </button>

        {!isCollapsed && (
          <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <Shield className="w-3.5 h-3.5" />
              <span>Statutory Compliance</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug font-mono">
              RA 9439 • RA 9994/10754
              <br />
              PhilHealth Circular 2024-0037
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-mono"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
