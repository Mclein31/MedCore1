import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp } from '@/utils/formatters';
import { CheckCircle2, Clock, ArrowRight, Search, HelpCircle, FileText } from 'lucide-react';
import { ConfirmButton } from '@/components/common';

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
    <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 overflow-hidden space-y-2">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Dual Operational Watch: Payer Coverage &amp; Billing Dispute Queues
          </h2>
          <p className="text-xs text-slate-500">
            Real-time electronic LOA adjudication status and contested charges preventing clearance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0 overflow-hidden items-stretch">
        {/* Left Pipeline: Payer Coverage & Authorizations */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col min-h-0 overflow-hidden justify-between">
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Card Header with Search Input */}
            <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-slate-100 mb-2 gap-2 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Payer Coverage &amp; Authorizations
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Commercial HMO and PhilHealth real-time adjudication status
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search patient, bed, HMO..."
                    value={payerSearch}
                    onChange={(e) => {
                      setPayerSearch(e.target.value);
                      setPayerPage(1);
                    }}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 text-slate-800 placeholder-slate-400 shadow-2xs"
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
            <div className="pb-2 pt-0.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span>Patient &amp; Bed</span>
                <span className="text-slate-300">·</span>
                <span>Payer &amp; Benefit Coverage</span>
              </div>
              <div className="flex items-center gap-6">
                <span>Adjudication</span>
                <span className="w-16 text-left">Action</span>
              </div>
            </div>

            {/* Paginated Rows Container (Bounded Localized Scroll) */}
            <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
              {filteredPayerEncounters.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400 p-6 text-center">
                  {payerSearch ? `No authorizations matching "${payerSearch}".` : 'Zero active authorizations.'}
                </div>
              ) : (
                paginatedPayerEncounters.map((enc) => {
                  const isApproved = enc.hmo.finalLoaStatus === 'APPROVED';
                  const pName = enc.patient.fullName || enc.patient.maskedName;

                  return (
                    <div
                      key={enc.id}
                      className="min-h-[46px] px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/90 flex items-center justify-between text-xs transition-colors shrink-0 shadow-2xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                          <span>{pName}</span>
                          <span className="text-[11px] text-slate-500 font-mono font-normal">
                            {enc.roomBed}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                          {enc.hmo.hmoName || enc.hmo.providerName} · LOA: <strong className="font-mono text-slate-900 font-bold">{formatPhp(enc.hmo.approvedAmount)}</strong> · PhilHealth: <strong className="font-mono text-slate-900 font-bold">{formatPhp(enc.philhealth.totalCaseRate)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 text-[11px] font-semibold">
                          {isApproved ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold flex items-center gap-1 text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Awaiting</span>
                            </span>
                          )}
                        </div>

                        {!isApproved && (
                          <ConfirmButton
                            label="Approve"
                            modalTitle="Approve HMO LOA Coverage?"
                            modalDescription={`This will approve and lock the ${enc.hmo.providerName || enc.hmo.hmoName} electronic Letter of Authorization (eLOA) for ${pName}.`}
                            confirmLabel="Approve LOA"
                            variant="success"
                            confirmVariant="success"
                            size="xs"
                            icon={CheckCircle2}
                            contextInfo={[
                              { label: 'Patient', value: pName },
                              { label: 'Carrier', value: enc.hmo.providerName || enc.hmo.hmoName },
                              { label: 'LOA Benefit', value: formatPhp(enc.hmo.approvedAmount) }
                            ]}
                            onConfirm={() => approveHmoFinalLoa(enc.id)}
                            title="Approve HMO Final LOA"
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer with Previous / Next Controls */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 shrink-0">
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

        {/* Right Pipeline: Unresolved Billing Exceptions */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col min-h-0 overflow-hidden justify-between">
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Card Header with Search Input */}
            <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-slate-100 mb-2 gap-2 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Unresolved Billing Exceptions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Contested items, supply exclusions, and excess professional fees
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search exceptions, patient..."
                    value={exceptionsSearch}
                    onChange={(e) => {
                      setExceptionsSearch(e.target.value);
                      setExceptionsPage(1);
                    }}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 text-slate-800 placeholder-slate-400 shadow-2xs"
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
            <div className="pb-2 pt-0.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span>Contested Charge</span>
                <span className="text-slate-300">·</span>
                <span>Patient Context</span>
              </div>
              <div className="flex items-center gap-6">
                <span>Supervisory Actions</span>
              </div>
            </div>

            {/* Paginated Rows Container (Bounded Localized Scroll) */}
            <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
              {filteredExceptions.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400 p-6 text-center">
                  {exceptionsSearch ? `No exceptions matching "${exceptionsSearch}".` : 'Zero unresolved billing exceptions flagged.'}
                </div>
              ) : (
                paginatedExceptions.map((item) => (
                  <div
                    key={`${item.encounterId}-${item.id}`}
                    className="min-h-[46px] px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/90 flex items-center justify-between text-xs transition-colors shrink-0 shadow-2xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-baseline gap-2 truncate">
                        <span className="font-bold text-slate-900 truncate text-xs">
                          {item.description}
                        </span>
                        <span className="text-xs font-bold text-rose-700 font-mono shrink-0">
                          {formatPhp(item.patientOop)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {item.patientName} ({item.roomBed}) · {item.plainLanguageExplainer || item.disputeReason}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openWhyDoIOweThis(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                        title="Review plain-language charge explainer"
                      >
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                        <span>Why?</span>
                      </button>
                      <ConfirmButton
                        label="Waive"
                        modalTitle="Waive Contested Item?"
                        modalDescription={`This will apply a supervisory courtesy credit to waive ${item.description || 'this disputed item'} (${formatPhp(item.grossAmount)}), removing the patient billing hold.`}
                        confirmLabel="Waive Item"
                        variant="danger"
                        confirmVariant="danger"
                        size="xs"
                        contextInfo={[
                          { label: 'Patient', value: item.patientName },
                          { label: 'Item', value: item.description },
                          { label: 'Amount', value: formatPhp(item.grossAmount) }
                        ]}
                        onConfirm={() =>
                          supervisoryWaiveItem(
                            item.encounterId,
                            item.id,
                            'Supervisory courtesy discount applied to prevent discharge delay'
                          )
                        }
                        title="Waive Contested Item"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          selectEncounter(item.encounterId);
                          openPromissoryModal(item.encounterId, item.patientOop, item.description);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-colors shadow-2xs"
                        title="Issue legal promissory note for installment settlement"
                      >
                        <FileText className="w-3 h-3 text-purple-600" />
                        <span>Promissory</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer: Previous / Next Navigation + Statutory Compliance & Exposure Banner */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-2 shrink-0">
            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-600">
              <div>
                Showing <strong className="text-slate-900">{filteredExceptions.length === 0 ? 0 : ((safeExceptionsPage - 1) * exceptionsPageSize) + 1}</strong>–<strong className="text-slate-900">{Math.min(safeExceptionsPage * exceptionsPageSize, filteredExceptions.length)}</strong> of <strong className="text-slate-900">{filteredExceptions.length}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeExceptionsPage <= 1}
                  onClick={() => setExceptionsPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
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
                  className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Exposure Card (Compact) */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-2xs space-y-1 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Total Contested Exposure:
                  </span>
                  <span className="font-mono font-bold text-sm text-rose-700">
                    {formatPhp(totalContestedAmount)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({allDisputedItems.length} active exceptions)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-rose-800 bg-rose-100/90 border border-rose-200 px-2 py-0.2 rounded-full">
                  Action Required
                </span>
              </div>

              <div className="text-[11px] text-slate-600 leading-snug">
                <strong className="text-slate-800">RA 9439 Compliance:</strong> Contested items can be supervisory-waived or guaranteed under a statutory 0% interest promissory note to unblock patient discharge without detention delay.
              </div>

              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Statutory Mandate: RA 9439 &amp; RA 9994</span>
                <button
                  onClick={() => setActiveRoute('DISPUTES_EXCEPTIONS')}
                  className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                >
                  <span>Open Disputes Desk</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
