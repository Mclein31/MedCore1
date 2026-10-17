import { CreditCard } from '@/v1/components/common/SolarIcons';
import { formatPhp } from '@/v1/utils/formatters';
import type { PatientOopDrivers } from '@/v1/utils/rcmAnalyticsCalculations';
import React from 'react';

interface PatientOopDriverCardProps {
  oopData: PatientOopDrivers;
}

export const PatientOopDriverCard: React.FC<PatientOopDriverCardProps> = ({ oopData }) => {
  const {
    totalNetPatientDue,
    roomUpgradeAmount,
    roomUpgradePercent,
    disallowedConsumablesAmount,
    disallowedConsumablesPercent,
    doctorExcessPfAmount,
    doctorExcessPfPercent,
    paymentRailMix,
  } = oopData;

  const drivers = [
    {
      label: 'Room Upgrade Tariff Differentials',
      description: 'Daily accommodation rate exceeding accredited HMO allowance',
      amount: roomUpgradeAmount,
      percent: roomUpgradePercent,
      color: 'bg-amber-500',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      label: 'Disallowed Ward Consumables',
      description: 'Non-covered central supplies under HMO Schedule B exclusions',
      amount: disallowedConsumablesAmount,
      percent: disallowedConsumablesPercent,
      color: 'bg-rose-500',
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    },
    {
      label: 'Doctor Excess Professional Fees',
      description: 'Physician fees billed above third-party accredited ceilings',
      amount: doctorExcessPfAmount,
      percent: doctorExcessPfPercent,
      color: 'bg-purple-500',
      badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    },
  ];

  return (
    <div className="h-full min-w-0 p-6 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-5 print:block print:space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-slate-900">
            Patient Out-of-Pocket (OOP) 3-Driver Decomposition
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Breakdown of residual household liabilities following statutory and HMO deductions.
          </p>
        </div>

        <div className="text-left font-mono">
          <div className="text-xs text-slate-400 font-sans">Total Patient Responsibility</div>
          <div className="text-xl font-bold text-slate-900">{formatPhp(totalNetPatientDue)}</div>
        </div>
      </div>

      {/* 3 Drivers Stacked Bar & List */}
      <div className="flex flex-col gap-3 xl:flex-1 print:block print:space-y-3">
        <div className="h-3 shrink-0 w-full rounded-full bg-slate-100 flex overflow-hidden">
          <div
            style={{ width: `${roomUpgradePercent}%` }}
            className="h-full bg-amber-500"
            title={`Room Upgrade: ${roomUpgradePercent}%`}
          />
          <div
            style={{ width: `${disallowedConsumablesPercent}%` }}
            className="h-full bg-rose-500"
            title={`Disallowed Consumables: ${disallowedConsumablesPercent}%`}
          />
          <div
            style={{ width: `${doctorExcessPfPercent}%` }}
            className="h-full bg-purple-500"
            title={`Doctor Excess PF: ${doctorExcessPfPercent}%`}
          />
        </div>

        <div className="grid gap-2 pt-1 xl:flex-1 xl:auto-rows-fr print:block print:space-y-2">
          {drivers.map((d) => (
            <div
              key={d.label}
              className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-left"
            >
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${d.color}`} />
                  <span className="font-semibold text-slate-900">{d.label}</span>
                </div>
                <div className="text-[11px] text-slate-500">{d.description}</div>
              </div>

              <div className="text-left shrink-0">
                <div className="font-mono font-bold text-base sm:text-lg text-slate-900">
                  {formatPhp(d.amount)}
                </div>
                <div className="text-[11px] font-mono text-slate-500">{d.percent}% of balance</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Digital Payment Rail Adoption Mix */}
      <div className="shrink-0 pt-3 border-t border-slate-100 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            Digital Point-of-Sale Payment Rail Adoption
          </span>
          <span className="text-emerald-700 font-semibold text-[11px]">82.5% Digital Adoption</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {paymentRailMix.map((p) => (
            <div
              key={p.channel}
              className="p-2 rounded-lg border border-slate-200 bg-white space-y-1 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-[11px]">{p.channel}</span>
                <span className="font-mono font-bold text-blue-700 text-base">{p.percent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${p.percent}%` }} />
              </div>
              <div className="text-[10px] text-slate-400">{p.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
