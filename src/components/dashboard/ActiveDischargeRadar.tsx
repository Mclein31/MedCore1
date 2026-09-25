import React, { useState } from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { Encounter } from '../../types/domain';
import { formatPhp } from '../../utils/formatters';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  UserCheck,
  Send,
  ShieldAlert,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
  QrCode
} from 'lucide-react';

export const ActiveDischargeRadar: React.FC = () => {
  const {
    encounters,
    selectedEncounterId,
    selectEncounter,
    openDossierDrawer,
    openDoctorQuickSign,
    applyAccreditedCeiling,
    clearPharmacyRts,
    approveHmoFinalLoa,
    issueDigitalGatePass,
    openPromissoryModal,
    activeFilter,
    setActiveFilter
  } = useMedCore();

  const [filterQuery, setFilterQuery] = useState('');

  const filteredEncounters = encounters.filter((enc) => {
    // Tab filter
    if (activeFilter === 'WARNING' && enc.slaStatus !== 'WARNING') return false;
    if (activeFilter === 'BREACH' && enc.slaStatus !== 'BREACH') return false;
    if (activeFilter === 'DISPUTED') {
      const isDisp = enc.items.some((i) => i.status === 'CONTESTED' || i.isDisputed) || enc.disputes.length > 0;
      if (!isDisp) return false;
    }

    // Search query
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      const matchName = enc.patient.maskedName.toLowerCase().includes(q);
      const matchRoom = enc.roomBed.toLowerCase().includes(q);
      const matchDoctor = enc.attendingDoctor.toLowerCase().includes(q);
      const matchHmo = enc.hmo.providerName.toLowerCase().includes(q);
      const matchDiag = enc.primaryDiagnosis.toLowerCase().includes(q);
      return matchName || matchRoom || matchDoctor || matchHmo || matchDiag;
    }
    return true;
  });

  const getStageBadge = (stage: Encounter['stage']) => {
    switch (stage) {
      case 'MGH_DECLARED':
        return { label: '1/6 MGH Declared', bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' };
      case 'DOCTOR_PF_PENDING':
        return { label: '2/6 Doctor PF Pending', bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' };
      case 'PHARMACY_RTS_AUDIT':
        return { label: '3/6 Pharmacy RTS', bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20' };
      case 'HMO_FINAL_LOA':
        return { label: '4/6 HMO Final LOA', bg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20' };
      case 'PENDING_SETTLEMENT':
        return { label: '5/6 Settlement Due', bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' };
      case 'CLEARED_GATE_PASS':
        return { label: '6/6 Gate Pass Issued', bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' };
      default:
        return { label: stage, bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' };
    }
  };

  const getBottleneckInfo = (enc: Encounter) => {
    if (enc.stage === 'DOCTOR_PF_PENDING') {
      return {
        text: `PF Delay (+${enc.elapsedMinutes}m)`,
        type: 'warning',
        actionText: 'Apply Ceiling',
        onAction: (e: React.MouseEvent) => {
          e.stopPropagation();
          applyAccreditedCeiling(enc.id);
        }
      };
    }
    if (enc.stage === 'PHARMACY_RTS_AUDIT' && !enc.pharmacyRtsCleared) {
      return {
        text: `${enc.unreturnedMedsCount} Unreturned Items`,
        type: 'warning',
        actionText: 'Clear RTS',
        onAction: (e: React.MouseEvent) => {
          e.stopPropagation();
          clearPharmacyRts(enc.id);
        }
      };
    }
    if (enc.stage === 'HMO_FINAL_LOA' && enc.hmo.finalLoaStatus !== 'APPROVED') {
      return {
        text: `${enc.hmo.providerName} Portal Queue`,
        type: 'warning',
        actionText: 'Approve LOA',
        onAction: (e: React.MouseEvent) => {
          e.stopPropagation();
          approveHmoFinalLoa(enc.id);
        }
      };
    }
    if (enc.stage === 'PENDING_SETTLEMENT') {
      return {
        text: 'Patient OOP Due',
        type: 'neutral',
        actionText: 'Clear / Gate Pass',
        onAction: (e: React.MouseEvent) => {
          e.stopPropagation();
          issueDigitalGatePass(enc.id);
        }
      };
    }
    if (enc.stage === 'CLEARED_GATE_PASS') {
      return {
        text: 'Ready for Exit',
        type: 'success',
        actionText: 'View Pass',
        onAction: (e: React.MouseEvent) => {
          e.stopPropagation();
          selectEncounter(enc.id);
          issueDigitalGatePass(enc.id);
        }
      };
    }
    return {
      text: 'Routing in progress',
      type: 'neutral',
      actionText: 'Dossier',
      onAction: (e: React.MouseEvent) => {
        e.stopPropagation();
        openDossierDrawer(enc);
      }
    };
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0B1120]">
      {/* Table Subheader: Title, Filter Tabs & Search */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
              Active Discharge Radar
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            ({filteredEncounters.length} Active MGH Discharges)
          </span>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex items-center gap-2">
          {/* Quick Filter Tabs */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-0.5 rounded-md text-xs font-mono">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({encounters.length})
            </button>
            <button
              onClick={() => setActiveFilter('WARNING')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-500'
              }`}
            >
              Warning (&gt;25m)
            </button>
            <button
              onClick={() => setActiveFilter('BREACH')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === 'BREACH'
                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-500'
              }`}
            >
              Breach (&gt;40m)
            </button>
            <button
              onClick={() => setActiveFilter('DISPUTED')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === 'DISPUTED'
                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-500'
              }`}
            >
              Disputed
            </button>
          </div>

          {/* Table Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter queue..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand-blue font-mono w-44"
            />
          </div>
        </div>
      </div>

      {/* High-Density Operational Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider z-10">
            <tr>
              <th className="py-2.5 px-3">Patient &amp; Location</th>
              <th className="py-2.5 px-3">45m SLA Countdown</th>
              <th className="py-2.5 px-3">Discharge Milestone</th>
              <th className="py-2.5 px-3">Primary Bottleneck</th>
              <th className="py-2.5 px-3">Patient Due &amp; 3-Driver Breakdown</th>
              <th className="py-2.5 px-3 text-right">Instant Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
            {filteredEncounters.map((enc) => {
              const stageBadge = getStageBadge(enc.stage);
              const bottleneck = getBottleneckInfo(enc);
              const isSelected = selectedEncounterId === enc.id;

              // 45 min countdown math
              const remainingMinutes = 45 - enc.elapsedMinutes;
              const isBreached = remainingMinutes <= 0;

              return (
                <tr
                  key={enc.id}
                  onClick={() => openDossierDrawer(enc)}
                  className={`cursor-pointer transition-colors group ${
                    isSelected
                      ? 'bg-sky-50/60 dark:bg-sky-950/20'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Column 1: Patient & Room */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px] shrink-0 border border-slate-200 dark:border-slate-700">
                        {enc.roomBed.replace('Room ', '').replace('Bed ', '')}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{enc.patient.maskedName}</span>
                          {enc.patient.isSeniorCitizen && (
                            <span className="text-[10px] font-mono px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                              SC
                            </span>
                          )}
                          {enc.patient.isPwd && (
                            <span className="text-[10px] font-mono px-1 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold">
                              PWD
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {enc.encounterNumber} • {enc.hmo.providerName}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Column 2: 45m SLA Countdown */}
                  <td className="py-2.5 px-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                            isBreached
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
                              : enc.elapsedMinutes >= 25
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {isBreached
                            ? `+${Math.abs(remainingMinutes)}m OVER`
                            : `${remainingMinutes}m left`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({enc.elapsedMinutes}m elapsed)
                        </span>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-28 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isBreached
                              ? 'bg-rose-500'
                              : enc.elapsedMinutes >= 25
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (enc.elapsedMinutes / 45) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Column 3: Discharge Milestone */}
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border font-medium ${stageBadge.bg}`}
                    >
                      {stageBadge.label}
                    </span>
                  </td>

                  {/* Column 4: Primary Bottleneck */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      {bottleneck.type === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : bottleneck.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {bottleneck.text}
                      </span>
                    </div>
                  </td>

                  {/* Column 5: Patient Due & 3-Driver Breakdown */}
                  <td className="py-2.5 px-3">
                    <div>
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {formatPhp(enc.waterfall.netPatientDue)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mt-0.5">
                        {enc.waterfall.roomUpgradeExcess > 0 && (
                          <span title="Room Upgrade Differential" className="text-amber-600 dark:text-amber-400">
                            Room: {formatPhp(enc.waterfall.roomUpgradeExcess)}
                          </span>
                        )}
                        {enc.waterfall.excludedConsumables > 0 && (
                          <span title="Excluded Consumables" className="text-rose-600 dark:text-rose-400">
                            • Consumables: {formatPhp(enc.waterfall.excludedConsumables)}
                          </span>
                        )}
                        {enc.doctorExcessPf > 0 && (
                          <span title="Excess Doctor PF" className="text-purple-600 dark:text-purple-400">
                            • PF: {formatPhp(enc.doctorExcessPf)}
                          </span>
                        )}
                        {enc.waterfall.netPatientDue === 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Fully Covered (Zero OOP)
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Column 6: Instant Operational Action */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={bottleneck.onAction}
                        className="px-2.5 py-1 rounded text-[11px] font-semibold font-mono bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-white dark:bg-sky-500/10 dark:hover:bg-sky-500 dark:text-sky-400 dark:hover:text-white border border-brand-blue/20 transition-all shadow-xs"
                      >
                        {bottleneck.actionText}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDossierDrawer(enc);
                        }}
                        title="Open Slide-Over Patient Dossier"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
