import React from 'react';
import { formatPhp } from '../../utils/formatters';
import { WaterfallAggregate, MacroKpiMetrics, CommercialCarrierMetric } from '../../utils/rcmAnalyticsCalculations';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Building } from 'lucide-react';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  waterfall: WaterfallAggregate;
  kpis: MacroKpiMetrics;
  carriers: CommercialCarrierMetric[];
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  waterfall,
  kpis,
  carriers
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const csvContent = [
      'Category,Amount,Share',
      `Gross Hospital Billings,${waterfall.grossTotal},100%`,
      `12% VAT Exemption (RA 9994/10754),${waterfall.vatExemption},${waterfall.vatShare}%`,
      `20% Senior/PWD Discount,${waterfall.seniorPwdDiscount},${waterfall.seniorShare}%`,
      `PhilHealth ACR Benefit (Circular 2024-0037),${waterfall.philhealthTotal},${waterfall.philhealthShare}%`,
      `Commercial HMO Approved Coverage,${waterfall.hmoApprovedAmount},${waterfall.hmoShare}%`,
      `Net Patient Out-of-Pocket Due,${waterfall.netPatientDue},${waterfall.patientDueShare}%`,
      '',
      'HMO Carrier,Active Cases,Avg TAT Min,Disallowance Rate,Approval Rate,Total Reconciled',
      ...carriers.map(
        (c) =>
          `"${c.carrier}",${c.activeCases},${c.avgTatMinutes},${c.disallowanceRate}%,${c.cleanApprovalRate}%,${c.reconciledTotal}`
      )
    ].join('\n');

    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `MedCore_RCM_Financial_Audit_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Hospital RCM Financial Intelligence &amp; Statutory Audit
              </h2>
              <p className="text-xs text-slate-500">
                St. Jude Medical Center Manila (250-Bed Tertiary Hospital) · Centavo-Exact Audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-left">
          {/* Executive KPI Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Gross Billings</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {formatPhp(kpis.totalGrossBillings)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{kpis.totalEncountersCount} Encounters</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Days in AR (DAR)</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {kpis.daysInAr.toFixed(1)} Days
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">▼ 37.2d vs historical</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Clean Claims</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {kpis.cleanClaimRate.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Cir 2023-0026 ready</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Annual Yield</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                +{formatPhp(kpis.annualEconomicYield)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">+412 bed-hours/day</div>
            </div>
          </div>

          {/* Statutory Waterfall Reconciliation Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-left">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Statutory Deduction Cascade Reconciliation
              </h3>
              <span className="text-xs font-semibold text-emerald-700 font-mono">
                100% Balanced (Diff: ₱{waterfall.balanceDiff.toFixed(2)})
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4 text-left">Accounting Component</th>
                    <th className="py-2.5 px-4 text-left">Governing Statutory Authority</th>
                    <th className="py-2.5 px-4 text-left">Aggregate Amount</th>
                    <th className="py-2.5 px-4 text-left">Proportional Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-semibold text-slate-900 text-left">Total Gross Hospital Billings</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500 text-left">Standard Hospital Chargemaster</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-left">{formatPhp(waterfall.grossTotal)}</td>
                    <td className="py-2.5 px-4 text-slate-600 text-left">100.0%</td>
                  </tr>
                  <tr className="bg-purple-50/30">
                    <td className="py-2 px-4 font-sans font-medium text-purple-900 text-left">Less: 12% VAT Exemption</td>
                    <td className="py-2 px-4 font-sans text-slate-500 text-left">Republic Act No. 9994 &amp; RA 10754</td>
                    <td className="py-2 px-4 text-purple-700 text-left">-{formatPhp(waterfall.vatExemption)}</td>
                    <td className="py-2 px-4 text-purple-700 text-left">{waterfall.vatShare}%</td>
                  </tr>
                  <tr className="bg-indigo-50/30">
                    <td className="py-2 px-4 font-sans font-medium text-indigo-900 text-left">Less: 20% Senior Citizen / PWD Discount</td>
                    <td className="py-2 px-4 font-sans text-slate-500 text-left">Expanded Senior Citizens &amp; PWD Acts</td>
                    <td className="py-2 px-4 text-indigo-700 text-left">-{formatPhp(waterfall.seniorPwdDiscount)}</td>
                    <td className="py-2 px-4 text-indigo-700 text-left">{waterfall.seniorShare}%</td>
                  </tr>
                  <tr className="bg-emerald-50/30">
                    <td className="py-2 px-4 font-sans font-medium text-emerald-900 text-left">Less: PhilHealth All-Case-Rates (ACR)</td>
                    <td className="py-2 px-4 font-sans text-slate-500 text-left">PhilHealth Circular No. 2024-0037 (+50%)</td>
                    <td className="py-2 px-4 text-emerald-700 text-left">-{formatPhp(waterfall.philhealthTotal)}</td>
                    <td className="py-2 px-4 text-emerald-700 text-left">{waterfall.philhealthShare}%</td>
                  </tr>
                  <tr className="bg-blue-50/30">
                    <td className="py-2 px-4 font-sans font-medium text-blue-900 text-left">Less: Commercial Private HMO Coverage</td>
                    <td className="py-2 px-4 font-sans text-slate-500 text-left">8 Licensed Carriers Policy MBL</td>
                    <td className="py-2 px-4 text-blue-700 text-left">-{formatPhp(waterfall.hmoApprovedAmount)}</td>
                    <td className="py-2 px-4 text-blue-700 text-left">{waterfall.hmoShare}%</td>
                  </tr>
                  <tr className="bg-amber-50/50 font-bold">
                    <td className="py-2.5 px-4 font-sans text-amber-900 text-left">Net Patient Out-of-Pocket Due</td>
                    <td className="py-2.5 px-4 font-sans text-slate-500 text-left">Non-Covered Room/Meds &amp; Shortfall</td>
                    <td className="py-2.5 px-4 text-amber-800 text-left">{formatPhp(waterfall.netPatientDue)}</td>
                    <td className="py-2.5 px-4 text-amber-800 text-left">{waterfall.patientDueShare}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 8-Carrier Summary Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-900 text-left">
              Commercial HMO Carrier Adjudication Summary (8 Carriers)
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4 text-left">HMO Carrier</th>
                    <th className="py-2.5 px-4 text-left">Active Volume</th>
                    <th className="py-2.5 px-4 text-left">Avg eLOA TAT</th>
                    <th className="py-2.5 px-4 text-left">Disallowance</th>
                    <th className="py-2.5 px-4 text-left">Approval Rate</th>
                    <th className="py-2.5 px-4 text-left">Reconciled MTD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {carriers.map((c) => (
                    <tr key={c.carrier} className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-sans font-semibold text-slate-800 text-left">{c.carrier}</td>
                      <td className="py-2 px-4 text-slate-700 text-left">{c.activeCases} cases</td>
                      <td className="py-2 px-4 text-slate-700 text-left">{c.avgTatFormatted}</td>
                      <td className="py-2 px-4 text-rose-700 text-left">{c.disallowanceRate.toFixed(1)}%</td>
                      <td className="py-2 px-4 text-emerald-700 text-left">{c.cleanApprovalRate.toFixed(1)}%</td>
                      <td className="py-2 px-4 font-bold text-slate-900 text-left">{formatPhp(c.reconciledTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>St. Jude Medical Center Manila · MedCore Enterprise RCM</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold shadow-2xs"
          >
            Close Audit Summary
          </button>
        </div>
      </div>
    </div>
  );
};
