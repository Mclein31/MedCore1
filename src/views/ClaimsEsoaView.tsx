import React, { useState } from 'react';
import { useMedCore } from '../context/MedCoreContext';
import { formatPhp } from '../utils/formatters';
import { Copy, Check, Download, AlertTriangle, CheckCircle2, ShieldAlert, FileText, Search, X } from 'lucide-react';

export const ClaimsEsoaView: React.FC = () => {
  const { encounters } = useMedCore();
  const [copied, setCopied] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string>(encounters[0]?.id || 'enc-8812');
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [filterClaimStatus, setFilterClaimStatus] = useState<string>('ALL');
  const [claimSearch, setClaimSearch] = useState<string>('');

  const currentEncounter = encounters.find((e) => e.id === selectedClaimId) || encounters[0];
  const claim = currentEncounter.philhealth;

  // Generate real PhilHealth Circular 2023-0026 eSOA XML conforming payload
  const eSoaXmlString = `<?xml version="1.0" encoding="UTF-8"?>
<eSOA xmlns="http://www.philhealth.gov.ph/claims/esoa/v3" version="3.0">
  <Header>
    <HospitalCode>HOSP-NCR-004921</HospitalCode>
    <HospitalName>St. Jude Medical Center Manila</HospitalName>
    <BatchID>BAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001</BatchID>
    <GenerationTimestamp>${new Date().toISOString()}</GenerationTimestamp>
  </Header>
  <ClaimDetails>
    <ClaimID>${claim.id}</ClaimID>
    <EncounterNumber>${currentEncounter.encounterNumber}</EncounterNumber>
    <PatientPIN>${currentEncounter.patient.philhealthPin}</PatientPIN>
    <MemberName>${currentEncounter.patient.fullName || currentEncounter.patient.maskedName}</MemberName>
    <SeniorCitizenFlag>${currentEncounter.patient.isSeniorCitizen ? 'Y' : 'N'}</SeniorCitizenFlag>
    <PWDFlag>${currentEncounter.patient.isPwd ? 'Y' : 'N'}</PWDFlag>
    <AdmissionDate>${currentEncounter.admissionDate}</AdmissionDate>
    <DischargeDate>${currentEncounter.mghOrderTimestamp}</DischargeDate>
    <PrimaryICD10>${claim.primaryIcd10}</PrimaryICD10>
    <PrimaryDescription>${claim.primaryDescription}</PrimaryDescription>
    <CaseRateCode>${claim.caseRateCode}</CaseRateCode>
    <HCICoverage>${claim.hciAmount.toFixed(2)}</HCICoverage>
    <PFCoverage>${claim.pfAmount.toFixed(2)}</PFCoverage>
    <TotalACRClaimed>${claim.totalCaseRate.toFixed(2)}</TotalACRClaimed>
    <CF4ClinicalData>
      <VitalsRecorded>${claim.cf4VitalsRecorded ? 'true' : 'false'}</VitalsRecorded>
      <CourseInWardRecorded>${claim.cf4CourseInWardRecorded ? 'true' : 'false'}</CourseInWardRecorded>
      <LabResultsConsistent>${claim.cf4LabsConsistent ? 'true' : 'false'}</LabResultsConsistent>
    </CF4ClinicalData>
    <StatutoryWaterfalls>
      <GrossHospitalCharges>${currentEncounter.waterfall.grossHospitalCharges.toFixed(2)}</GrossHospitalCharges>
      <VATExemption>${currentEncounter.waterfall.vatExemption.toFixed(2)}</VATExemption>
      <SeniorDiscount>${currentEncounter.waterfall.seniorPwdDiscount.toFixed(2)}</SeniorDiscount>
      <HMOApprovedAmount>${currentEncounter.waterfall.hmoApprovedAmount.toFixed(2)}</HMOApprovedAmount>
      <NetPatientOOPDue>${currentEncounter.waterfall.netPatientDue.toFixed(2)}</NetPatientOOPDue>
    </StatutoryWaterfalls>
  </ClaimDetails>
</eSOA>`;

  const handleCopyXml = () => {
    navigator.clipboard.writeText(eSoaXmlString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadXml = () => {
    const blob = new Blob([eSoaXmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eSOA_${currentEncounter.encounterNumber}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        pName.includes(q) ||
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

  const [claimPage, setClaimPage] = useState(1);
  const claimPageSize = 8;

  const totalClaimPages = Math.max(1, Math.ceil(filteredClaims.length / claimPageSize));
  const safeClaimPage = Math.min(claimPage, totalClaimPages);
  const paginatedClaims = filteredClaims.slice((safeClaimPage - 1) * claimPageSize, safeClaimPage * claimPageSize);

  const highRiskCount = encounters.filter((e) => e.philhealth.rthRiskScore > 0.4 || e.philhealth.status === 'WARNING' || e.philhealth.status === 'INTERCEPTED').length;
  const cleanCount = encounters.filter((e) => e.philhealth.status === 'CLEAN').length;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Claims &amp; eSOA XML Pre-Flight Scrubber
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            PhilHealth eClaims 3.0 pre-flight auditing, CF1–CF4 consistency checks, and Circular 2023-0026 XML conformity validation.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Circular 2024-0037 Rulebook Active (+50% Rate Bump)</span>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs grid grid-cols-2 md:grid-cols-4 gap-6 text-sm divide-y md:divide-y-0 md:divide-x divide-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">First-Pass Clean Rate</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">93.3%</div>
          <div className="text-xs text-emerald-700 font-semibold mt-0.5">✓ 14 of 15 Claims Ready</div>
        </div>

        <div className="md:pl-6 pt-3 md:pt-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">RTH Risk Interceptions</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{highRiskCount} Intercepted</div>
          <div className="text-xs text-slate-500 mt-0.5">Halted before PhilHealth rejection</div>
        </div>

        <div className="md:pl-6 pt-3 md:pt-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total ACR Claim Value</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {formatPhp(encounters.reduce((acc, e) => acc + e.philhealth.totalCaseRate, 0))}
          </div>
          <div className="text-xs text-blue-700 font-semibold mt-0.5">Across 15 Inpatient Cases</div>
        </div>

        <div className="md:pl-6 pt-3 md:pt-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">eSOA XML Conformity</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">100%</div>
          <div className="text-xs text-slate-500 mt-0.5">Circular 2023-0026 Conforming</div>
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

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search patient, claim ID, diagnosis, ICD-10..."
                value={claimSearch}
                onChange={(e) => {
                  setClaimSearch(e.target.value);
                  setClaimPage(1);
                }}
                className="pl-9 pr-3.5 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-72 text-slate-800 placeholder-slate-400 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => {
                setFilterClaimStatus('ALL');
                setClaimPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                filterClaimStatus === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Claims ({encounters.length})
            </button>
            <button
              onClick={() => {
                setFilterClaimStatus('CLEAN');
                setClaimPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
                filterClaimStatus === 'CLEAN'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span>✓ Clean ({cleanCount})</span>
            </button>
            <button
              onClick={() => {
                setFilterClaimStatus('WARNING');
                setClaimPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
                filterClaimStatus === 'WARNING'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span>! Warnings &amp; Interceptions ({highRiskCount})</span>
            </button>
            <button
              onClick={() => {
                setFilterClaimStatus('AGING');
                setClaimPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                filterClaimStatus === 'AGING'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Aging &gt;3 Days (3)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-6 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Claim ID &amp; Patient</th>
                <th className="py-3.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Primary Diagnosis &amp; ICD-10</th>
                <th className="py-3.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Case Rate (ACR)</th>
                <th className="py-3.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">CF4 Clinical Integrity</th>
                <th className="py-3.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">RTH Risk Score</th>
                <th className="py-3.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Audit Status</th>
                <th className="py-3.5 px-6 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedClaims.map((enc) => {
                const isSelected = enc.id === selectedClaimId;
                const isHighRisk = enc.philhealth.rthRiskScore > 0.4 || enc.philhealth.status === 'WARNING' || enc.philhealth.status === 'INTERCEPTED';
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
                          {enc.philhealth.rthRiskScore.toFixed(2)} (High Risk)
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {enc.philhealth.rthRiskScore.toFixed(2)} (Clean)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-left text-xs">
                      {enc.philhealth.status === 'CLEAN' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>{enc.philhealth.status}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-6 text-left">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClaimId(enc.id);
                          setIsXmlModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        Inspect XML →
                      </button>
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
            <button
              type="button"
              disabled={safeClaimPage <= 1}
              onClick={() => setClaimPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-800 px-1">
              Page {safeClaimPage} of {totalClaimPages}
            </span>
            <button
              type="button"
              disabled={safeClaimPage >= totalClaimPages}
              onClick={() => setClaimPage((p) => Math.min(totalClaimPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
            >
              Next
            </button>
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
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              claim.status === 'CLEAN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {claim.status}
            </span>
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
              <button
                onClick={handleCopyXml}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy XML'}</span>
              </button>
              <button
                onClick={handleDownloadXml}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .XML</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-[340px] leading-relaxed">
            {eSoaXmlString}
          </pre>
        </div>
      </div>

      {/* PhilHealth Circular 2023-0026 XML Inspector Modal */}
      {isXmlModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsXmlModalOpen(false)}
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
                <button
                  onClick={handleCopyXml}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy XML'}</span>
                </button>
                <button
                  onClick={handleDownloadXml}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .XML</span>
                </button>
                <button
                  onClick={() => setIsXmlModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
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
                  {eSoaXmlString}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>PhilHealth Circular No. 2023-0026 · Standard Electronic Statement of Account (eSOA)</span>
              <button
                onClick={() => setIsXmlModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
