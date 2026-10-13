import { ViewportOverlay } from '@/components/common/ViewportOverlay';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { claimsAi, ClaimsAuditResult } from '@/api/ai';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Cpu,
  FileText,
  Calculator,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from '@/components/common/SolarIcons';
import { Button } from '@/components/common';

export interface ClaimsPreflightScrubberModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounter: any;
  onAuditComplete?: (result: ClaimsAuditResult) => void;
}

export const ClaimsPreflightScrubberModal: React.FC<ClaimsPreflightScrubberModalProps> = ({
  isOpen,
  onClose,
  encounter,
  onAuditComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceEscalation, setForceEscalation] = useState(false);
  const [auditResult, setAuditResult] = useState<ClaimsAuditResult | null>(null);
  const [copiedAddendum, setCopiedAddendum] = useState(false);
  const [copiedDossier, setCopiedDossier] = useState(false);
  const [clearedForGateway, setClearedForGateway] = useState(false);
  const [showRiskExplanation, setShowRiskExplanation] = useState(false);

  const pendingRequest = useRef<AbortController | null>(null);
  const completed = useRef(onAuditComplete);
  completed.current = onAuditComplete;
  const runAudit = useCallback(async () => {
    if (!encounter?.id) return;
    pendingRequest.current?.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;
    setAuditResult(null); setLoading(true); setError(null); setClearedForGateway(false);
    setCopiedAddendum(false); setCopiedDossier(false);
    try {
      const res = await claimsAi.preflightScrub(encounter.uuid || encounter.id, forceEscalation, controller.signal);
      if (controller.signal.aborted) return;
      setAuditResult(res); completed.current?.(res);
    } catch (err: any) {
      if (!controller.signal.aborted) setError(err?.message || 'Claims pre-flight audit failed.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [encounter?.id, encounter?.uuid, forceEscalation]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => { void runAudit(); }, 0);
    return () => { clearTimeout(timer); pendingRequest.current?.abort(); };
  }, [isOpen, runAudit]);

  if (!isOpen || !encounter) return null;

  const rthScore = auditResult?.rthRiskScore ?? 0.05;
  const isPass = auditResult?.passThreshold ?? rthScore <= 0.15;
  const readiness = auditResult?.cleanClaimReadiness ?? 95;

  const getRiskColor = (score: number) => {
    if (score <= 0.07) return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' };
    if (score <= 0.15) return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' };
    if (score <= 0.35) return { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800' };
    return { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-800' };
  };

  const riskColors = getRiskColor(rthScore);

  const handleCopyAddendum = async () => {
    if (!auditResult?.suggestedDoctorAddendum) return;
    await navigator.clipboard.writeText(auditResult.suggestedDoctorAddendum);
    setCopiedAddendum(true);
    setTimeout(() => setCopiedAddendum(false), 2000);
  };

  const handleCopyDossier = async () => {
    if (!auditResult) return;
    const summary = `
=== MEDCORE CLINICAL CLAIMS AUDIT DOSSIER ===
Encounter: ${encounter.encounterNumber} | Patient: ${encounter.patient?.fullName || encounter.patient?.maskedName}
ICD-10: ${auditResult.claimContext?.primaryIcd10 || encounter.philhealth?.primaryIcd10} (${auditResult.claimContext?.primaryDiagnosis || encounter.philhealth?.primaryDescription})
RTH Risk Score: ${(auditResult.rthRiskScore * 100).toFixed(1)}% | Risk Level: ${auditResult.riskLevel}
Clean Claim Readiness: ${auditResult.cleanClaimReadiness}% | Threshold: ${auditResult.passThreshold ? 'PASSED' : 'ACTION REQUIRED'}

=== CLINICAL SUMMARY ===
${auditResult.clinicalSummary}

=== AUDIT FLAGS ===
${auditResult.flags.map((f, i) => `${i + 1}. [${f.severity}] ${f.category} (${f.field})
Citation: ${f.regulatoryCitation}
Description: ${f.description}
Remediation: ${f.remediation}`).join('\n\n')}
    `.trim();

    await navigator.clipboard.writeText(summary);
    setCopiedDossier(true);
    setTimeout(() => setCopiedDossier(false), 2000);
  };

  return (
    <ViewportOverlay
      className="flex items-center justify-center p-4 sm:p-6" backdropClassName="bg-slate-900/50 backdrop-blur-xs" motion="rise" layer="modal"
      onDismiss={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  PhilHealth eClaims 3.0 Clinical Forensic Scrubber
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                  <Cpu className="w-3 h-3 text-teal-600" />
                  {auditResult?.modelUsed
                    ? auditResult.modelUsed

                        .replace('gemini-3.5-flash-lite', 'Gemini 3.5 Flash Lite')
                        .replace('gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite')
                    : forceEscalation
                      ? 'Secondary model'
                      : 'Generating…'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-flight validation for {encounter.encounterNumber} &bull; {encounter.patient?.fullName || encounter.patient?.maskedName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setForceEscalation(!forceEscalation)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                forceEscalation
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle secondary Gemini 3.1 Flash Lite engine"
            >
              {forceEscalation ? 'Gemini 3.1 Active' : 'Switch to Gemini 3.1'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <strong>{auditResult?.claimContext?.primaryDiagnosis || encounter.philhealth?.primaryDescription}</strong>
            <span className="ml-2 font-mono">{auditResult?.claimContext?.primaryIcd10 || encounter.philhealth?.primaryIcd10}</span>
            <div className="mt-1">Case rate: {auditResult?.claimContext?.caseRateCode || encounter.philhealth?.caseRateCode} · ₱{(auditResult?.claimContext?.totalCaseRate ?? encounter.philhealth?.totalCaseRate ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
          </div>
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-700">
                Auditing CF4 narratives, ICD-10 concordance, and eSOA XML against PhilHealth circulars...
              </p>
              <p className="text-xs text-slate-500">Executing zero-PHI pseudonymized payload analysis</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Audit Engine Notice</p>
                <p className="mt-1">{error}</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => void runAudit()}>
                  Retry Pre-Flight Audit
                </Button>
              </div>
            </div>
          ) : auditResult ? (
            <>
              {/* Scorecard Hero Banner */}
              <div className={`p-5 rounded-2xl border ${riskColors.border} ${riskColors.bg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
                <div className="flex items-center gap-4">
                  {/* Interactive Score Badge with Hover Tooltip */}
                  <div className="relative group shrink-0">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl shadow-xs cursor-help transition-transform group-hover:scale-105 ${
                        isPass ? 'bg-emerald-600 text-white' : 'bg-orange-600 text-white'
                      }`}
                      title={`RTH Risk: ${(rthScore * 100).toFixed(0)}% • Click 'How was this calculated?' for mathematical formula`}
                    >
                      {(rthScore * 100).toFixed(0)}%
                    </div>

                    {/* Rich Hover Popover Tooltip */}
                    <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50 w-72 p-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs pointer-events-none">
                      <div className="flex items-center gap-1.5 font-bold text-teal-400 mb-1 border-b border-slate-800 pb-1">
                        <Calculator className="w-3.5 h-3.5" />
                        <span>RTH Risk Calculation Formula</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-300 mb-2 leading-tight">
                        {auditResult.riskCalculation?.formula || `Base (${((auditResult.riskCalculation?.baseRisk ?? 0.04) * 100).toFixed(0)}%) + Penalties = ${(rthScore * 100).toFixed(0)}% RTH Risk`}
                      </p>
                      <div className="space-y-1 text-[11px] text-slate-400">
                        <div className="flex justify-between">
                          <span>Base Weight:</span>
                          <strong className="text-slate-200">{((auditResult.riskCalculation?.baseRisk ?? 0.04) * 100).toFixed(0)}%</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Penalties Added:</span>
                          <strong className="text-amber-400">
                            +{((auditResult.riskCalculation?.penalties?.reduce((sum, p) => sum + p.points, 0) ?? 0) * 100).toFixed(0)}%
                          </strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-800 pt-1">
                          <span>Gateway Ceiling:</span>
                          <strong className="text-teal-300">&le; 15% Max</strong>
                        </div>
                      </div>
                      <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                        Click 'How was this calculated?' for full audit trail.
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg text-slate-900">
                        RTH Risk Score: {auditResult.riskLevel}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${riskColors.badge}`}>
                        {isPass ? 'Ready for Gateway' : 'Action Required'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-xs text-slate-600">
                        Clean Claim Readiness: <strong className="text-slate-900">{readiness}%</strong> &bull; Target: &le; 15% Risk
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowRiskExplanation(!showRiskExplanation)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 hover:text-teal-900 bg-teal-100/70 hover:bg-teal-200/80 px-2 py-0.5 rounded-md border border-teal-300/80 transition-colors cursor-pointer"
                        title="Toggle mathematical risk derivation breakdown"
                      >
                        <Calculator className="w-3 h-3 text-teal-700" />
                        <span>{showRiskExplanation ? 'Hide Formula' : 'How is risk calculated?'}</span>
                        {showRiskExplanation ? <ChevronUp className="w-3 h-3 text-teal-700" /> : <ChevronDown className="w-3 h-3 text-teal-700" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => void runAudit()}>
                    Re-Audit
                  </Button>
                  <Button
                    size="sm"
                    variant={isPass ? 'primary' : 'secondary'}
                    icon={CheckCircle2}
                    onClick={() => setClearedForGateway(true)}
                  >
                    {clearedForGateway ? 'Cleared for Gateway' : 'Clear Claim'}
                  </Button>
                </div>
              </div>

              {/* Expandable Mathematical Risk Breakdown Card */}
              {showRiskExplanation && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Calculator className="w-4 h-4 text-teal-600" />
                      <span>PhilHealth RTH Risk Calculation Engine (eClaims 3.0 Conformance)</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Ceiling: &le; 15.0% Gateway Threshold
                    </span>
                  </div>

                  {/* Formula Equation Banner */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Derivation Equation:</span>
                    {auditResult.riskCalculation?.formula || `rthRiskScore = min(0.99, max(0.02, baseRisk (4%) + sum(penalties))) = ${(rthScore * 100).toFixed(0)}%`}
                  </div>

                  {/* 3 Step Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-100">
                      <span className="text-[10px] font-bold uppercase text-teal-800 block">1. Baseline Weight</span>
                      <span className="text-sm font-bold text-teal-950 font-mono">
                        {((auditResult.riskCalculation?.baseRisk ?? 0.04) * 100).toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-teal-700 block mt-0.5">Stochastic baseline audit weight</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
                      <span className="text-[10px] font-bold uppercase text-amber-800 block">2. Penalties Sum</span>
                      <span className="text-sm font-bold text-amber-950 font-mono">
                        +{((auditResult.riskCalculation?.penalties?.reduce((sum, p) => sum + p.points, 0) ?? 0) * 100).toFixed(0)}%
                      </span>
                      <span className="text-[11px] text-amber-700 block mt-0.5">
                        {auditResult.riskCalculation?.penalties?.length || 0} deficiency flags identified
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-100">
                      <span className="text-[10px] font-bold uppercase text-purple-800 block">3. Clean Readiness</span>
                      <span className="text-sm font-bold text-purple-950 font-mono">
                        {readiness}%
                      </span>
                      <span className="text-[11px] text-purple-700 block mt-0.5">100% - RTH Risk Score</span>
                    </div>
                  </div>

                  {/* Penalty Factors List */}
                  {auditResult.riskCalculation?.penalties && auditResult.riskCalculation.penalties.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Statutory Penalty Items:
                      </span>
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50">
                        {auditResult.riskCalculation.penalties.map((pen, idx) => (
                          <div key={idx} className="p-2.5 flex items-start justify-between gap-3 text-[11px]">
                            <div>
                              <span className="font-semibold text-slate-900">{pen.factor}</span>
                              <p className="text-slate-600 mt-0.5">{pen.description}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-100 text-amber-800 shrink-0">
                              +{(pen.points * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Zero statutory penalties. CF4 vital signs, daily ward course notes, and laboratory findings fully substantiate the primary diagnosis.</span>
                    </div>
                  )}

                  {/* Verdict Banner */}
                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
                    <span>Verdict: <strong className="text-slate-800">{auditResult.riskCalculation?.verdict || (isPass ? 'Passes threshold' : 'Exceeds threshold')}</strong></span>
                    <span>Authority: PhilHealth Circulars 2019-0002, 2023-0026 &amp; 2024-0021</span>
                  </div>
                </div>
              )}

              {/* Statutory Notice on SPC Abolition */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-2.5 text-xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Statutory Protection Verified:</strong> Single Period of Confinement (SPC) 90-day rule was formally abolished under <strong>PhilHealth Circular 2024-0021</strong>. Denial of readmissions within 90 days for same ICD-10 is unlawful; retroactive refiling permitted back to Feb 20, 2019 (Circular 2025-0015).
                </div>
              </div>

              {/* Clinical Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Clinical & Procedural Synthesis
                </h5>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {auditResult.clinicalSummary}
                </p>
              </div>

              {/* Audit Flags */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>Detected Deficiencies & Findings ({auditResult.flags.length})</span>
                  <span className="text-[11px] font-normal text-slate-500">Evaluated against PhilHealth Circular 2019-0002 & 2023-0026</span>
                </h5>

                {auditResult.flags.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    No discrepancies detected in the supplied record. Verify the source chart before filing.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {auditResult.flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          flag.severity === 'CRITICAL'
                            ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                            : flag.severity === 'WARNING'
                            ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                            : 'bg-blue-50/60 border-blue-200 text-blue-950'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5">
                            {flag.severity === 'CRITICAL' ? (
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            ) : flag.severity === 'WARNING' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <Info className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            <span className="font-mono text-[11px]">{flag.category}</span> &bull; {flag.field}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-white/80 border font-mono">
                            {flag.regulatoryCitation}
                          </span>
                        </div>
                        <p className="text-slate-800">{flag.description}</p>
                        <p className="text-slate-600 font-medium">
                          <strong>Remediation:</strong> {flag.remediation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggested Doctor Addendum */}
              {auditResult.suggestedDoctorAddendum && (
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                      Proactive Chart Addendum for Attending Physician
                    </h5>
                    <button
                      onClick={() => void handleCopyAddendum()}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    >
                      {copiedAddendum ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedAddendum ? 'Copied' : 'Copy Addendum'}
                    </button>
                  </div>
                  <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-slate-300">
                    {auditResult.suggestedDoctorAddendum}
                  </pre>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <Button
            size="sm"
            variant="secondary"
            icon={copiedDossier ? Check : Copy}
            onClick={() => void handleCopyDossier()}
            disabled={!auditResult}
          >
            {copiedDossier ? 'Dossier Copied' : 'Copy Audit Dossier'}
          </Button>

          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </ViewportOverlay>
  );
};
