import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp } from '@/utils/formatters';
import { CheckCircle2, Clock, ArrowRight, Search } from 'lucide-react';

export const DualOperationalPipelines: React.FC = () => {
  const {
    encounters,
    approveHmoFinalLoa,
    supervisoryWaiveItem,
    openPromissoryModal,
    selectEncounter,
    openWhyDoIOweThis,
    setActiveRoute
  } = useMedCore();

  // Search & Pagination States (Expanded page sizes to maximize viewport space)
  const [payerSearch, setPayerSearch] = useState('');
  const [payerPage, setPayerPage] = useState(1);
  const payerPageSize = 11;

  const [exceptionsSearch, setExceptionsSearch] = useState('');
  const [exceptionsPage, setExceptionsPage] = useState(1);
  const exceptionsPageSize = 8;

  // Active contested line items across all encounters (excluding waived)
  const allDisputedItems = encounters.flatMap((enc) =>
    enc.items
      .filter(
        (it) =>
          (it.status === 'CONTESTED' || it.isDisputed) &&
          it.status !== 'SUPERVISORY_WAIVED' &&
          it.status !== 'WAIVED'
      )
      .map((it) => ({
        ...it,
        encounterId: enc.id,
        patientName: enc.patient.fullName || enc.patient.maskedName,
        roomBed: enc.roomBed
      }))
  );

  const totalContestedAmount = allDisputedItems.reduce(
    (sum, it) => sum + (it.patientOop || 0),
    0
  );

  // Left Pipeline: Payer Coverage Search & Pagination
  const filteredPayerEncounters = encounters.filter((enc) => {
    if (!payerSearch.trim()) return true;
    const q = payerSearch.toLowerCase();
    const pName = (enc.patient.fullName || enc.patient.maskedName || '').toLowerCase();
    const room = (enc.roomBed || '').toLowerCase();
    const hmo = (enc.hmo.hmoName || enc.hmo.providerName || '').toLowerCase();
    const status = enc.hmo.finalLoaStatus.toLowerCase();
    return pName.includes(q) || room.includes(q) || hmo.includes(q) || status.includes(q);
  });

  const totalPayerPages = Math.max(1, Math.ceil(filteredPayerEncounters.length / payerPageSize));
  const safePayerPage = Math.min(payerPage, totalPayerPages);
  const paginatedPayerEncounters = filteredPayerEncounters.slice(
    (safePayerPage - 1) * payerPageSize,
    safePayerPage * payerPageSize
  );

  // Right Pipeline: Unresolved Exceptions Search & Pagination
  const filteredExceptions = allDisputedItems.filter((item) => {
    if (!exceptionsSearch.trim()) return true;
    const q = exceptionsSearch.toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const pName = (item.patientName || '').toLowerCase();
    const room = (item.roomBed || '').toLowerCase();
    const reason = (item.plainLanguageExplainer || item.disputeReason || '').toLowerCase();
    return desc.includes(q) || pName.includes(q) || room.includes(q) || reason.includes(q);
  });

  const totalExceptionsPages = Math.max(1, Math.ceil(filteredExceptions.length / exceptionsPageSize));
  const safeExceptionsPage = Math.min(exceptionsPage, totalExceptionsPages);
  const paginatedExceptions = filteredExceptions.slice(
    (safeExceptionsPage - 1) * exceptionsPageSize,
    safeExceptionsPage * exceptionsPageSize
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Dual Operational Watch: Payer Coverage &amp; Billing Dispute Queues
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time electronic LOA adjudication status and contested charges preventing clearance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Pipeline: Payer Coverage & Authorizations (Expanded 11 Rows + Enlarged Elements) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col">
            {/* Card Header with Search Input */}
            <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-100 mb-3 gap-2 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Payer Coverage &amp; Authorizations
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Commercial HMO and PhilHealth real-time adjudication status
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search patient, bed, HMO..."
                    value={payerSearch}
                    onChange={(e) => {
                      setPayerSearch(e.target.value);
                      setPayerPage(1);
                    }}
                    className="pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-56 text-slate-800 placeholder-slate-400 shadow-2xs"
                  />
                </div>

                <button
                  onClick={() => setActiveRoute('COVERAGE_APPROVALS')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors shrink-0"
                >
                  <span>All ({encounters.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="pb-3 pt-0.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span>Patient &amp; Bed</span>
                <span className="text-slate-300">·</span>
                <span>Payer &amp; Benefit Coverage</span>
              </div>
              <div className="flex items-center gap-8">
                <span>Adjudication</span>
                <span className="w-20 text-left">Action</span>
              </div>
            </div>

            {/* Paginated Rows Container (Expanded element sizes & fonts) */}
            <div className="space-y-2.5 flex-1 min-h-[730px]">
              {filteredPayerEncounters.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-slate-400 p-8 text-center">
                  {payerSearch ? `No authorizations matching "${payerSearch}".` : 'Zero active authorizations.'}
                </div>
              ) : (
                paginatedPayerEncounters.map((enc) => {
                  const isApproved = enc.hmo.finalLoaStatus === 'APPROVED';
                  const pName = enc.patient.fullName || enc.patient.maskedName;

                  return (
                    <div
                      key={enc.id}
                      className="h-[60px] px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/90 flex items-center justify-between text-sm transition-colors shrink-0 shadow-2xs"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-bold text-slate-900 text-base truncate flex items-center gap-2">
                          <span>{pName}</span>
                          <span className="text-xs text-slate-500 font-mono font-normal">
                            {enc.roomBed}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-600 mt-0.5 truncate">
                          {enc.hmo.hmoName || enc.hmo.providerName} · LOA: <strong className="font-mono text-slate-900 font-bold">{formatPhp(enc.hmo.approvedAmount)}</strong> · PhilHealth: <strong className="font-mono text-slate-900 font-bold">{formatPhp(enc.philhealth.totalCaseRate)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          {isApproved ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1.5 text-xs bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold flex items-center gap-1.5 text-xs bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span>Awaiting</span>
                            </span>
                          )}
                        </div>

                        {!isApproved && (
                          <button
                            onClick={() => approveHmoFinalLoa(enc.id)}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer with Previous / Next Controls */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm text-slate-600 shrink-0">
            <div>
              Showing <strong className="text-slate-900">{filteredPayerEncounters.length === 0 ? 0 : ((safePayerPage - 1) * payerPageSize) + 1}</strong>–<strong className="text-slate-900">{Math.min(safePayerPage * payerPageSize, filteredPayerEncounters.length)}</strong> of <strong className="text-slate-900">{filteredPayerEncounters.length}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePayerPage <= 1}
                onClick={() => setPayerPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-800 px-1">
                Page {safePayerPage} of {totalPayerPages}
              </span>
              <button
                type="button"
                disabled={safePayerPage >= totalPayerPages}
                onClick={() => setPayerPage((p) => Math.min(totalPayerPages, p + 1))}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Right Pipeline: Unresolved Billing Exceptions (Expanded 8 Rows + Enlarged Elements) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col">
            {/* Card Header with Search Input */}
            <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-100 mb-3 gap-2 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Unresolved Billing Exceptions
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Contested items, supply exclusions, and excess professional fees
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search exceptions, patient..."
                    value={exceptionsSearch}
                    onChange={(e) => {
                      setExceptionsSearch(e.target.value);
                      setExceptionsPage(1);
                    }}
                    className="pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-56 text-slate-800 placeholder-slate-400 shadow-2xs"
                  />
                </div>

                <button
                  onClick={() => setActiveRoute('DISPUTES_EXCEPTIONS')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors shrink-0"
                >
                  <span>All ({allDisputedItems.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="pb-3 pt-0.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span>Contested Charge</span>
                <span className="text-slate-300">·</span>
                <span>Patient Context</span>
              </div>
              <div className="flex items-center gap-6">
                <span>Supervisory Actions</span>
              </div>
            </div>

            {/* Paginated Rows Container (Expanded element sizes & fonts) */}
            <div className="space-y-2.5 flex-1 min-h-[536px]">
              {filteredExceptions.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-slate-400 p-8 text-center">
                  {exceptionsSearch ? `No exceptions matching "${exceptionsSearch}".` : 'Zero unresolved billing exceptions flagged.'}
                </div>
              ) : (
                paginatedExceptions.map((item) => (
                  <div
                    key={`${item.encounterId}-${item.id}`}
                    className="h-[60px] px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/90 flex items-center justify-between text-sm transition-colors shrink-0 shadow-2xs"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-baseline gap-2 truncate">
                        <span className="font-bold text-slate-900 truncate text-base">
                          {item.description}
                        </span>
                        <span className="text-base font-bold text-rose-700 font-mono shrink-0">
                          {formatPhp(item.patientOop)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {item.patientName} ({item.roomBed}) · {item.plainLanguageExplainer || item.disputeReason}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openWhyDoIOweThis(item)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                      >
                        Why?
                      </button>
                      <button
                        onClick={() =>
                          supervisoryWaiveItem(
                            item.encounterId,
                            item.id,
                            'Supervisory courtesy discount applied to prevent discharge delay'
                          )
                        }
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                      >
                        Waive
                      </button>
                      <button
                        onClick={() => {
                          selectEncounter(item.encounterId);
                          openPromissoryModal(item.encounterId, item.patientOop, item.description);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-colors"
                      >
                        Promissory
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer: Previous / Next Navigation + Statutory Compliance & Exposure Banner */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col gap-3 shrink-0">
            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600">
              <div>
                Showing <strong className="text-slate-900">{filteredExceptions.length === 0 ? 0 : ((safeExceptionsPage - 1) * exceptionsPageSize) + 1}</strong>–<strong className="text-slate-900">{Math.min(safeExceptionsPage * exceptionsPageSize, filteredExceptions.length)}</strong> of <strong className="text-slate-900">{filteredExceptions.length}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safeExceptionsPage <= 1}
                  onClick={() => setExceptionsPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
                >
                  Previous
                </button>
                <span className="font-semibold text-slate-800 px-1">
                  Page {safeExceptionsPage} of {totalExceptionsPages}
                </span>
                <button
                  type="button"
                  disabled={safeExceptionsPage >= totalExceptionsPages}
                  onClick={() => setExceptionsPage((p) => Math.min(totalExceptionsPages, p + 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Exposure Card (Enlarged padding and text) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-2xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Total Contested Exposure:
                  </span>
                  <span className="font-mono font-bold text-base text-rose-700">
                    {formatPhp(totalContestedAmount)}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({allDisputedItems.length} active exceptions)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-rose-800 bg-rose-100/90 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">RA 9439 Compliance:</strong> Contested items can be supervisory-waived or guaranteed under a statutory 0% interest promissory note to unblock patient discharge without detention delay.
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Statutory Mandate: RA 9439 &amp; RA 9994</span>
                <button
                  onClick={() => setActiveRoute('DISPUTES_EXCEPTIONS')}
                  className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                >
                  <span>Open Disputes Desk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
