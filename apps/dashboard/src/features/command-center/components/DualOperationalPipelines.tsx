import React, { useState, useEffect } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp } from '@/utils/formatters';
import { CheckCircle2, ArrowRight, HelpCircle, FileText, ChevronRight } from 'lucide-react';
import { ConfirmButton, Button } from '@/components/common';

interface DualOperationalPipelinesProps {
  onViewAllPayer?: () => void;
  onViewAllExceptions?: () => void;
}

export const DualOperationalPipelines: React.FC<DualOperationalPipelinesProps> = ({
  onViewAllPayer,
  onViewAllExceptions
}) => {
  const { searchQuery,
    encounters,
    approveHmoFinalLoa,
    supervisoryWaiveItem,
    openPromissoryModal,
    selectEncounter,
    openWhyDoIOweThis,
    setActiveRoute
  } = useMedCore();

  // Search & Pagination States
  const payerSearch = searchQuery;
  const [payerPage, setPayerPage] = useState(1);
  const payerPageSize = 10;

  const exceptionsSearch = searchQuery;
  const [exceptionsPage, setExceptionsPage] = useState(1);
  const exceptionsPageSize = 8;

  // Selected row state for Unresolved Exceptions to dock contextual actions
  const [selectedExceptionKey, setSelectedExceptionKey] = useState<string | null>(null);

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

  // Currently active selected exception
  const activeSelectedException =
    (selectedExceptionKey && filteredExceptions.find((i) => `${i.encounterId}-${i.id}` === selectedExceptionKey)) ||
    filteredExceptions[0] ||
    null;

  useEffect(()=>{ setPayerPage(1); setExceptionsPage(1); }, [searchQuery]);
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


                <Button
                  size="sm"
                  variant="ghost"
                  iconPosition="right"
                  icon={ArrowRight}
                  className="text-blue-600 hover:text-blue-800"
                  onClick={onViewAllPayer || (() => setActiveRoute('COVERAGE_APPROVALS'))}
                >
                  All ({encounters.length})
                </Button>
              </div>
            </div>

            {/* Table Header */}
            <div className="pb-2 pt-0.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span>Patient &amp; Bed</span>
                <span className="text-slate-300">·</span>
                <span>Payer &amp; Coverage</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Status</span>
                <span className="w-20 text-right">Action</span>
              </div>
            </div>

            {/* Paginated Rows Container */}
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
                      onClick={() => selectEncounter(enc.id)}
                      className="min-h-[46px] px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/90 flex items-center justify-between text-xs transition-colors shrink-0 shadow-2xs cursor-pointer"
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
                        {isApproved ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        ) : (
                          <ConfirmButton
                            label="Approve LOA"
                            modalTitle="Approve HMO LOA Coverage?"
                            modalDescription={`This will approve and lock the ${enc.hmo.providerName || enc.hmo.hmoName} electronic Letter of Authorization (eLOA) for ${pName}.`}
                            confirmLabel="Approve LOA"
                            variant="success"
                            confirmVariant="success"
                            size="sm"
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
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={safePayerPage <= 1}
                onClick={() => setPayerPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="font-semibold text-slate-800 px-1 text-xs">
                Page {safePayerPage} of {totalPayerPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={safePayerPage >= totalPayerPages}
                onClick={() => setPayerPage((p) => Math.min(totalPayerPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Right Pipeline: Unresolved Billing Exceptions (Clean Row Selection + Anchored Action Dock) */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col min-h-0 overflow-hidden justify-between">
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Card Header with Search Input */}
            <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-slate-100 mb-2 gap-2 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Unresolved Billing Exceptions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select an exception to review rationale, waive courtesy, or issue promissory note
                </p>
              </div>

              <div className="flex items-center gap-2">


                <Button
                  size="sm"
                  variant="ghost"
                  iconPosition="right"
                  icon={ArrowRight}
                  className="text-blue-600 hover:text-blue-800"
                  onClick={onViewAllExceptions || (() => setActiveRoute('DISPUTES_EXCEPTIONS'))}
                >
                  All ({allDisputedItems.length})
                </Button>
              </div>
            </div>

            {/* Table Header */}
            <div className="pb-2 pt-0.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span>Contested Line Item</span>
                <span className="text-slate-300">·</span>
                <span>Patient Context</span>
              </div>
              <div>
                <span>Patient Due</span>
              </div>
            </div>

            {/* Paginated Rows Container with Selection Highlighting */}
            <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
              {filteredExceptions.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-xs text-slate-400 p-6 text-center">
                  {exceptionsSearch ? `No exceptions matching "${exceptionsSearch}".` : 'Zero unresolved billing exceptions flagged.'}
                </div>
              ) : (
                paginatedExceptions.map((item) => {
                  const itemKey = `${item.encounterId}-${item.id}`;
                  const isSelected = activeSelectedException && `${activeSelectedException.encounterId}-${activeSelectedException.id}` === itemKey;

                  return (
                    <div
                      key={itemKey}
                      onClick={() => {
                        setSelectedExceptionKey(itemKey);
                        selectEncounter(item.encounterId);
                      }}
                      className={`min-h-[46px] px-3 py-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs shrink-0 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 shadow-xs ring-1 ring-blue-300'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/90 shadow-2xs'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-baseline gap-2 truncate">
                          <span className={`font-bold truncate text-xs ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                            {item.description}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {item.patientName} ({item.roomBed}) · {item.plainLanguageExplainer || item.disputeReason}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-xs font-bold text-rose-700 font-mono">
                          {formatPhp(item.patientOop)}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Anchored Selection Action Bar (Docked context actions replacing inline button sprawl) */}
            {activeSelectedException && (
              <div className="mt-2 p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 flex flex-wrap items-center justify-between gap-2 shrink-0 animate-in fade-in duration-100">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                      Selected Exception
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {activeSelectedException.description} ({formatPhp(activeSelectedException.patientOop)})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate mt-0.5">
                    Patient: <strong>{activeSelectedException.patientName}</strong> ({activeSelectedException.roomBed})
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={HelpCircle}
                    onClick={() => openWhyDoIOweThis(activeSelectedException)}
                    title="Review plain-language charge explainer"
                  >
                    Why?
                  </Button>

                  <ConfirmButton
                    label="Waive"
                    modalTitle="Waive Contested Item?"
                    modalDescription={`This will apply a supervisory courtesy credit to waive ${activeSelectedException.description} (${formatPhp(activeSelectedException.grossAmount)}), removing the patient billing hold.`}
                    confirmLabel="Waive Item"
                    variant="danger"
                    confirmVariant="danger"
                    size="sm"
                    contextInfo={[
                      { label: 'Patient', value: activeSelectedException.patientName },
                      { label: 'Item', value: activeSelectedException.description },
                      { label: 'Amount', value: formatPhp(activeSelectedException.grossAmount) }
                    ]}
                    onConfirm={() =>
                      supervisoryWaiveItem(
                        activeSelectedException.encounterId,
                        activeSelectedException.id,
                        'Supervisory courtesy discount applied to prevent discharge delay'
                      )
                    }
                    title="Waive Contested Item"
                  />

                  <Button
                    size="sm"
                    variant="subtle"
                    icon={FileText}
                    className="text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200"
                    onClick={() => {
                      selectEncounter(activeSelectedException.encounterId);
                      openPromissoryModal(activeSelectedException.encounterId, activeSelectedException.patientOop, activeSelectedException.description);
                    }}
                    title="Issue legal promissory note for installment settlement"
                  >
                    RA 9439 Note
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer: Pagination & Exposure Summary */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <div>
              Exposure: <strong className="font-mono font-bold text-rose-700">{formatPhp(totalContestedAmount)}</strong> ({allDisputedItems.length} active exceptions)
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={safeExceptionsPage <= 1}
                onClick={() => setExceptionsPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="font-semibold text-slate-800 px-1 text-xs">
                Page {safeExceptionsPage} of {totalExceptionsPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={safeExceptionsPage >= totalExceptionsPages}
                onClick={() => setExceptionsPage((p) => Math.min(totalExceptionsPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
