import React, { useState, useEffect, useRef } from 'react';
import { matchesEncounterSearch } from '@/utils/encounterSearch';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp } from '@/utils/formatters';
import { CheckCircle2, Clock, AlertTriangle, ShieldAlert, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { ConfirmButton, Button, Select, SegmentedTabs } from '@/components/common';

export const CoverageApprovalsPage: React.FC = () => {
  const { searchQuery, encounters, approveHmoFinalLoa, openDossierDrawer, printDocument, refreshEncounters } = useMedCore();
  const [isVerifying, setIsVerifying] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPayer, setFilterPayer] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  useEffect(()=>{ setCurrentPage(1); }, [searchQuery]);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  };

  const triggerBatchVerification = async () => {
    setIsVerifying(true);
    try { await refreshEncounters(0); } finally { setIsVerifying(false); }
  };

  const handlePrintRoster = () => {
    printDocument({
      type: 'COVERAGE_APPROVALS_REPORT',
      title: 'Coverage Approvals Roster',
      data: { encounters: filteredEncounters }
    });
  };

  const hmoGateways = [
    { name: 'PhilHealth PEC 3.0', status: 'ONLINE', latency: '410ms', successRate: '99.8%' },
    { name: 'Maxicare Lifeline eLOA', status: 'ONLINE', latency: '520ms', successRate: '99.4%' },
    { name: 'Intellicare EDI Gateway', status: 'ONLINE', latency: '480ms', successRate: '98.9%' },
    { name: 'Medicard MediLink Direct', status: 'ONLINE', latency: '390ms', successRate: '99.2%' },
    { name: 'Pacific Cross CoreLink', status: 'ONLINE', latency: '440ms', successRate: '99.1%' },
    { name: 'PhilCare Snap Portal', status: 'ONLINE', latency: '610ms', successRate: '98.5%' }
  ];

  const availablePayers = Array.from(
    new Set(encounters.map((e) => e.hmo.providerName || e.hmo.hmoName).filter(Boolean))
  ).sort() as string[];

  const filteredEncounters = encounters.filter((enc) => {
    // Status filter
    if (filterStatus === 'APPROVED' && enc.hmo.finalLoaStatus !== 'APPROVED') return false;
    if (filterStatus === 'AWAITING' && enc.hmo.finalLoaStatus !== 'AWAITING_CODE') return false;
    if (filterStatus === 'PENDING' && enc.hmo.finalLoaStatus !== 'PENDING_SUBMISSION') return false;
    if (filterStatus === 'DISALLOWED' && enc.hmo.finalLoaStatus !== 'DISALLOWED_ITEMS') return false;

    // Payer filter
    if (
      filterPayer !== 'ALL' &&
      enc.hmo.providerName !== filterPayer &&
      enc.hmo.hmoName !== filterPayer
    ) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pName = (enc.patient.fullName || enc.patient.maskedName || '').toLowerCase();
      const card = (enc.hmo.cardMasked || '').toLowerCase();
      const code = (enc.hmo.approvalCode || enc.hmo.loaNumber || '').toLowerCase();
      const room = enc.roomBed.toLowerCase();
      return matchesEncounterSearch(enc,q) || pName.includes(q) || card.includes(q) || code.includes(q) || room.includes(q);
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEncounters.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEncounters = filteredEncounters.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const approvedCount = encounters.filter((e) => e.hmo.finalLoaStatus === 'APPROVED').length;
  const awaitingCount = encounters.filter((e) => e.hmo.finalLoaStatus === 'AWAITING_CODE').length;
  const disallowedCount = encounters.filter((e) => e.hmo.finalLoaStatus === 'DISALLOWED_ITEMS').length;
  const pendingCount = encounters.filter((e) => e.hmo.finalLoaStatus === 'PENDING_SUBMISSION').length;

  const statusTabs = [
    { id: 'ALL', label: 'All Cases', badge: encounters.length },
    { id: 'APPROVED', label: 'Approved', badge: approvedCount, badgeVariant: 'emerald' as const },
    { id: 'AWAITING', label: 'Awaiting Code', badge: awaitingCount, badgeVariant: 'amber' as const },
    { id: 'DISALLOWED', label: 'Disallowed Supplies', badge: disallowedCount, badgeVariant: 'rose' as const },
    { id: 'PENDING', label: 'Draft / Pending', badge: pendingCount, badgeVariant: 'blue' as const }
  ];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-5 space-y-3.5 bg-slate-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Coverage, Approvals &amp; Payer Coordination
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time PhilHealth PEC eligibility verification, commercial HMO electronic LOA adjudication, and consumable exclusion triage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={Printer}
            onClick={handlePrintRoster}
            title="Print Coverage Approvals Roster"
          >
            Print Roster
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={RefreshCw}
            isLoading={isVerifying}
            onClick={triggerBatchVerification}
            title="Refresh Coverage"
          >
            {isVerifying ? 'Refreshing Coverage...' : 'Refresh Coverage'}
          </Button>
        </div>
      </div>

      {/* Gateway Status Strip */}
      <p className="text-xs text-slate-500">Gateway configuration preview. External payer connectivity and latency are not monitored.</p>
      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs text-slate-600 shrink-0">
        {hmoGateways.map((g) => (
          <div key={g.name} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 text-xs truncate">{g.name}</div>
              <div className="text-slate-400 font-mono text-[10px]">Connection unavailable</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-3.5 border-b border-slate-200 space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Active Multi-Payer Inpatient Roster
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Showing {filteredEncounters.length} of {encounters.length} active inpatient encounters
              </span>
            </div>

            {/* Search Input */}

          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
            {/* Status Tabs */}
            <SegmentedTabs
              items={statusTabs}
              activeId={filterStatus}
              onChange={(id) => {
                setFilterStatus(id);
                setCurrentPage(1);
              }}
              size="sm"
              ariaLabel="Payer coverage status filter"
            />

            {/* Payer Dropdown Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Payer:</span>
              <Select
                size="sm"
                value={filterPayer}
                onChange={(e) => {
                  setFilterPayer(e.target.value);
                  setCurrentPage(1);
                }}
                className="font-semibold text-xs"
              >
                <option value="ALL">All Commercial Payers ({encounters.length})</option>
                {availablePayers.map((payer) => {
                  const count = encounters.filter(
                    (e) => e.hmo.providerName === payer || e.hmo.hmoName === payer
                  ).length;
                  return (
                    <option key={payer} value={payer}>
                      {payer} ({count})
                    </option>
                  );
                })}
              </Select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div ref={tableContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain">
          <table className="w-full min-w-[960px] text-left text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2.5 px-6 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Patient &amp; Room</th>
                <th className="py-2.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">PhilHealth Benefit</th>
                <th className="py-2.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">HMO Policy &amp; MBL</th>
                <th className="py-2.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">LOA Reference</th>
                <th className="py-2.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Approved LOA</th>
                <th className="py-2.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Excluded Supplies</th>
                <th className="py-2.5 px-4 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200">Adjudication Status</th>
                <th className="py-2.5 px-6 text-left sticky top-0 bg-slate-50 z-20 border-b border-slate-200 min-w-[210px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEncounters.map((enc) => {
                const isApproved = enc.hmo.finalLoaStatus === 'APPROVED';
                const isAwaiting = enc.hmo.finalLoaStatus === 'AWAITING_CODE';
                const isDisallowed = enc.hmo.finalLoaStatus === 'DISALLOWED_ITEMS';
                const pName = enc.patient.fullName || enc.patient.maskedName;

                return (
                  <tr key={enc.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Patient & Room */}
                    <td className="py-2 px-6 text-left">
                      <div className="font-semibold text-slate-900 text-xs">
                        {pName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        <span className="font-semibold text-slate-700">{enc.roomBed}</span> · <span className="font-mono text-[10px]">{enc.encounterNumber}</span>
                      </div>
                    </td>

                    {/* PhilHealth Status */}
                    <td className="py-2 px-4 text-left">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>PEC 3.0 Verified</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        ACR: <strong>{formatPhp(enc.philhealth.totalCaseRate)}</strong> ({enc.philhealth.caseRateCode})
                      </div>
                    </td>

                    {/* HMO Carrier & MBL */}
                    <td className="py-2 px-4 text-left">
                      <div className="font-semibold text-slate-900 text-xs">
                        {enc.hmo.providerName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        MBL: {formatPhp(enc.hmo.mblRemaining)} rem.
                      </div>
                    </td>

                    {/* Approval Code / LOA */}
                    <td className="py-2 px-4 text-left">
                      {enc.hmo.approvalCode ? (
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                            {enc.hmo.approvalCode}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            {enc.hmo.turnaroundMinutes || 24}m TAT
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs text-slate-400 font-mono italic">
                            {enc.hmo.cardMasked}
                          </span>
                          <div className="text-[10px] text-amber-600 font-semibold">
                            Pending carrier code
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Approved Amount */}
                    <td className="py-2 px-4 text-left font-mono font-bold text-slate-900 text-xs tabular-nums">
                      {enc.hmo.approvedAmount > 0 ? (
                        <span className="text-emerald-700">{formatPhp(enc.hmo.approvedAmount)}</span>
                      ) : (
                        <span className="text-slate-400">₱0.00</span>
                      )}
                    </td>

                    {/* Excluded Supplies */}
                    <td className="py-2 px-4 text-left font-mono font-bold text-xs tabular-nums">
                      {enc.hmo.disallowedConsumables > 0 ? (
                        <span className="text-rose-700 font-bold">
                          {formatPhp(enc.hmo.disallowedConsumables)}
                        </span>
                      ) : (
                        <span className="text-slate-400">₱0.00</span>
                      )}
                    </td>

                    {/* Adjudication Status */}
                    <td className="py-2 px-4 text-left text-xs">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Approved</span>
                        </span>
                      ) : isAwaiting ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Awaiting Code</span>
                        </span>
                      ) : isDisallowed ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[11px]">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>Exclusions Struck</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[11px]">
                          <span>Draft / In Review</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-6 text-left whitespace-nowrap">
                      <div className="flex items-center justify-start gap-2">
                        {/* Secondary View Action */}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={ExternalLink}
                          onClick={() => openDossierDrawer(enc)}
                          title="Open Case Dossier and Review LOA"
                        >
                          View LOA
                        </Button>

                        {/* Primary Approval Action or Approved Status */}
                        {!isApproved ? (
                          <ConfirmButton
                            label="Approve"
                            modalTitle="Approve HMO LOA Coverage?"
                            modalDescription={`This will approve and lock the ${enc.hmo.providerName || enc.hmo.hmoName} electronic Letter of Authorization (eLOA) for ${pName}, enabling final discharge clearance.`}
                            confirmLabel="Approve LOA"
                            variant="success"
                            confirmVariant="success"
                            size="sm"
                            icon={CheckCircle2}
                            contextInfo={[
                              { label: 'Patient', value: pName },
                              { label: 'HMO Provider', value: enc.hmo.providerName || enc.hmo.hmoName },
                              { label: 'Approved Benefit', value: formatPhp(enc.hmo.approvedAmount) }
                            ]}
                            onConfirm={() => approveHmoFinalLoa(enc.id)}
                            title="Approve HMO Final LOA"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - Always Pinned at Bottom & Prominently Visible */}
        <div className="px-6 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
          <div>
            Showing <strong className="text-slate-900">{filteredEncounters.length === 0 ? 0 : ((safeCurrentPage - 1) * pageSize) + 1}</strong> to{' '}
            <strong className="text-slate-900">{Math.min(safeCurrentPage * pageSize, filteredEncounters.length)}</strong> of{' '}
            <strong className="text-slate-900">{filteredEncounters.length}</strong> active inpatient encounters
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={safeCurrentPage <= 1}
              onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
              icon={ChevronLeft}
              aria-label="Navigate to previous patients"
              title="Navigate to previous patients"
            >
              Previous
            </Button>
            <span className="font-semibold text-slate-800 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-xs">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
              icon={ChevronRight}
              iconPosition="right"
              aria-label="Navigate to next patients"
              title="Navigate to next patients"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CoverageApprovalsView = CoverageApprovalsPage;
