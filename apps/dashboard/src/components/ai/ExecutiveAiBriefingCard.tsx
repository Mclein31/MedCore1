import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { rcmAi, ExecutiveBriefingResponse } from '@/api/ai';
import { formatPhp } from '@/utils/formatters';
import {
  Sparkles,
  TrendingUp,
  Clock,
  AlertTriangle,
  Bed,
  DollarSign,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Building2,
  FileText,
  ShieldAlert
} from '@/components/common/SolarIcons';
import { Button, MarkdownNarrative } from '@/components/common';

export interface ExecutiveAiBriefingCardProps {
  className?: string;
  defaultCollapsed?: boolean;
}


export const ExecutiveAiBriefingCard: React.FC<ExecutiveAiBriefingCardProps> = ({
  className = '',
  defaultCollapsed = false
}) => {
  const { currentUser } = useMedCore();
  const pendingRequest = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<ExecutiveBriefingResponse | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const fetchBriefing = useCallback(async (forceRefresh: boolean = false) => {
    pendingRequest.current?.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;
    setLoading(true); setError(null); setBriefing(null);
    try {
      const data = await rcmAi.getExecutiveBriefing(forceRefresh, controller.signal);
      if (!controller.signal.aborted) setBriefing(data);
    } catch (err: any) {
      if (!controller.signal.aborted) {
        const message = err?.code === 'AI_NOT_CONFIGURED'
          ? 'AI insights are not configured for this environment. Contact your MedCore administrator.'
          : err?.status >= 500
            ? 'AI insights are temporarily unavailable. Please try again shortly.'
            : err?.message || 'Executive briefing generation failed.';
        setError(message);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [currentUser?.id, currentUser?.facilityId]);

  useEffect(() => {
    setBriefing(null);
    const timer = setTimeout(() => { void fetchBriefing(false); }, 0);
    return () => { clearTimeout(timer); pendingRequest.current?.abort(); };
  }, [fetchBriefing]);

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white overflow-hidden transition-colors ${className}`}
    >
      {/* Header Bar */}
      <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-teal flex items-center justify-center text-white shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Executive RCM &amp; Operational Telemetry Briefing
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-teal-soft text-brand-teal-dark border border-transparent uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5" />
                AI Synthesized
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              3-minute C-suite intelligence on discharge bottlenecks, reclaimed bed-hours, and trapped revenue.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {briefing?.generatedAt && (
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
              Updated: {new Date(briefing.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            isLoading={loading}
            onClick={() => void fetchBriefing(true)}
            className="text-xs border-purple-200 hover:bg-purple-100/50"
            title="Refresh Executive Telemetry"
          >
            Refresh
          </Button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-purple-100/50 transition-colors"
            aria-label={isCollapsed ? 'Expand briefing' : 'Collapse briefing'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !briefing && (
        <div className="p-6 space-y-4 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl" />
            ))}
          </div>
          <div className="h-24 bg-slate-100 rounded-xl" />
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && !loading && (
        <div role="status" aria-live="polite" className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Briefing Content Body */}
      {briefing && !isCollapsed && (
        <div className="p-5 space-y-5">
          {/* Top Scorecard Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Metric 1: Avg Discharge TAT */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Avg Discharge TAT</span>
                <Clock className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {Math.round(briefing.metricsSummary.averageDischargeTatMinutes)}m
                </span>
                <span className="text-[11px] text-slate-400">
                  / {briefing.metricsSummary.slaTargetMinutes}m SLA
                </span>
              </div>
              <div className="mt-1 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Within 3.0h standard</span>
              </div>
            </div>

            {/* Metric 2: Reclaimed Bed-Hours */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Reclaimed Bed-Hours</span>
                <Bed className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-emerald-700 tabular-nums">
                  {briefing.metricsSummary.reclaimedBedHoursLast24h === null ? 'Not measured' : `+${briefing.metricsSummary.reclaimedBedHoursLast24h}h`}
                </span>
                <span className="text-[11px] text-slate-400">last 24h</span>
              </div>
              <div className="mt-1 text-[11px] font-medium text-slate-500">
                Turnover velocity surge
              </div>
            </div>

            {/* Metric 3: Trapped Discharge Capital */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Trapped Capital</span>
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-amber-700 tabular-nums">
                  {formatPhp(briefing.metricsSummary.trappedCapitalPesos)}
                </span>
              </div>
              <div className="mt-1 text-[11px] font-medium text-slate-500 truncate">
                Pending settlement &amp; LOA
              </div>
            </div>

            {/* Metric 4: Critical Bottleneck */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Primary Bottleneck</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="mt-1.5">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-tight line-clamp-1">
                  {briefing.metricsSummary.criticalDepartmentBottleneck}
                </span>
              </div>
              <div className="mt-1 text-[11px] font-medium text-rose-600">
                Requires escalation focus
              </div>
            </div>
          </div>

          {/* Executive Narrative Section */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs border-b border-slate-200/80 pb-2">
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              <span>Operational &amp; Financial Narrative</span>
            </div>
            <MarkdownNarrative content={briefing.briefingMarkdown} />
          </div>

          {/* Strategic Recommendations Strip */}
          {briefing.topRecommendations && briefing.topRecommendations.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Top Strategic Recommendations</span>
                </h3>
                <span className="text-[11px] text-slate-500">Ordered by operational impact</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {briefing.topRecommendations.map((rec) => (
                  <div
                    key={rec.priority}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                          Priority {rec.priority} · {rec.department}
                        </span>
                        {rec.financialImpactPesos > 0 && (
                          <span className="text-[11px] font-mono font-bold text-emerald-700">
                            +{formatPhp(rec.financialImpactPesos)}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-700 leading-snug">
                        {rec.actionText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
