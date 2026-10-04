import React from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import {
  Stethoscope,
  Pill,
  Shield,
  FileCheck,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export const DepartmentTurnaroundBottleneckChart: React.FC = () => {
  const { encounters } = useMedCore();

  // Compute live active bottlenecks across encounters
  const doctorPfCount = encounters.filter(
    (e) => e.stage === 'DOCTOR_PF_PENDING' || !e.doctorSignedAt
  ).length;

  const pharmacyRtsCount = encounters.filter(
    (e) => e.stage === 'PHARMACY_RTS_AUDIT' || !e.pharmacyRtsCleared
  ).length;

  const hmoLoaCount = encounters.filter(
    (e) => e.hmo.finalLoaStatus === 'PENDING_SUBMISSION' || e.hmo.finalLoaStatus === 'AWAITING_CODE'
  ).length;

  const philhealthCf4Count = encounters.filter(
    (e) => e.philhealth.rthRiskScore > 0.4 || !e.philhealth.cf4LabsConsistent
  ).length;

  const nursingCount = encounters.filter((e) => e.stage === 'MGH_DECLARED').length;

  const bottlenecks = [
    {
      name: 'HMO Electronic Final LOA Adjudication',
      department: 'HMO & Managed Care Liaison',
      icon: Shield,
      targetTat: 20,
      actualTat: 52,
      activeQueueCount: hmoLoaCount,
      benchmarkRatio: '260%',
      status: 'CRITICAL',
      color: 'bg-rose-500',
      badgeColor: 'bg-rose-100 text-rose-800'
    },
    {
      name: 'Attending Doctor Professional Fee Sign-Off',
      department: 'Clinical Medical Staff',
      icon: Stethoscope,
      targetTat: 15,
      actualTat: 38,
      activeQueueCount: doctorPfCount,
      benchmarkRatio: '253%',
      status: 'ELEVATED',
      color: 'bg-amber-500',
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      name: 'Central Pharmacy Return-to-Stock (RTS)',
      department: 'Pharmacy Services',
      icon: Pill,
      targetTat: 12,
      actualTat: 26,
      activeQueueCount: pharmacyRtsCount,
      benchmarkRatio: '216%',
      status: 'ELEVATED',
      color: 'bg-amber-500',
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      name: 'Nursing Station Bedside Chart Discharge',
      department: 'Inpatient Nursing Wards',
      icon: Activity,
      targetTat: 10,
      actualTat: 18,
      activeQueueCount: nursingCount,
      benchmarkRatio: '180%',
      status: 'MODERATE',
      color: 'bg-blue-500',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      name: 'PhilHealth CF4 Clinical Abstract Scrub',
      department: 'Billing & Medical Records (HIM)',
      icon: FileCheck,
      targetTat: 8,
      actualTat: 11,
      activeQueueCount: philhealthCf4Count,
      benchmarkRatio: '137%',
      status: 'OPTIMAL',
      color: 'bg-emerald-500',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    }
  ];

  return (
    <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900">
              Department Discharge Turnaround Bottleneck Radar
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Live SLA Tracking
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational turnaround time (TAT in minutes) vs hospital standard 45-minute discharge milestone benchmark.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            45m SLA Target
          </span>
          <span className="text-xs font-semibold text-slate-700">
            Target TAT ≤ 15m / stage
          </span>
        </div>
      </div>

      {/* Bottleneck Department Bar Chart */}
      <div className="space-y-3.5 pt-1">
        {bottlenecks.map((item) => {
          const Icon = item.icon;
          const maxScale = 60; // 60 mins scale
          const targetWidthPct = Math.min(100, (item.targetTat / maxScale) * 100);
          const actualWidthPct = Math.min(100, (item.actualTat / maxScale) * 100);

          return (
            <div key={item.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="font-bold text-slate-900 truncate block">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate block">
                      {item.department}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-500">
                    Target: <strong>{item.targetTat}m</strong>
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    Actual: {item.actualTat}m
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.activeQueueCount} Active
                  </span>
                </div>
              </div>

              {/* Comparative Progress Bar */}
              <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                {/* Target Benchmark Marker */}
                <div
                  style={{ width: `${targetWidthPct}%` }}
                  className="absolute top-0 bottom-0 border-r-2 border-slate-400 z-10"
                  title={`Target: ${item.targetTat} mins`}
                />
                {/* Actual TAT Bar */}
                <div
                  style={{ width: `${actualWidthPct}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${item.color}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend & Compliance Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Optimal (≤15m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Elevated (16–40m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Bottleneck (&gt;40m)</span>
          </div>
        </div>

        <span className="text-slate-400 text-[11px]">
          PhilHealth Circular 2024-0037 &amp; RA 9439 Streamlined Workflow
        </span>
      </div>
    </div>
  );
};
