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
  Settings,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Sparkles
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
  const { activeRoute, setActiveRoute, encounters, openPatientClarifyDrawer } = useMedCore();

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

  const operationalItems: NavItemConfig[] = [
    {
      route: 'COMMAND_CENTER',
      label: 'Command Center',
      icon: Activity
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
      label: 'Coverage & Approvals',
      icon: ShieldCheck,
      badge: hmoPendingCount > 0 ? hmoPendingCount : undefined
    }
  ];

  const statutoryItems: NavItemConfig[] = [
    {
      route: 'DISPUTES_EXCEPTIONS',
      label: 'Disputes & Exceptions',
      icon: AlertTriangle,
      badge: disputedCount > 0 ? disputedCount : undefined,
      isAttention: true
    },
    {
      route: 'CLAIMS_ESOA',
      label: 'Claims & eSOA XML',
      icon: FileCheck2
    },
    {
      route: 'RCM_ANALYTICS',
      label: 'RCM Analytics',
      icon: BarChart3
    },
    {
      route: 'CONFIGURATION',
      label: 'Settings & Rules',
      icon: Settings
    }
  ];

  const renderNavGroup = (title: string, items: NavItemConfig[]) => (
    <div className="space-y-1">
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeRoute === item.route;

        return (
          <button
            key={item.route}
            onClick={() => setActiveRoute(item.route)}
            title={isCollapsed ? item.label : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              isActive
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 ${
                isActive ? 'text-white' : 'text-slate-500'
              }`}
            />

            {!isCollapsed && (
              <div className="flex-1 text-left flex items-center justify-between min-w-0">
                <span className="truncate text-sm">{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold tabular-nums ${
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
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Navigation Sections */}
      <div className="p-3 space-y-4 overflow-y-auto overscroll-contain">
        {renderNavGroup('Operations & Workspaces', operationalItems)}
        {renderNavGroup('Statutory & Compliance', statutoryItems)}
      </div>

      {/* Footer Utility Card & Collapse Bar (Inspo 3 style) */}
      <div className="p-3 border-t border-slate-200 space-y-3 bg-white">
        {!isCollapsed ? (
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50/70 to-emerald-50/70 border border-blue-100">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-900">
                Patient Clarify
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded ml-auto">
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight mb-2.5">
              Instant mobile SOA preview &amp; plain-language billing explanation.
            </p>
            <button
              onClick={() => openPatientClarifyDrawer()}
              className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Launch Mobile Preview</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => openPatientClarifyDrawer()}
            title="Launch Patient Clarify Mobile Preview"
            className="w-full flex items-center justify-center p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            <Smartphone className="w-5 h-5" />
          </button>
        )}

        {/* Legal citations & collapse toggle */}
        <div className="pt-1 flex items-center justify-between">
          {!isCollapsed ? (
            <div className="text-[10px] font-medium text-slate-400">
              RA 9439 · RA 9994/10754
            </div>
          ) : null}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${
              isCollapsed ? 'w-full flex justify-center' : 'ml-auto'
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
