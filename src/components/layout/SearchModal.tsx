import React, { useState, useEffect, useRef } from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { Search, User, Bed, Shield, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';
import { formatPeso } from '../../utils/formatters';

export const SearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    closeSearchModal,
    encounters,
    selectEncounter,
    setActiveRoute,
    setActiveRole
  } = useMedCore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isSearchModalOpen]);

  if (!isSearchModalOpen) return null;

  // Filter encounters
  const matchingEncounters = encounters.filter((e) => {
    const q = query.toLowerCase();
    const name = (e.patient.fullName || e.patient.maskedName || '').toLowerCase();
    const pin = (e.patient.pin || e.patient.philhealthPin || '').toLowerCase();
    const encNum = (e.encounterNumber || '').toLowerCase();
    const bed = (e.bedNumber || e.roomBed || '').toLowerCase();
    const doc = (typeof e.attendingDoctor === 'string' ? e.attendingDoctor : '').toLowerCase();
    const diag = (e.primaryDiagnosis || e.philhealth.primaryDescription || '').toLowerCase();
    const hmo = (e.hmo.hmoName || e.hmo.providerName || '').toLowerCase();

    return (
      name.includes(q) ||
      pin.includes(q) ||
      encNum.includes(q) ||
      bed.includes(q) ||
      doc.includes(q) ||
      diag.includes(q) ||
      hmo.includes(q)
    );
  });

  // System command suggestions
  const commandSuggestions = [
    {
      title: 'Navigate to Tripartite Reconcile Ledger',
      action: () => {
        setActiveRoute('RECONCILE');
        closeSearchModal();
      },
      category: 'NAVIGATION'
    },
    {
      title: 'Open Dispute Desk (Unsettled Items)',
      action: () => {
        setActiveRoute('DISPUTE_DESK');
        closeSearchModal();
      },
      category: 'WORKFLOW'
    },
    {
      title: 'Switch View to Hospital CFO / Executive RCM',
      action: () => {
        setActiveRole('HOSPITAL_CFO');
        closeSearchModal();
      },
      category: 'ROLE'
    },
    {
      title: 'Simulate Mobile Patient Clarify Portal',
      action: () => {
        setActiveRoute('PATIENT_CLARIFY');
        closeSearchModal();
      },
      category: 'PREVIEW'
    }
  ].filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));

  const totalResults = matchingEncounters.length + commandSuggestions.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalResults));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + Math.max(1, totalResults)) % Math.max(1, totalResults));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < matchingEncounters.length) {
        const item = matchingEncounters[selectedIndex];
        selectEncounter(item.id);
        closeSearchModal();
      } else {
        const cmd = commandSuggestions[selectedIndex - matchingEncounters.length];
        if (cmd) cmd.action();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={closeSearchModal}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type patient name, PIN, MRN, HMO, doctor, or command..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {/* Encounters Section */}
          {matchingEncounters.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-[10px] font-mono font-semibold uppercase text-slate-400 tracking-wider">
                Matching Inpatient Encounters ({matchingEncounters.length})
              </div>
              {matchingEncounters.map((enc, idx) => {
                const isSelected = idx === selectedIndex;
                const pName = enc.patient.fullName || enc.patient.maskedName;
                const rBed = enc.bedNumber || enc.roomBed;
                const rType = enc.roomType || enc.roomCategory.replace(/_/g, ' ');
                const hName = enc.hmo.hmoName || enc.hmo.providerName;
                const diag = enc.primaryDiagnosis || enc.philhealth.primaryDescription;

                return (
                  <button
                    key={enc.id}
                    onClick={() => {
                      selectEncounter(enc.id);
                      closeSearchModal();
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-sky-500/10 text-sky-900 dark:text-sky-200 border border-sky-500/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{pName}</span>
                          <span className="text-[11px] font-mono text-slate-400">{enc.encounterNumber}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                            {enc.stage.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Bed className="w-3 h-3" />
                            {rBed} ({rType})
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {hName}
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-[180px]">{diag}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatPeso(enc.waterfall.netPatientDue)}
                      </div>
                      <div className="text-[10px] text-slate-400">Net Due</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Commands Section */}
          {commandSuggestions.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-[10px] font-mono font-semibold uppercase text-slate-400 tracking-wider">
                Quick Actions & System Commands
              </div>
              {commandSuggestions.map((cmd, idx) => {
                const realIdx = matchingEncounters.length + idx;
                const isSelected = realIdx === selectedIndex;
                return (
                  <button
                    key={cmd.title}
                    onClick={cmd.action}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                      isSelected
                        ? 'bg-sky-500/10 text-sky-900 dark:text-sky-200 border border-sky-500/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                      <span>{cmd.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {cmd.category}
                      </span>
                      <CornerDownLeft className="w-3 h-3 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {totalResults === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching encounters or commands found for &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-[11px] text-slate-500 flex items-center justify-between px-4 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="text-[10px] text-slate-400">
            MedCore FastSearch™ Index
          </div>
        </div>
      </div>
    </div>
  );
};
