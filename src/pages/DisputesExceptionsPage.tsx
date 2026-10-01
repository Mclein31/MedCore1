import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp, formatPstTimestamp } from '@/utils/formatters';
import { CheckCircle2, ShieldAlert, Search, HelpCircle, FileText } from 'lucide-react';
import { ConfirmButton } from '@/components/common';

export const DisputesExceptionsPage: React.FC = () => {
  const {
    encounters,
    openWhyDoIOweThis,
    supervisoryWaiveItem,
    openPromissoryModal,
    selectEncounter
  } = useMedCore();

  const [activeTab, setActiveTab] = useState<'CONTESTED_ITEMS' | 'PROMISSORY_REGISTER'>('CONTESTED_ITEMS');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPage, setItemsPage] = useState(1);
  const [notesPage, setNotesPage] = useState(1);
  const pageSize = 11;

  // Collect all contested items (excluding waived items)
  const disputedItems = encounters.flatMap((enc) =>
    enc.items
      .filter(
        (it) =>
          (it.status === 'CONTESTED' || it.isDisputed) &&
          it.status !== 'SUPERVISORY_WAIVED' &&
          it.status !== 'WAIVED'
      )
      .map((it) => ({
        encounterId: enc.id,
        patientName: enc.patient.fullName || enc.patient.maskedName,
        encounterNumber: enc.encounterNumber,
        roomBed: enc.roomBed,
        item: it
      }))
  );

  // Filter contested items by search query
  const filteredDisputedItems = disputedItems.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const pName = d.patientName.toLowerCase();
    const encNum = d.encounterNumber.toLowerCase();
    const room = d.roomBed.toLowerCase();
    const desc = d.item.description.toLowerCase();
    const code = (d.item.code || '').toLowerCase();
    const cat = d.item.category.toLowerCase();
    const reason = (d.item.disputeReason || d.item.plainLanguageExplainer || '').toLowerCase();
    return (
      pName.includes(q) ||
      encNum.includes(q) ||
      room.includes(q) ||
      desc.includes(q) ||
      code.includes(q) ||
      cat.includes(q) ||
      reason.includes(q)
    );
  });

  const totalItemsPages = Math.max(1, Math.ceil(filteredDisputedItems.length / pageSize));
  const safeItemsPage = Math.min(itemsPage, totalItemsPages);
  const paginatedDisputedItems = filteredDisputedItems.slice(
    (safeItemsPage - 1) * pageSize,
    safeItemsPage * pageSize
  );

  // Collect all promissory notes
  const promissoryNotes = encounters
    .filter((enc): enc is typeof enc & { promissoryNote: NonNullable<typeof enc.promissoryNote> } => Boolean(enc.promissoryNote))
    .map((enc) => ({
      ...enc.promissoryNote,
      noteNumber: enc.promissoryNote.id,
      idType: enc.promissoryNote.borrowerIdType,
      idNumber: enc.promissoryNote.borrowerIdNumber,
      monthlyAmortization: enc.promissoryNote.monthlyInstallment,
      executedAt: enc.promissoryNote.digitalSignatureTimestamp,
      patientName: enc.patient.fullName || enc.patient.maskedName,
      encounterNumber: enc.encounterNumber,
      roomBed: enc.roomBed
    }));

  // Filter promissory notes by search query
  const filteredPromissoryNotes = promissoryNotes.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const pName = (n.patientName || '').toLowerCase();
    const borrower = (n.borrowerName || '').toLowerCase();
    const noteNum = (n.noteNumber || '').toLowerCase();
    const encNum = (n.encounterNumber || '').toLowerCase();
    const room = (n.roomBed || '').toLowerCase();
    const idNum = (n.idNumber || '').toLowerCase();
    return (
      pName.includes(q) ||
      borrower.includes(q) ||
      noteNum.includes(q) ||
      encNum.includes(q) ||
      room.includes(q) ||
      idNum.includes(q)
    );
  });

  const totalNotesPages = Math.max(1, Math.ceil(filteredPromissoryNotes.length / pageSize));
  const safeNotesPage = Math.min(notesPage, totalNotesPages);
  const paginatedPromissoryNotes = filteredPromissoryNotes.slice(
    (safeNotesPage - 1) * pageSize,
    safeNotesPage * pageSize
  );

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-5 space-y-3.5 bg-slate-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Disputes, Exceptions &amp; Promissory Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisory line-item triage, courtesy waivers, and RA 9439 statutory promissory note register.
          </p>
        </div>

        {/* Tab Controls & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => {
                setActiveTab('CONTESTED_ITEMS');
                setItemsPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                activeTab === 'CONTESTED_ITEMS'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Contested items ({disputedItems.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('PROMISSORY_REGISTER');
                setNotesPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                activeTab === 'PROMISSORY_REGISTER'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              RA 9439 Promissory notes ({promissoryNotes.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={
                activeTab === 'CONTESTED_ITEMS'
                  ? 'Search patient, bed, contested item...'
                  : 'Search borrower, note number, patient...'
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setItemsPage(1);
                setNotesPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 text-slate-800 placeholder-slate-400 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Tab 1: Contested Line Items */}
      {activeTab === 'CONTESTED_ITEMS' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-sm font-bold text-slate-900">
              Active Chargemaster Disputes
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredDisputedItems.length} of {disputedItems.length} items · Supervisor review required
            </span>
          </div>

          {filteredDisputedItems.length === 0 ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 bg-white rounded-xl">
              {searchQuery ? `No contested charges matching "${searchQuery}".` : 'Zero active contested charges in current roster.'}
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="flex-1 overflow-y-auto overflow-x-auto overscroll-contain">
                <table className="w-full min-w-[900px] text-left text-sm border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-6 text-left">Patient &amp; Bed</th>
                      <th className="py-3 px-4 text-left">Contested Item</th>
                      <th className="py-3 px-4 text-left">Category</th>
                      <th className="py-3 px-4 text-left">Amount</th>
                      <th className="py-3 px-6 text-left">Context / Reason</th>
                      <th className="py-3 px-6 text-left min-w-[320px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedDisputedItems.map(({ encounterId, patientName, encounterNumber, roomBed, item }) => (
                      <tr key={`${encounterId}-${item.id}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 text-left">
                          <div className="font-semibold text-slate-900 text-sm">
                            {patientName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {encounterNumber} · {roomBed}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-left">
                          <div className="font-semibold text-slate-900 text-sm">
                            {item.description}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            Code: {item.code}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-left text-slate-600 text-xs font-medium">
                          {item.category.replace(/_/g, ' ')}
                        </td>

                        <td className="py-3.5 px-4 text-left font-mono font-bold text-rose-700 text-sm tabular-nums">
                          {formatPhp(item.patientOop)}
                        </td>

                        <td className="py-3.5 px-6 text-left text-slate-600 text-xs max-w-xs leading-relaxed">
                          {item.disputeReason || item.plainLanguageExplainer}
                        </td>

                        <td className="py-3.5 px-6 text-left whitespace-nowrap">
                          <div className="flex items-center justify-start gap-2">
                            {/* Review Action */}
                            <button
                              type="button"
                              onClick={() => openWhyDoIOweThis(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors shrink-0"
                              title="Review plain-language charge explainer"
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Why?</span>
                            </button>

                            {/* Visual Divider between Review and Interventions */}
                            <div className="h-4 w-px bg-slate-200 shrink-0" />

                            {/* Resolution Interventions */}
                            <ConfirmButton
                              label="Waive Item"
                              modalTitle="Waive Disputed Item Charges?"
                              modalDescription={`This will apply a supervisory courtesy credit to waive ${item.description} (${formatPhp(item.grossAmount)}) for ${patientName}, resolving the dispute.`}
                              confirmLabel="Waive Item"
                              variant="danger"
                              confirmVariant="danger"
                              size="xs"
                              contextInfo={[
                                { label: 'Patient', value: patientName },
                                { label: 'Disputed Item', value: item.description },
                                { label: 'Disputed Amount', value: formatPhp(item.grossAmount) }
                              ]}
                              onConfirm={() => {
                                supervisoryWaiveItem(
                                  encounterId,
                                  item.id,
                                  'Supervisory courtesy discount applied to unblock discharge'
                                );
                              }}
                              title="Apply Supervisory Courtesy Discount & Waive Item"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                selectEncounter(encounterId);
                                openPromissoryModal(encounterId, item.patientOop, item.description);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition-colors shadow-2xs shrink-0"
                              title="Issue legal promissory note for installment settlement"
                            >
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              <span>Promissory Note</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
                <div>
                  Showing <strong className="text-slate-900">{filteredDisputedItems.length === 0 ? 0 : ((safeItemsPage - 1) * pageSize) + 1}</strong> to{' '}
                  <strong className="text-slate-900">{Math.min(safeItemsPage * pageSize, filteredDisputedItems.length)}</strong> of{' '}
                  <strong className="text-slate-900">{filteredDisputedItems.length}</strong> contested items
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safeItemsPage <= 1}
                    onClick={() => setItemsPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
                  >
                    Previous
                  </button>
                  <span className="font-semibold text-slate-800 px-1">
                    Page {safeItemsPage} of {totalItemsPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeItemsPage >= totalItemsPages}
                    onClick={() => setItemsPage((p) => Math.min(totalItemsPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: RA 9439 Promissory Notes Register */}
      {activeTab === 'PROMISSORY_REGISTER' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Statutory Promissory Undertakings (RA 9439)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filteredPromissoryNotes.length} of {promissoryNotes.length} notes · Anti-Hospital Detention law compliance register.
              </p>
            </div>

            <button
              onClick={() => openPromissoryModal()}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              + Issue Promissory Note
            </button>
          </div>

          {filteredPromissoryNotes.length === 0 ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 bg-white rounded-xl">
              {searchQuery ? `No promissory notes matching "${searchQuery}".` : 'Zero promissory notes executed.'}
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="flex-1 overflow-y-auto overflow-x-auto overscroll-contain">
                <table className="w-full min-w-[900px] text-left text-sm border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-6 text-left">Note Number</th>
                      <th className="py-3 px-4 text-left">Borrower / Guarantor</th>
                      <th className="py-3 px-4 text-left">Encounter / Room</th>
                      <th className="py-3 px-4 text-left">Principal Balance</th>
                      <th className="py-3 px-4 text-left">Monthly Installment</th>
                      <th className="py-3 px-4 text-left">Terms</th>
                      <th className="py-3 px-6 text-left">Execution Date</th>
                      <th className="py-3 px-6 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPromissoryNotes.map((note) => (
                      <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-900 text-left">
                          {note.noteNumber}
                        </td>

                        <td className="py-3.5 px-4 text-left">
                          <div className="font-semibold text-slate-900 text-sm">
                            {note.borrowerName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            ID: {note.idType} ({note.idNumber})
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-left text-xs text-slate-600 font-medium">
                          {note.encounterNumber} · {note.roomBed}
                        </td>

                        <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-900 tabular-nums">
                          {formatPhp(note.principalAmount)}
                        </td>

                        <td className="py-3.5 px-4 text-left font-mono font-semibold text-slate-800 tabular-nums">
                          {formatPhp(note.monthlyAmortization)} / mo
                        </td>

                        <td className="py-3.5 px-4 text-left text-slate-600 text-xs font-medium">
                          {note.installmentMonths} Months (0% Int.)
                        </td>

                        <td className="py-3.5 px-6 text-left text-xs text-slate-500 font-mono">
                          {formatPstTimestamp(note.executedAt)}
                        </td>

                        <td className="py-3.5 px-6 text-left">
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Active Guaranteed</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
                <div>
                  Showing <strong className="text-slate-900">{filteredPromissoryNotes.length === 0 ? 0 : ((safeNotesPage - 1) * pageSize) + 1}</strong> to{' '}
                  <strong className="text-slate-900">{Math.min(safeNotesPage * pageSize, filteredPromissoryNotes.length)}</strong> of{' '}
                  <strong className="text-slate-900">{filteredPromissoryNotes.length}</strong> promissory notes
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safeNotesPage <= 1}
                    onClick={() => setNotesPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
                  >
                    Previous
                  </button>
                  <span className="font-semibold text-slate-800 px-1">
                    Page {safeNotesPage} of {totalNotesPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeNotesPage >= totalNotesPages}
                    onClick={() => setNotesPage((p) => Math.min(totalNotesPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const DisputesExceptionsView = DisputesExceptionsPage;
