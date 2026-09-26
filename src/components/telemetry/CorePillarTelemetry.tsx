import React from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { MOCK_CORE_PILLARS } from '../../data/mockData';
import { NavRoute } from '../../types/navigation';
import {
  Compass,
  ShieldCheck,
  Award,
  BarChart3,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';

export const CorePillarTelemetry: React.FC = () => {
  const { activeRoute, setActiveRoute } = useMedCore();

  const pillars: {
    key: 'guide' | 'verify' | 'reward' | 'report' | 'improve';
    route: NavRoute;
    title: string;
    subtitle: string;
    metric: string;
    subtext: string;
    badge: string;
    change: string;
    icon: React.ElementType;
    isPositiveChange: boolean;
  }[] = [
    {
      key: 'guide',
      route: 'ENCOUNTERS_LEDGER',
      title: MOCK_CORE_PILLARS.guide.title,
      subtitle: MOCK_CORE_PILLARS.guide.subtitle,
      metric: MOCK_CORE_PILLARS.guide.metricValue,
      subtext: MOCK_CORE_PILLARS.guide.metricDetail,
      badge: MOCK_CORE_PILLARS.guide.badgeText,
      change: MOCK_CORE_PILLARS.guide.changeText,
      icon: Compass,
      isPositiveChange: true
    },
    {
      key: 'verify',
      route: 'COVERAGE_APPROVALS',
      title: MOCK_CORE_PILLARS.verify.title,
      subtitle: MOCK_CORE_PILLARS.verify.subtitle,
      metric: MOCK_CORE_PILLARS.verify.metricValue,
      subtext: MOCK_CORE_PILLARS.verify.metricDetail,
      badge: MOCK_CORE_PILLARS.verify.badgeText,
      change: MOCK_CORE_PILLARS.verify.changeText,
      icon: ShieldCheck,
      isPositiveChange: true
    },
    {
      key: 'reward',
      route: 'DISCHARGE_CLEARANCE',
      title: MOCK_CORE_PILLARS.reward.title,
      subtitle: MOCK_CORE_PILLARS.reward.subtitle,
      metric: MOCK_CORE_PILLARS.reward.metricValue,
      subtext: MOCK_CORE_PILLARS.reward.metricDetail,
      badge: MOCK_CORE_PILLARS.reward.badgeText,
      change: MOCK_CORE_PILLARS.reward.changeText,
      icon: Award,
      isPositiveChange: true
    },
    {
      key: 'report',
      route: 'RCM_ANALYTICS',
      title: MOCK_CORE_PILLARS.report.title,
      subtitle: MOCK_CORE_PILLARS.report.subtitle,
      metric: MOCK_CORE_PILLARS.report.metricValue,
      subtext: MOCK_CORE_PILLARS.report.metricDetail,
      badge: MOCK_CORE_PILLARS.report.badgeText,
      change: MOCK_CORE_PILLARS.report.changeText,
      icon: BarChart3,
      isPositiveChange: true
    },
    {
      key: 'improve',
      route: 'CLAIMS_ESOA',
      title: MOCK_CORE_PILLARS.improve.title,
      subtitle: MOCK_CORE_PILLARS.improve.subtitle,
      metric: MOCK_CORE_PILLARS.improve.metricValue,
      subtext: MOCK_CORE_PILLARS.improve.metricDetail,
      badge: MOCK_CORE_PILLARS.improve.badgeText,
      change: MOCK_CORE_PILLARS.improve.changeText,
      icon: TrendingUp,
      isPositiveChange: true
    }
  ];

  return (
    <section className="bg-white border-b border-slate-200 px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Operational Pillars
          </span>
          <span className="text-xs text-slate-400">
            Guide → Verify → Reward → Report → Improve
          </span>
        </div>
        <div className="text-xs text-slate-500 hidden sm:block font-medium">
          Live Operational Telemetry
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {pillars.map((p) => {
          const Icon = p.icon;
          const isSelected = activeRoute === p.route;

          return (
            <button
              key={p.key}
              onClick={() => setActiveRoute(p.route)}
              className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              {/* Header: Title + Subtitle */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                    {p.title}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 shrink-0 font-medium">
                  {p.badge}
                </span>
              </div>

              {/* Main Metric Value */}
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <span className="text-xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
                  {p.metric}
                </span>
                <span className="text-xs text-emerald-700 flex items-center shrink-0 font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  {p.change}
                </span>
              </div>

              {/* Subtext description */}
              <div className="text-xs text-slate-500 truncate mt-1">
                {p.subtext}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
