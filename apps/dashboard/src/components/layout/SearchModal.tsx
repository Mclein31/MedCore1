import { ViewportOverlay } from '@/components/common/ViewportOverlay';
import React, { useState, useEffect, useRef } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { Search, User, Bed, Shield, CornerDownLeft, Sparkles } from 'lucide-react';
import { formatPeso } from '@/utils/formatters';

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
      title: 'AI Claims Scrubber: Pre-flight audit CF4 narratives & eSOA XML for RTH risk',
      action: () => {
        setActiveRoute('CLAIMS_ESOA');
        closeSearchModal();
      },
      category: 'AI Assistant'
    },
    {
      title: 'AI HMO Appeal Drafter: Medico-legal appeal for denied consumables (RA 11765)',
      action: () => {
        setActiveRoute('DISPUTES_EXCEPTIONS');
        closeSearchModal();
      },
      category: 'AI Assistant'
    },
    {
      title: 'AI Executive Briefing: View 3-minute RCM dwell time & trapped capital telemetry',
      action: () => {
        setActiveRoute('COMMAND_CENTER');
        closeSearchModal();
      },
      category: 'AI Assistant'
    },
    {
      title: 'AI Coverage Verification: Adjudicate PhilHealth PEC & commercial HMO eLOA',
      action: () => {
        setActiveRoute('COVERAGE_APPROVALS');
        closeSearchModal();
      },
      category: 'AI Assistant'
    },
    {
      title: 'Navigate to Inpatient Encounters & Ledgers',
      action: () => {
        setActiveRoute('ENCOUNTERS_LEDGER');
        closeSearchModal();
      },
      category: 'Navigation'
    },
    {
      title: 'Open Disputes, Exceptions & Promissory Desk',
      action: () => {
        setActiveRoute('DISPUTES_EXCEPTIONS');
        closeSearchModal();
      },
      category: 'Workflow'
    },
    {
      title: 'Switch View to Hospital CFO / Executive RCM',
      action: () => {
        setActiveRole('HOSPITAL_CFO');
        closeSearchModal();
      },
      category: 'Role'
    }
  ].filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));

  const visibleEncounters = matchingEncounters.slice(0, 15);
  const totalResults = visibleEncounters.length + commandSuggestions.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalResults));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + Math.max(1, totalResults)) % Math.max(1, totalResults));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < visibleEncounters.length) {
        const item = visibleEncounters[selectedIndex];
        selectEncounter(item.id);
        closeSearchModal();
      } else {
        const cmd = commandSuggestions[selectedIndex - visibleEncounters.length];
        if (cmd) cmd.action();
      }
    }
  };

  return (
    <ViewportOverlay
      className="flex items-start justify-center pt-20 px-4" backdropClassName="bg-slate-900/40 backdrop-blur-xs" motion="rise" layer="modal"
      onDismiss={closeSearchModal}
    >
      <div
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 gap-3 bg-white">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search patient, MRN, encounter, doctor, or command..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-xs text-slate-500 bg-slate-100 rounded border border-slate-200 font-mono">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto overscroll-contain p-2 divide-y divide-slate-100">
          {/* Encounters Section */}
          {matchingEncounters.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Matching Inpatient Encounters ({matchingEncounters.length})
              </div>
              {visibleEncounters.map((enc, idx) => {
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
                        ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-200'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{pName}</span>
                          <span className="text-xs font-mono text-slate-500">{enc.encounterNumber}</span>
                          <span className="text-xs text-slate-500 font-medium">
                            · {enc.stage.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Bed className="w-3.5 h-3.5 text-slate-400" />
                            {rBed} ({rType})
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-slate-400" />
                            {hName}
                          </span>
                          <span>·</span>
                          <span className="truncate max-w-[200px]">{diag}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <div className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                        {formatPeso(enc.waterfall.netPatientDue)}
                      </div>
                      <div className="text-xs text-slate-500">Net Due</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Commands Section */}
          {commandSuggestions.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Quick Actions & System Commands
              </div>
              {commandSuggestions.map((cmd, idx) => {
                const realIdx = matchingEncounters.length + idx;
                const isSelected = realIdx === selectedIndex;
                return (
                  <button
                    key={cmd.title}
                    onClick={cmd.action}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-200'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{cmd.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">
                        {cmd.category}
                      </span>
                      <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {totalResults === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              No matching encounters or commands found for &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between px-4">
          <div className="flex items-center gap-4 font-medium">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <div className="text-slate-400 font-medium">
            MedCore Directory
          </div>
        </div>
      </div>
    </ViewportOverlay>
  );
};
