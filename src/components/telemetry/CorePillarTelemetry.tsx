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
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2
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
      route: 'GUIDE',
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
      route: 'VERIFY',
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
      route: 'REWARD',
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
      route: 'REPORT',
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
      route: 'IMPROVE',
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
    <section className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800/80 px-4 py-2.5">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            Core 5-Pillar Operational Engine
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            GUIDE → VERIFY → REWARD → REPORT → IMPROVE
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-400 hidden sm:block">
          Active SLA Monitor • Live Real-Time Telemetry
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {pillars.map((p) => {
          const Icon = p.icon;
          const isSelected = activeRoute === p.route;

          return (
            <button
              key={p.key}
              onClick={() => setActiveRoute(p.route)}
              className={`p-2.5 rounded-lg border text-left transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-sky-500 shadow-xs ring-1 ring-sky-500/20'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              {/* Header: Title + Subtitle */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-sky-500/10 text-brand-blue dark:text-sky-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <span
                    className={`text-xs font-bold font-mono tracking-tight ${
                      isSelected
                        ? 'text-sky-700 dark:text-sky-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {p.title}
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                  {p.badge}
                </span>
              </div>

              {/* Main Metric Value */}
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <span className="text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                  {p.metric}
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center shrink-0">
                  <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                  {p.change}
                </span>
              </div>

              {/* Subtext description */}
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {p.subtext}
              </div>

              {/* Active Route indicator bar */}
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue dark:bg-sky-400" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
