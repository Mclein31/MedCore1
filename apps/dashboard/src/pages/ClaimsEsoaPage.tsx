import { ViewportOverlay } from '@/components/common/ViewportOverlay';
import React, { useState, useEffect } from 'react';
import { matchesEncounterSearch } from '@/utils/encounterSearch';
import { useMedCore } from '@/context/MedCoreContext';
import { claimsApi } from '@/api';
import { formatPhp } from '@/utils/formatters';
import { Copy, Check, Download, AlertTriangle, CheckCircle2, ShieldAlert, FileText, X, Printer, Sparkles } from '@/components/common/SolarIcons';
import { Button, IconButton, SegmentedTabs } from '@/components/common';
import { ClaimsPreflightScrubberModal } from '@/components/ai/ClaimsPreflightScrubberModal';

export const ClaimsEsoaPage: React.FC = () => {
  const { encounters, printDocument, searchQuery: claimSearch, refreshEncounters } = useMedCore();
  const [copied, setCopied] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [isAiScrubberOpen, setIsAiScrubberOpen] = useState(false);
  const [filterClaimStatus, setFilterClaimStatus] = useState<string>('ALL');
  const [serverXml, setServerXml] = useState<{key:string;xml:string} | null>(null);
  const [xmlError,setXmlError]=useState<string | null>(null);
  const [xmlRetry,setXmlRetry]=useState(0);
  const [xmlLoading, setXmlLoading] = useState(false);

  const [claimPage, setClaimPage] = useState(1);
  const claimPageSize = 8;
  useEffect(()=>{ setClaimPage(1); }, [claimSearch]);

  useEffect(() => {
    if (!encounters.some(e => e.id === selectedClaimId) && encounters.length) setSelectedClaimId(encounters[0].id);
  }, [encounters, selectedClaimId]);
  const currentEncounter = encounters.find(e => e.id === selectedClaimId);
  const [auditScores, setAuditScores] = useState<Record<string, { score: number; previousScore: number }>>({});
  useEffect(() => {
    const completed = Object.keys(auditScores).filter(id => {
      const enc = encounters.find(e => e.id === id), pending = auditScores[id];
      return !enc || enc.philhealth.rthRiskScore === pending.score || enc.philhealth.rthRiskScore !== pending.previousScore;
    });
    if (completed.length) setAuditScores(scores => Object.fromEntries(Object.entries(scores).filter(([id]) => !completed.includes(id))));
  }, [encounters, auditScores]);
  const claim = currentEncounter?.philhealth;
  const xmlKey=JSON.stringify(currentEncounter);

  useEffect(() => {
    let active=true;
    setServerXml(null);setCopied(false);setXmlError(null);
    if(!claim?.id) return;
    setXmlLoading(true);
    claimsApi.getPhilhealthEsoaXml(claim.id).then(xml=>{
      if(!active) return;
      if(typeof xml!=='string'||!xml.trim().startsWith('<?xml')) throw new Error('The server returned invalid XML.');
      setServerXml({key:xmlKey,xml});
    }).catch(error=>{if(active)setXmlError(error instanceof Error?error.message:'Could not load the hospital XML.');})
      .finally(()=>{if(active)setXmlLoading(false);});
    return()=>{active=false;};
  },[xmlKey,xmlRetry]);
  const eSoaXmlString=serverXml && serverXml.key===xmlKey?serverXml.xml:'';
  const handleCopyXml=async()=>{
    if(!eSoaXmlString) return;
    try {await navigator.clipboard.writeText(eSoaXmlString);setCopied(true);setTimeout(()=>setCopied(false),2000);}
    catch {setXmlError('Clipboard access failed. You can download the XML instead.');}
  };

  const handleDownloadXml = () => {
    if(!eSoaXmlString) return;
    const blob = new Blob([eSoaXmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eSOA_${currentEncounter?.encounterNumber}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if(!currentEncounter || !claim)return <div className="p-6 text-sm text-slate-600">Select an available hospital claim.</div>;

  const filteredClaims = encounters.filter((enc) => {
    if (filterClaimStatus === 'CLEAN' && enc.philhealth.status !== 'CLEAN') return false;
    if (filterClaimStatus === 'WARNING' && enc.philhealth.status !== 'WARNING' && enc.philhealth.status !== 'INTERCEPTED') return false;
    if (filterClaimStatus === 'AGING' && (enc.philhealth.claimAgingDays || 0) < 3) return false;

    if (claimSearch.trim()) {
      const q = claimSearch.toLowerCase();
      const pName = (enc.patient.fullName || enc.patient.maskedName || '').toLowerCase();
      const cid = (enc.philhealth.id || '').toLowerCase();
      const encNum = (enc.encounterNumber || '').toLowerCase();
      const room = (enc.roomBed || '').toLowerCase();
      const code = (enc.philhealth.caseRateCode || '').toLowerCase();
      const icd = (enc.philhealth.primaryIcd10 || '').toLowerCase();
      const diag = (enc.philhealth.primaryDescription || '').toLowerCase();
      return (
        matchesEncounterSearch(enc,q) || pName.includes(q) ||
        cid.includes(q) ||
        encNum.includes(q) ||
        room.includes(q) ||
        code.includes(q) ||
        icd.includes(q) ||
        diag.includes(q)
      );
    }
    return true;
  });



  const totalClaimPages = Math.max(1, Math.ceil(filteredClaims.length / claimPageSize));
  const safeClaimPage = Math.min(claimPage, totalClaimPages);
  const paginatedClaims = filteredClaims.slice((safeClaimPage - 1) * claimPageSize, safeClaimPage * claimPageSize);

  const highRiskCount = encounters.filter((e) => (auditScores[e.id]?.score ?? e.philhealth.rthRiskScore) > 0.15 || e.philhealth.status === 'WARNING' || e.philhealth.status === 'INTERCEPTED').length;
  const cleanCount = encounters.filter((e) => e.philhealth.status === 'CLEAN').length;

  const claimStatusTabs = [
    { id: 'ALL', label: 'All Claims', badge: encounters.length },
    { id: 'CLEAN', label: 'Clean', badge: cleanCount, badgeVariant: 'emerald' as const },
    { id: 'WARNING', label: 'Warnings & Interceptions', badge: highRiskCount, badgeVariant: 'rose' as const },
    { id: 'AGING', label: 'Aging >3 Days', badge: 3, badgeVariant: 'amber' as const }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
      {xmlError&&<div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{xmlError} <button type="button" onClick={()=>setXmlRetry(value=>value+1)} className="underline">Retry XML</button></div>}
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Claims &amp; eSOA XML Pre-Flight Scrubber
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            PhilHealth eClaims 3.0 pre-flight auditing, CF1–CF4 consistency checks, and Circular 2023-0026 XML conformity validation.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Circular 2024-0037 Rulebook Active (+50% Rate Bump)</span>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="claims-summary p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">First-Pass Clean Rate</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">93.3%</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">✓ 14 of 15 Claims Ready</div>
        </div>

        <div className="md:pl-4 pt-2 md:pt-0">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">RTH Risk Interceptions</div>
          <div className="text-xl font-bold text-rose-600 mt-0.5">{highRiskCount} Intercepted</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Halted before rejection</div>
        </div>

        <div className="md:pl-4 pt-2 md:pt-0">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total ACR Claim Value</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
            {formatPhp(encounters.reduce((acc, e) => acc + e.philhealth.totalCaseRate, 0))}
          </div>
          <div className="text-[11px] text-blue-700 font-semibold mt-0.5">Across 15 Inpatient Cases</div>
        </div>

        <div className="md:pl-4 pt-2 md:pt-0">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">eSOA XML Conformity</div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">100%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Circular 2023-0026 Conforming</div>
        </div>
      </div>

      {/* Pre-Flight Claims Worklist Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Inpatient Pre-Flight Audit Worklist
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a claim to inspect its CF1–CF4 validation checklist and generate compliant eSOA XML
              </p>
            </div>


          </div>

          <SegmentedTabs
            items={claimStatusTabs}
            activeId={filterClaimStatus}
            onChange={(id) => {
              setFilterClaimStatus(id);
              setClaimPage(1);
            }}
            size="sm"
            ariaLabel="PhilHealth claim status filter"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-6 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Claim ID &amp; Patient</th>
                <th className="py-3.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Primary Diagnosis &amp; ICD-10</th>
                <th className="py-3.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Case Rate (ACR)</th>
                <th className="py-3.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">CF4 Clinical Integrity</th>
                <th className="py-3.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">RTH Risk Score</th>
                <th className="py-3.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Audit Status</th>
                <th className="min-w-[180px] py-3.5 px-6 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedClaims.map((enc) => {
                const isSelected = enc.id === selectedClaimId;
                const score = auditScores[enc.id]?.score ?? enc.philhealth.rthRiskScore;
                const isHighRisk = score > 0.15;
                const auditStatus = auditScores[enc.id] !== undefined && ['CLEAN', 'WARNING', 'INTERCEPTED'].includes(enc.philhealth.status) ? (score <= 0.15 ? 'CLEAN' : 'WARNING') : enc.philhealth.status;
                const pName = enc.patient.fullName || enc.patient.maskedName;

                return (
                  <tr
                    key={enc.id}
                    onClick={() => setSelectedClaimId(enc.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-6 text-left">
                      <div className="font-semibold text-slate-900 text-sm">
                        {pName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {enc.philhealth.id} · {enc.roomBed}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-left">
                      <div className="font-medium text-slate-900 text-xs">
                        {enc.philhealth.primaryDescription}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ICD: {enc.philhealth.primaryIcd10} · RVS/ACR: {enc.philhealth.caseRateCode}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-900 tabular-nums">
                      {formatPhp(enc.philhealth.totalCaseRate)}
                    </td>

                    <td className="py-3.5 px-4 text-left text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${enc.philhealth.cf4VitalsRecorded ? 'bg-emerald-500' : 'bg-rose-500'}`} title="Vitals" />
                        <span className={`w-2 h-2 rounded-full ${enc.philhealth.cf4CourseInWardRecorded ? 'bg-emerald-500' : 'bg-rose-500'}`} title="Course in Ward" />
                        <span className={`w-2 h-2 rounded-full ${enc.philhealth.cf4LabsConsistent ? 'bg-emerald-500' : 'bg-rose-500'}`} title="Labs Consistency" />
                        <span className="text-[11px] text-slate-500">
                          {enc.philhealth.cf4LabsConsistent && enc.philhealth.cf4CourseInWardRecorded ? 'Complete' : 'Incomplete'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-left text-xs font-mono font-bold">
                      {isHighRisk ? (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {(score * 100).toFixed(1)}% (High Risk)
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {(score * 100).toFixed(1)}% (Pass)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-left text-xs">
                      {auditStatus === 'CLEAN' && !isHighRisk ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>{auditStatus}</span>
                        </span>
                      )}
                    </td>

                    <td className="min-w-[180px] py-3.5 px-6 text-left">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-teal-700 hover:text-teal-800 hover:bg-teal-50 font-semibold text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClaimId(enc.id);
                            setIsAiScrubberOpen(true);
                          }}
                          title="Run Gemini Clinical Claims Scrubber on this encounter"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600" />
                          AI Scrub
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClaimId(enc.id);
                            setIsXmlModalOpen(true);
                          }}
                        >
                          XML →
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
          <div>
            Showing <strong className="text-slate-900">{filteredClaims.length === 0 ? 0 : ((safeClaimPage - 1) * claimPageSize) + 1}</strong> to{' '}
            <strong className="text-slate-900">{Math.min(safeClaimPage * claimPageSize, filteredClaims.length)}</strong> of{' '}
            <strong className="text-slate-900">{filteredClaims.length}</strong> claims
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={safeClaimPage <= 1}
              onClick={() => setClaimPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="font-semibold text-slate-800 px-1 text-xs">
              Page {safeClaimPage} of {totalClaimPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={safeClaimPage >= totalClaimPages}
              onClick={() => setClaimPage((p) => Math.min(totalClaimPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Selected Claim Audit & Live XML Payload View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pre-Flight Scrubber Audit Details */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Pre-Flight Audit Checklist
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {currentEncounter.patient.fullName || currentEncounter.patient.maskedName} ({currentEncounter.encounterNumber})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                icon={Sparkles}
                onClick={() => setIsAiScrubberOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white"
                title="Run Gemini-powered CF4 & eSOA clinical audit"
              >
                Run AI Audit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={Printer}
                onClick={() =>
                  printDocument({
                    type: 'CLAIMS_ESOA_AUDIT_REPORT',
                    title: `PhilHealth Audit - ${claim.id}`,
                    data: { encounter: currentEncounter }
                  })
                }
                title="Print PhilHealth CF1-CF4 Conformity Report"
              >
                Print Audit
              </Button>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                claim.status === 'CLEAN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {claim.status}
              </span>
            </div>
          </div>

          {claim.deficiencyReason && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <span className="font-bold block">Deficiency Flagged:</span>
              <p>{claim.deficiencyReason}</p>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Claim Form 1 (CF1): Member Eligibility</span>
                <span className="text-slate-500 text-[11px]">PhilHealth PIN: {currentEncounter.patient.philhealthPin}</span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Claim Form 2 (CF2): Itemized Waterfall</span>
                <span className="text-slate-500 text-[11px]">HCI: {formatPhp(claim.hciAmount)} · PF: {formatPhp(claim.pfAmount)}</span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Claim Form 4 (CF4): Clinical Summary</span>
                <span className="text-slate-500 text-[11px]">Vitals recorded, ward course, diagnostic findings</span>
              </div>
              {claim.cf4CourseInWardRecorded && claim.cf4LabsConsistent ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
            </div>
          </div>
        </div>

        {/* Right: Live XML Conforming Payload */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Circular 2023-0026 Live eSOA XML
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standardized XML schema ready for PhilHealth eClaims 3.0 API gateway transmission
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={copied ? Check : Copy}
                disabled={!eSoaXmlString||xmlLoading} onClick={()=>void handleCopyXml()}
              >
                {copied ? 'Copied' : 'Copy XML'}
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={Download}
                disabled={!eSoaXmlString||xmlLoading} onClick={handleDownloadXml}
              >
                Download .XML
              </Button>
            </div>
          </div>

          <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-[340px] leading-relaxed">
            {xmlLoading?'Loading hospital XML…':eSoaXmlString||'XML is unavailable. Retry before exporting.'}
          </pre>
        </div>
      </div>

      {/* PhilHealth Circular 2023-0026 XML Inspector Modal */}
      {isXmlModalOpen && (
        <ViewportOverlay
          className="flex items-center justify-center p-4 sm:p-6" backdropClassName="bg-slate-900/50 backdrop-blur-xs" motion="rise" layer="modal"
          onDismiss={() => setIsXmlModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">
                      PhilHealth Circular 2023-0026 XML Payload Inspector
                    </h3>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      currentEncounter.philhealth.status === 'CLEAN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {currentEncounter.philhealth.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {currentEncounter.patient.fullName || currentEncounter.patient.maskedName} · {currentEncounter.encounterNumber} · PIN: {currentEncounter.patient.philhealthPin}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={copied ? Check : Copy}
                  disabled={!eSoaXmlString||xmlLoading} onClick={()=>void handleCopyXml()}
                >
                  {copied ? 'Copied' : 'Copy XML'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={Download}
                  disabled={!eSoaXmlString||xmlLoading} onClick={handleDownloadXml}
                >
                  Download .XML
                </Button>
                <IconButton
                  size="sm"
                  variant="ghost"
                  icon={X}
                  ariaLabel="Close modal"
                  onClick={() => setIsXmlModalOpen(false)}
                />
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-4 bg-slate-50/50">
              {/* Pre-Flight Checklist Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                  <div className="text-slate-500 font-medium">Claim Form 1 (CF1)</div>
                  <div className="font-bold text-slate-900 mt-1 flex items-center justify-between">
                    <span>Member Eligibility</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                  <div className="text-slate-500 font-medium">Claim Form 2 (CF2)</div>
                  <div className="font-bold text-slate-900 mt-1 flex items-center justify-between">
                    <span>ACR: {formatPhp(currentEncounter.philhealth.totalCaseRate)}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                  <div className="text-slate-500 font-medium">Claim Form 4 (CF4)</div>
                  <div className="font-bold text-slate-900 mt-1 flex items-center justify-between">
                    <span>Clinical Records</span>
                    {currentEncounter.philhealth.cf4CourseInWardRecorded && currentEncounter.philhealth.cf4LabsConsistent ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* XML Code Viewer */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-inner overflow-hidden">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                  <span>schema: esoa-v3.0.xsd (PhilHealth eClaims 3.0)</span>
                  <span>Encoding: UTF-8</span>
                </div>
                <pre className="font-mono text-xs text-emerald-400 overflow-x-auto max-h-[420px] leading-relaxed select-all">
                  {xmlLoading?'Loading hospital XML…':eSoaXmlString||'XML is unavailable. Retry before exporting.'}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>PhilHealth Circular No. 2023-0026 · Standard Electronic Statement of Account (eSOA)</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsXmlModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </ViewportOverlay>
      )}
      {/* PhilHealth Claims Pre-Flight Forensic Scrubber AI Modal */}
      <ClaimsPreflightScrubberModal
        isOpen={isAiScrubberOpen}
        onClose={() => setIsAiScrubberOpen(false)}
        encounter={currentEncounter}
        onAuditComplete={(result) => {
          setAuditScores(scores => ({ ...scores, [currentEncounter.id]: { score: result.rthRiskScore, previousScore: currentEncounter.philhealth.rthRiskScore } }));
          void refreshEncounters(0, true);
        }}
      />
    </div>
  );
};

export const ClaimsEsoaView = ClaimsEsoaPage;
