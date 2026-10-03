import React from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { NavRoute } from '@/types/navigation';
import {
  Home,
  DoorOpen,
  Layers,
  ShieldAlert,
  FileCheck2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarNavProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface NavItemConfig {
  route: NavRoute;
  label: string;
  icon: React.ElementType;
  badge?: number;
  isAttention?: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { activeRoute, setActiveRoute, encounters } = useMedCore();

  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING' || e.slaStatus === 'BREACH').length;
  const disputedCount = encounters.filter(
    (e) =>
      e.items.some(
        (i) =>
          (i.status === 'CONTESTED' || i.isDisputed) &&
          i.status !== 'SUPERVISORY_WAIVED' &&
          i.status !== 'WAIVED'
      ) ||
      e.disputes.some(
        (d) =>
          d.status !== 'SUPERVISOR_WAIVED' &&
          (d.status as string) !== 'SUPERVISORY_WAIVED' &&
          d.status !== 'HMO_RECONSIDERED' &&
          (d.status as string) !== 'RESOLVED' &&
          (d.status as string) !== 'WAIVED'
      )
  ).length;
  const hmoPendingCount = encounters.filter(
    (e) => e.hmo.finalLoaStatus === 'PENDING_SUBMISSION' || e.hmo.finalLoaStatus === 'AWAITING_CODE'
  ).length;

  const combinedApprovalsAndDisputesCount = hmoPendingCount + disputedCount;

  const dailyOperationsItems: NavItemConfig[] = [
    {
      route: 'COMMAND_CENTER',
      label: 'Home',
      icon: Home
    },
    {
      route: 'DISCHARGE_CLEARANCE',
      label: 'Discharge Clearance',
      icon: DoorOpen,
      badge: warningCount > 0 ? warningCount : undefined,
      isAttention: true
    },
    {
      route: 'ENCOUNTERS_LEDGER',
      label: 'Encounters & Ledgers',
      icon: Layers
    },
    {
      route: 'COVERAGE_APPROVALS',
      label: 'Approvals & Disputes',
      icon: ShieldAlert,
      badge: combinedApprovalsAndDisputesCount > 0 ? combinedApprovalsAndDisputesCount : undefined,
      isAttention: disputedCount > 0
    }
  ];

  const statutoryAndFinanceItems: NavItemConfig[] = [
    {
      route: 'CLAIMS_ESOA',
      label: 'Claims & eSOA XML',
      icon: FileCheck2
    },
    {
      route: 'RCM_ANALYTICS',
      label: 'RCM Analytics',
      icon: BarChart3
    }
  ];

  const governanceAndAdminItems: NavItemConfig[] = [
    {
      route: 'CONFIGURATION',
      label: 'Settings & Rules',
      icon: Settings
    }
  ];

  const renderNavGroup = (title: string, items: NavItemConfig[]) => (
    <div className="space-y-1">
      {!isCollapsed && (
        <div className="px-3 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          activeRoute === item.route ||
          (item.route === 'COVERAGE_APPROVALS' && activeRoute === 'DISPUTES_EXCEPTIONS');

        return (
          <button
            key={item.route}
            onClick={() => setActiveRoute(item.route)}
            title={isCollapsed ? item.label : undefined}
            className={`transition-all ${
              isCollapsed
                ? `h-10 w-10 mx-auto flex items-center justify-center rounded-lg ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                : `w-full h-10 flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
            }`}
          >
            <Icon
              className={`w-4.5 h-4.5 shrink-0 ${
                isActive ? 'text-white' : 'text-slate-500'
              }`}
            />

            {!isCollapsed && (
              <div className="flex-1 text-left flex items-center justify-between min-w-0">
                <span className="truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold tabular-nums ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : item.isAttention
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <aside
      className={`h-full bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-200 z-20 shrink-0 ${
        isCollapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Navigation Sections */}
      <div className="p-2 space-y-3 overflow-y-auto overscroll-contain">
        {renderNavGroup('Daily Operations', dailyOperationsItems)}
        {renderNavGroup('Statutory & Finance', statutoryAndFinanceItems)}
        {renderNavGroup('Governance & Admin', governanceAndAdminItems)}
      </div>

      {/* Clean Utility & Collapse Bar */}
      <div className="p-2 border-t border-slate-200 bg-white shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-[10px] font-medium text-slate-400">
              RA 9439 · RA 9994/10754
            </span>
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-1">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
