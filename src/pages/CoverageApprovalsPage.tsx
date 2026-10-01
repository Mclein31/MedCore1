import React, { useState, useRef } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp } from '@/utils/formatters';
import { CheckCircle2, Clock, AlertTriangle, Search, ShieldAlert, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { ConfirmButton } from '@/components/common';

export const CoverageApprovalsPage: React.FC = () => {
  const { encounters, approveHmoFinalLoa, openDossierDrawer, printDocument } = useMedCore();
  const [isVerifying, setIsVerifying] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPayer, setFilterPayer] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  };

  const triggerBatchVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
    }, 1200);
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
      return pName.includes(q) || card.includes(q) || code.includes(q) || room.includes(q);
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
          <button
            onClick={handlePrintRoster}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5"
            title="Print Coverage Approvals Roster"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Roster</span>
          </button>

          <button
            onClick={triggerBatchVerification}
            disabled={isVerifying}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Pinging payer gateways...' : 'Ping All Payer Gateways'}</span>
          </button>
        </div>
      </div>

      {/* Gateway Status Strip */}
      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs text-slate-600 shrink-0">
        {hmoGateways.map((g) => (
          <div key={g.name} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 text-xs truncate">{g.name}</div>
              <div className="text-slate-400 font-mono text-[10px]">{g.latency} · {g.successRate}</div>
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
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search patient, card, approval code..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-60 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <button
                onClick={() => {
                  setFilterStatus('ALL');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors font-semibold text-xs ${
                  filterStatus === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Cases ({encounters.length})
              </button>
              <button
                onClick={() => {
                  setFilterStatus('APPROVED');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors font-semibold text-xs flex items-center gap-1.5 ${
                  filterStatus === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <span>✓ Approved ({approvedCount})</span>
              </button>
              <button
                onClick={() => {
                  setFilterStatus('AWAITING');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors font-semibold text-xs flex items-center gap-1.5 ${
                  filterStatus === 'AWAITING'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <span>● Awaiting Code ({awaitingCount})</span>
              </button>
              <button
                onClick={() => {
                  setFilterStatus('DISALLOWED');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors font-semibold text-xs flex items-center gap-1.5 ${
                  filterStatus === 'DISALLOWED'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <span>! Disallowed Supplies ({disallowedCount})</span>
              </button>
              <button
                onClick={() => {
                  setFilterStatus('PENDING');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors font-semibold text-xs ${
                  filterStatus === 'PENDING'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Draft / Pending ({pendingCount})
              </button>
            </div>

            {/* Payer Dropdown Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Payer:</span>
              <select
                value={filterPayer}
                onChange={(e) => {
                  setFilterPayer(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs"
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
              </select>
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
                        <button
                          type="button"
                          onClick={() => openDossierDrawer(enc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs shrink-0"
                          title="Open Case Dossier and Review LOA"
                        >
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                          <span>View LOA</span>
                        </button>

                        {/* Primary Approval Action or Approved Status */}
                        {!isApproved ? (
                          <ConfirmButton
                            label="Approve"
                            modalTitle="Approve HMO LOA Coverage?"
                            modalDescription={`This will approve and lock the ${enc.hmo.providerName || enc.hmo.hmoName} electronic Letter of Authorization (eLOA) for ${pName}, enabling final discharge clearance.`}
                            confirmLabel="Approve LOA"
                            variant="success"
                            confirmVariant="success"
                            size="xs"
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
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={(e) => {
                e.preventDefault();
                handlePageChange(Math.max(1, safeCurrentPage - 1));
              }}
              aria-label="Navigate to previous patients"
              title="Navigate to previous patients"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 shadow-2xs transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="font-bold text-slate-900 px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={(e) => {
                e.preventDefault();
                handlePageChange(Math.min(totalPages, safeCurrentPage + 1));
              }}
              aria-label="Navigate to next patients"
              title="Navigate to next patients"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed font-bold shadow-2xs transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CoverageApprovalsView = CoverageApprovalsPage;
