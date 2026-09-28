import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp, formatPstTimestamp } from '@/utils/formatters';
import { CheckCircle2, ShieldAlert, Search } from 'lucide-react';

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
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Disputes, Exceptions &amp; Promissory Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
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
              className={`px-3.5 py-2 rounded-lg transition-colors font-semibold ${
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
              className={`px-3.5 py-2 rounded-lg transition-colors font-semibold ${
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              className="pl-9 pr-3.5 py-2 text-xs rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-72 text-slate-800 placeholder-slate-400 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Tab 1: Contested Line Items */}
      {activeTab === 'CONTESTED_ITEMS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Active Chargemaster Disputes
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredDisputedItems.length} of {disputedItems.length} items · Supervisor review required
            </span>
          </div>

          {filteredDisputedItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 bg-white rounded-xl">
              {searchQuery ? `No contested charges matching "${searchQuery}".` : 'Zero active contested charges in current roster.'}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-6 text-left border-b border-slate-200">Patient &amp; Bed</th>
                      <th className="py-3 px-4 text-left border-b border-slate-200">Contested Item</th>
                      <th className="py-3 px-4 text-left border-b border-slate-200">Category</th>
                      <th className="py-3 px-4 text-left border-b border-slate-200">Amount</th>
                      <th className="py-3 px-6 text-left border-b border-slate-200">Context / Reason</th>
                      <th className="py-3 px-6 text-left border-b border-slate-200">Actions</th>
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

                        <td className="py-3.5 px-6 text-left">
                          <div className="flex items-center justify-start gap-2">
                            <button
                              onClick={() => openWhyDoIOweThis(item)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              Why?
                            </button>
                            <button
                              onClick={() => {
                                supervisoryWaiveItem(
                                  encounterId,
                                  item.id,
                                  'Supervisory courtesy discount applied to unblock discharge'
                                );
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors"
                            >
                              Waive Item
                            </button>
                            <button
                              onClick={() => {
                                selectEncounter(encounterId);
                                openPromissoryModal(encounterId, item.patientOop, item.description);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors"
                            >
                              Promissory Note
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Statutory Promissory Undertakings (RA 9439)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filteredPromissoryNotes.length} of {promissoryNotes.length} notes · Anti-Hospital Detention law compliance register.
              </p>
            </div>

            <button
              onClick={() => openPromissoryModal()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              + Issue Promissory Note
            </button>
          </div>

          {filteredPromissoryNotes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 bg-white rounded-xl">
              {searchQuery ? `No promissory notes matching "${searchQuery}".` : 'Zero promissory notes executed.'}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-6 text-left border-b border-slate-200">Note Number</th>
                      <th className="py-3 px-4 text-left border-b border-slate-200">Borrower / Guarantor</th>
                      <th className="py-3 px-4 text-left border-b border-slate-200">Encounter / Room</th>
                      <th className="py-3 px-4 text-left border-b border-slate-200">Principal Balance</th>
                      <th className="py-3 px-4 text-left border-b border-slate-200">Monthly Installment</th>
                      <th className="py-3 px-4 text-left border-b border-slate-200">Terms</th>
                      <th className="py-3 px-6 text-left border-b border-slate-200">Execution Date</th>
                      <th className="py-3 px-6 text-left border-b border-slate-200">Status</th>
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
