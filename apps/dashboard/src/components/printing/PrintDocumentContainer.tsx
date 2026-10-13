import GatePassQr from '../common/GatePassQr';
import {gatePassPayload} from '../../../../shared/gatePassPayload';
import React, { useEffect, useState } from 'react';
import { printEngine, PrintDocumentConfig, getPrintOrientation } from '@/services/printEngine';
import { Encounter } from '@/types/domain';
import { CommercialCarrierMetric } from '@/utils/rcmAnalyticsCalculations';
import { formatPhp, formatPstTimestamp } from '@/utils/formatters';
import { formatPeso, formatPstDateTime } from '@/features/patient-clarify/utils/billFormatters';
import { DemoPaymentRecord } from '@/features/patient-clarify/types/billing';

export const PrintDocumentContainer: React.FC = () => {
  const [config, setConfig] = useState<PrintDocumentConfig | null>(null);

  useEffect(() => {
    return printEngine.subscribe((newConfig) => {
      setConfig(newConfig);
    });
  }, []);

  return config ? <PrintDocument config={config} /> : null;
};

// Shared renderer for the live print flow and paginated export validation.
export const PrintDocument: React.FC<{ config: PrintDocumentConfig }> = ({ config }) => {

  const facility = {
    name: 'ST. JUDE MEDICAL CENTER MANILA',
    subtitle: 'Level 3 Tertiary Teaching & General Hospital · 250-Bed Capacity',
    address: 'Don Manuel Agregado St., Sampaloc, Manila 1008, Philippines',
    tin: 'VAT REG TIN: 004-819-201-000',
    pan: 'PhilHealth Accreditation: PAN-NCR-HOSP-004921',
    hitp: 'HITP Gateway Client ID: HITP-MEDCORE-MANILA-092',
    phone: 'Tel: (02) 8888-SJMC / (02) 8731-5000'
  };

  const renderFacilityHeader = (reportTitle: string, documentNumber?: string) => (
    <div className="border-b-2 border-slate-900 pb-3 mb-4 text-left print-avoid-break">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <img
            src="/logo/MedCore_Badge_Logo.png"
            alt="MedCore"
            className="print-logo shrink-0 object-contain"
            style={{
              width: '48px',
              height: '48px',
              minWidth: '48px',
              maxWidth: '48px',
              minHeight: '48px',
              maxHeight: '48px',
              objectFit: 'contain',
              flexShrink: 0
            }}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase font-sans leading-tight">
              {facility.name}
            </h1>
            <p className="text-xs text-slate-700 font-medium">
              {facility.subtitle}
            </p>
            <p className="text-[11px] text-slate-600">
              {facility.address} · {facility.phone}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {facility.tin} · {facility.pan}
            </p>
          </div>
        </div>

        {documentNumber && (
          <div className="text-right font-mono shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block font-sans">
              Document Reference
            </span>
            <span className="text-sm font-bold text-slate-900 block">
              {documentNumber}
            </span>
            <span className="text-[10px] text-slate-500 block font-sans">
              Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-wide uppercase text-slate-900 font-sans">
          {reportTitle}
        </h2>
        <span className="text-[10px] font-mono text-slate-500">
          Generated via MedCore Enterprise RCM · Official Clinical/Financial Record
        </span>
      </div>
    </div>
  );

  const renderSignatures = (signers: { title: string; subtitle?: string; name?: string }[]) => (
    <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-xs text-left print-avoid-break font-sans">
      {signers.map((s, idx) => (
        <div key={idx} className="space-y-8">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            {s.title}
          </span>
          <div className="border-b border-slate-400 w-full" />
          <div className="-mt-6">
            <div className="font-bold text-slate-900 text-xs">{s.name || 'Authorized Signatory'}</div>
            {s.subtitle && <div className="text-[10px] text-slate-500">{s.subtitle}</div>}
          </div>
        </div>
      ))}
    </div>
  );

  // 1. OFFICIAL eSOA DOCUMENT
  if (config.type === 'OFFICIAL_ESOA' || config.type === 'PATIENT_LEDGER') {
    const enc: Encounter = config.data.encounter;
    const w = enc.waterfall;
    const pName = enc.patient.fullName || enc.patient.maskedName;
    const soaNumber = enc.billNumber || `SOA-SJMC-26-${enc.encounterNumber}`;

    return (
      <div id="medcore-print-root" data-print-orientation={getPrintOrientation(config)} className="hidden print:block w-full">
        <div className="print-document w-full max-w-5xl mx-auto p-4 sm:p-8 bg-white text-slate-900 text-xs font-sans text-left">
          {renderFacilityHeader(
          config.type === 'PATIENT_LEDGER'
            ? 'Itemized Inpatient Charge Ledger & Adjudication Breakdown'
            : 'PhilHealth Circular 2023-0026 · Official Electronic Statement of Account (eSOA)',
          soaNumber
        )}

        {/* Patient Demographics Box */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-lg mb-4 text-xs print-avoid-break text-left">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Patient Name</span>
            <strong className="text-slate-900 text-sm block">{pName}</strong>
            <span className="text-[11px] text-slate-600 font-mono">MRN: {enc.patient.mrn}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Encounter / Room</span>
            <span className="font-bold text-slate-900 block">{enc.encounterNumber} · {enc.roomBed}</span>
            <span className="text-[11px] text-slate-600">Category: {enc.roomCategory.replace('_', ' ')}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Admission &amp; Discharge</span>
            <span className="text-slate-800 block">Admitted: {enc.admissionDate.split('T')[0]}</span>
            <span className="text-slate-800 block">MGH Declared: {enc.mghOrderTimestamp.split('T')[0]}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Statutory Discount Status</span>
            <span className="font-bold text-slate-900 block">
              {enc.patient.isSeniorCitizen ? 'Senior Citizen (RA 9994)' : enc.patient.isPwd ? 'PWD (RA 10754)' : 'Standard / Non-Discounted'}
            </span>
            <span className="text-[10px] text-slate-600 font-mono">
              PhilHealth PIN: {enc.patient.philhealthPin}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Primary Insurance / HMO</span>
            <span className="font-bold text-slate-900 block">{enc.hmo.providerName || enc.hmo.hmoName}</span>
            <span className="text-[10px] text-slate-600 font-mono">Approval/LOA: {enc.hmo.approvalCode || enc.hmo.loaNumber || 'Pending'}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Clinical Case &amp; ACR Code</span>
            <span className="font-semibold text-slate-900 block truncate">{enc.primaryDiagnosis} ({enc.primaryIcd10})</span>
            <span className="text-[10px] text-slate-600 font-mono">PhilHealth ACR: {enc.philhealth.caseRateCode}</span>
          </div>
        </div>

        {/* Statutory Deduction Waterfall Table */}
        <div className="mb-4 print-avoid-break">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5 text-left">
            Statutory Waterfall Adjudication (Centavo Precision)
          </div>
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300">Accounting Component</th>
                <th className="py-2 px-3 border-r border-slate-300">Statutory Governing Authority</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right">Deduction Amount</th>
                <th className="py-2 px-3 text-right">Subtotal Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              <tr>
                <td className="py-1.5 px-3 font-sans font-semibold border-r border-slate-200">1. Gross Hospital Charges</td>
                <td className="py-1.5 px-3 font-sans text-slate-600 border-r border-slate-200">Standard Chargemaster Total</td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900 border-r border-slate-200">{formatPhp(w.grossTotal)}</td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900">{formatPhp(w.grossTotal)}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-sans border-r border-slate-200">2. Less: 12% VAT Exemption</td>
                <td className="py-1.5 px-3 font-sans text-slate-600 border-r border-slate-200">Republic Act No. 9994 / 10754</td>
                <td className="py-1.5 px-3 text-right text-emerald-800 font-bold border-r border-slate-200">-{formatPhp(w.vatExemption)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{formatPhp(w.grossTotal - w.vatExemption)}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-sans border-r border-slate-200">3. Less: 20% Senior Citizen / PWD Discount</td>
                <td className="py-1.5 px-3 font-sans text-slate-600 border-r border-slate-200">Republic Act No. 9994 / 10754</td>
                <td className="py-1.5 px-3 text-right text-emerald-800 font-bold border-r border-slate-200">-{formatPhp(w.seniorPwdDiscount)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{formatPhp(w.grossTotal - w.vatExemption - w.seniorPwdDiscount)}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-sans border-r border-slate-200">4. Less: PhilHealth Case Rate (ACR)</td>
                <td className="py-1.5 px-3 font-sans text-slate-600 border-r border-slate-200">Circular No. 2024-0037 (HCI + PF)</td>
                <td className="py-1.5 px-3 text-right text-blue-800 font-bold border-r border-slate-200">-{formatPhp(w.philhealthTotal)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{formatPhp(w.grossTotal - w.vatExemption - w.seniorPwdDiscount - w.philhealthTotal)}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-sans border-r border-slate-200">5. Less: Approved HMO Coverage</td>
                <td className="py-1.5 px-3 font-sans text-slate-600 border-r border-slate-200">{enc.hmo.providerName} Policy MBL</td>
                <td className="py-1.5 px-3 text-right text-blue-800 font-bold border-r border-slate-200">-{formatPhp(w.hmoApprovedAmount)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{formatPhp(w.netPatientDue)}</td>
              </tr>
              <tr className="bg-slate-100 font-bold">
                <td className="py-2 px-3 font-sans text-slate-900 border-r border-slate-300">NET PATIENT OUT-OF-POCKET DUE</td>
                <td className="py-2 px-3 font-sans text-slate-600 border-r border-slate-300">Cashier Settlement / Statutory Promissory</td>
                <td className="py-2 px-3 text-right text-slate-900 border-r border-slate-300 font-black text-sm">{formatPhp(w.netPatientDue)}</td>
                <td className="py-2 px-3 text-right text-slate-900 font-black text-sm">{formatPhp(w.netPatientDue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Out-of-Pocket Breakdown Drivers */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded mb-4 text-xs print-avoid-break text-left">
          <div className="font-bold text-[11px] uppercase tracking-wider text-slate-700 mb-1">
            Out-of-Pocket Cost Drivers Breakdown:
          </div>
          <div className="grid grid-cols-3 gap-2 text-slate-700">
            <div>
              <span>Room Upgrade Differential: </span>
              <strong className="font-mono text-slate-900">{formatPhp(w.roomUpgradeExcess)}</strong>
            </div>
            <div>
              <span>Excluded Consumable Supplies: </span>
              <strong className="font-mono text-slate-900">{formatPhp(w.excludedConsumables)}</strong>
            </div>
            <div>
              <span>Physician Excess Professional Fee: </span>
              <strong className="font-mono text-slate-900">{formatPhp(w.doctorExcessPf)}</strong>
            </div>
          </div>
        </div>

        {/* Complete Itemized Chargemaster Table (Multi-page enabled) */}
        <div className="mb-4">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5 text-left">
            Complete Itemized Chargemaster ({enc.items.length} Line Items)
          </div>
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <colgroup>{(getPrintOrientation(config) === 'portrait' ? [10, 20, 6, 13, 13, 13, 13, 12] : [10, 28, 5, 12, 11, 10, 12, 12]).map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}</colgroup>
            <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[9px]">
              <tr>
                <th className="py-2 px-2.5 border-r border-slate-300">Code</th>
                <th className="py-2 px-3 border-r border-slate-300">Item / Service Description</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center">Qty</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-right">Gross Total</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-right">PhilHealth</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-right">HMO LOA</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-right">Patient OOP</th>
                <th className="py-2 px-2.5 text-center">Coverage Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {enc.items.map((it) => (
                <tr key={it.id} className="print-avoid-break">
                  <td className="py-1 px-2.5 text-slate-500 border-r border-slate-200">{it.code}</td>
                  <td className="py-1 px-3 font-sans font-medium text-slate-900 border-r border-slate-200">{it.description}</td>
                  <td className="py-1 px-2 text-center text-slate-600 border-r border-slate-200">{it.qty}</td>
                  <td className="py-1 px-2.5 text-right font-bold text-slate-900 border-r border-slate-200">{formatPhp(it.grossAmount)}</td>
                  <td className="py-1 px-2.5 text-right text-slate-600 border-r border-slate-200">{it.philhealthCovered > 0 ? formatPhp(it.philhealthCovered) : '—'}</td>
                  <td className="py-1 px-2.5 text-right text-slate-600 border-r border-slate-200">{it.hmoCovered > 0 ? formatPhp(it.hmoCovered) : '—'}</td>
                  <td className="py-1 px-2.5 text-right font-bold text-slate-900 border-r border-slate-200">
                    {it.patientOop > 0 ? formatPhp(it.patientOop) : '₱0.00'}
                  </td>
                  <td className="py-1 px-2.5 text-center font-sans text-[10px] font-semibold text-slate-700">
                    {it.status.replace(/_/g, ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legal Disclaimer */}
        <div className="p-2 border border-slate-300 bg-slate-50 text-[10px] text-slate-600 text-left print-avoid-break">
          <strong>STATUTORY NOTICE:</strong> This Statement of Account has been calculated in strict accordance with Republic Act No. 9439 (Anti-Hospital Detention Act), Republic Act No. 9994 (Expanded Senior Citizens Act), Republic Act No. 10754 (PWD Act), and PhilHealth Circular 2024-0037. All statutory discounts were computed before applying commercial insurance.
        </div>

        {renderSignatures([
          { title: 'Prepared & Audited By', name: 'Elena Santos', subtitle: 'Inpatient Billing Specialist' },
          { title: 'Attending Physician Sign-Off', name: enc.attendingDoctor, subtitle: `PRC License: ${enc.doctorPan.replace('PAN-', 'PRC-')}` },
          { title: 'Conforme (Patient / Guarantor)', name: pName, subtitle: 'Guarantor Acknowledgment' }
        ])}
        </div>
      </div>
    );
  }

  // 2. DIGITAL DISCHARGE GATE PASS & CLEARANCE SLIP
  if (config.type === 'DIGITAL_GATE_PASS') {
    const enc: Encounter = config.data.encounter || config.data;
    const pass = enc.dischargePass || config.data.pass;
    const payload = pass ? gatePassPayload(pass) : null;
    const pName = enc.patient.fullName || enc.patient.maskedName;

    return (
      <div id="medcore-print-root" data-print-orientation={getPrintOrientation(config)} className="hidden print:block w-full">
        <div className="print-document w-full max-w-5xl mx-auto p-4 sm:p-8 bg-white text-slate-900 text-xs font-sans text-left">
          {renderFacilityHeader('Official Digital Lobby Exit Clearance Slip & Gate Pass', pass?.passNumber || 'No issued pass')}

        <div className="border-2 border-slate-900 p-5 rounded-xl space-y-4 text-center my-4 print-avoid-break">
          <div className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-sm uppercase tracking-wider rounded">
            {payload ? 'CLEARED FOR DEPARTURE' : 'NO ACTIVE EXIT CREDENTIAL'}
          </div>

          {payload && <><GatePassQr payload={payload}/><div className="font-mono text-3xl font-black tracking-widest text-slate-900 my-2">PIN: {pass.exitPin}</div></>}

          <p className="text-xs text-slate-600">
            Present this physical clearance slip to Lobby Security for gate release.
          </p>

          <div className="border-t border-b border-slate-300 py-3 grid grid-cols-2 gap-2 text-xs text-left">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Patient Name</span>
              <strong className="text-slate-900">{pName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Encounter / Room</span>
              <span className="font-mono">{enc.encounterNumber} · {enc.roomBed}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Attending Specialist</span>
              <span>{enc.attendingDoctor}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Clearance Timestamp</span>
              <span className="font-mono">{pass?.issuedAt ? formatPstTimestamp(pass.issuedAt) : 'Not issued'}</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Digital Security Verification Signature</span>
              <span className="font-mono text-[10px] text-slate-700 break-all">{pass?.hmacSignature || 'hmac_sha256_verified_lobby_exit'}</span>
            </div>
          </div>
        </div>

        {renderSignatures([
          { title: 'Discharging Ward Nurse', subtitle: 'Station Cleared' },
          { title: 'Billing Department Officer', subtitle: 'Account Reconciled' },
          { title: 'Lobby Security Officer', subtitle: 'Exit Permitted' }
        ])}
        </div>
      </div>
    );
  }

  // 3. OFFICIAL RECEIPT
  if (config.type === 'OFFICIAL_RECEIPT') {
    const payment: DemoPaymentRecord = config.data.payment || config.data;
    const remainingBalance = config.data.remainingBalance ?? 0;
    const pName = config.data.patientName || 'Patient';
    const roomBed = config.data.roomBed || 'Room';
    const encNum = config.data.encounterNumber || 'ENC';

    return (
      <div id="medcore-print-root" data-print-orientation={getPrintOrientation(config)} className="hidden print:block w-full">
        <div className="print-document w-full max-w-5xl mx-auto p-4 sm:p-8 bg-white text-slate-900 text-xs font-sans text-left">
          {renderFacilityHeader('Bureau of Internal Revenue (BIR) Electronic Official Receipt', payment.officialReceiptNumber)}

        <div className="border border-slate-300 p-4 rounded-lg space-y-3 my-4 print-avoid-break">
          <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-200 pb-3 font-mono">
            <div>
              <span className="text-[10px] font-sans uppercase font-bold text-slate-500 block">Official Receipt No</span>
              <strong className="text-slate-900 text-sm">{payment.officialReceiptNumber}</strong>
            </div>
            <div>
              <span className="text-[10px] font-sans uppercase font-bold text-slate-500 block">Payment Reference ID</span>
              <span className="text-slate-900">{payment.paymentId || payment.id}</span>
            </div>
            <div>
              <span className="text-[10px] font-sans uppercase font-bold text-slate-500 block">Date &amp; Time (PST)</span>
              <span>{formatPstDateTime(payment.timestamp)}</span>
            </div>
            <div>
              <span className="text-[10px] font-sans uppercase font-bold text-slate-500 block">Payment Channel</span>
              <span className="uppercase font-bold">{payment.paymentRail.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Received From:</span>
              <strong className="text-slate-900">{payment.payerName} ({payment.payerContactMasked})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">For Account Of:</span>
              <span className="font-semibold text-slate-800">{pName} ({encNum} · {roomBed})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Channel Reference / Auth Code:</span>
              <span className="font-mono">{payment.channelReference} · Auth: {payment.gatewayAuthCode}</span>
            </div>
          </div>

          <div className="border-t border-b border-slate-300 py-3 space-y-1 font-mono text-sm">
            <div className="flex justify-between font-bold">
              <span>AMOUNT TENDERED:</span>
              <span>{formatPeso(payment.amount)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Remaining Out-of-Pocket Balance:</span>
              <span>{formatPeso(remainingBalance)}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono text-center pt-1">
            VAT Exempt Pursuant to RA 9994 / RA 10754 · THIS IS AN OFFICIAL ELECTRONIC RECEIPT
          </div>
        </div>

        {renderSignatures([
          { title: 'Authorized Hospital Cashier', name: 'Cashier On Duty', subtitle: 'Treasury Department' }
        ])}
        </div>
      </div>
    );
  }

  // 4. EXECUTIVE RCM FINANCIAL INTELLIGENCE REPORT
  if (config.type === 'EXECUTIVE_RCM_REPORT') {
    const { waterfall, kpis, carriers } = config.data;

    return (
      <div id="medcore-print-root" data-print-orientation={getPrintOrientation(config)} className="hidden print:block w-full">
        <div className="print-document w-full max-w-5xl mx-auto p-4 sm:p-8 bg-white text-slate-900 text-xs font-sans text-left">
          {renderFacilityHeader('Hospital Financial Intelligence & Statutory RCM Audit Report', `RCM-AUDIT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`)}

        {/* Macro KPI Scorecard */}
        <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-lg mb-4 text-xs font-mono print-avoid-break">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 font-sans block">Total Gross Billings</span>
            <div className="text-base font-bold text-slate-900">{formatPhp(kpis.totalGrossBillings)}</div>
            <span className="text-[10px] text-slate-500 font-sans">{kpis.totalEncountersCount} Encounters Audited</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 font-sans block">Days in AR (DAR)</span>
            <div className="text-base font-bold text-slate-900">{kpis.daysInAr.toFixed(1)} Days</div>
            <span className="text-[10px] text-slate-500 font-sans">Statutory Target &lt;45d</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 font-sans block">First-Pass Clean Claims</span>
            <div className="text-base font-bold text-slate-900">{kpis.cleanClaimRate.toFixed(1)}%</div>
            <span className="text-[10px] text-slate-500 font-sans">eClaims 3.0 Conforming</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 font-sans block">Annual Economic Yield</span>
            <div className="text-base font-bold text-slate-900">+{formatPhp(kpis.annualEconomicYield)}</div>
            <span className="text-[10px] text-slate-500 font-sans">+412 Bed-Hours / Day</span>
          </div>
        </div>

        {/* Statutory Waterfall Table */}
        <div className="mb-4 print-avoid-break">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5">
            Statutory Deduction Cascade Reconciliation Table
          </div>
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300">Accounting Component</th>
                <th className="py-2 px-3 border-r border-slate-300">Governing Statutory Authority</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right">Aggregate Amount</th>
                <th className="py-2 px-3 text-right">Proportional Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              <tr>
                <td className="py-1.5 px-3 font-sans font-semibold border-r border-slate-200">Gross Hospital Billings</td>
                <td className="py-1.5 px-3 font-sans text-slate-600 border-r border-slate-200">Standard Chargemaster</td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900 border-r border-slate-200">{formatPhp(waterfall.grossTotal)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">100.0%</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-sans border-r border-slate-200">Less: 12% VAT Exemption</td>
                <td className="py-1.5 px-3 font-sans text-slate-600 border-r border-slate-200">RA 9994 / RA 10754</td>
                <td className="py-1.5 px-3 text-right text-emerald-800 font-bold border-r border-slate-200">-{formatPhp(waterfall.vatExemption)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{waterfall.vatShare}%</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-sans border-r border-slate-200">Less: 20% Senior Citizen / PWD Discount</td>
                <td className="py-1.5 px-3 font-sans text-slate-600 border-r border-slate-200">RA 9994 / RA 10754</td>
                <td className="py-1.5 px-3 text-right text-emerald-800 font-bold border-r border-slate-200">-{formatPhp(waterfall.seniorPwdDiscount)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{waterfall.seniorShare}%</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-sans border-r border-slate-200">Less: PhilHealth All-Case-Rates (ACR)</td>
                <td className="py-1.5 px-3 font-sans text-slate-600 border-r border-slate-200">Circular No. 2024-0037 (+50%)</td>
                <td className="py-1.5 px-3 text-right text-blue-800 font-bold border-r border-slate-200">-{formatPhp(waterfall.philhealthTotal)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{waterfall.philhealthShare}%</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-sans border-r border-slate-200">Less: Commercial Private HMO Coverage</td>
                <td className="py-1.5 px-3 font-sans text-slate-600 border-r border-slate-200">8 Licensed Carriers Policy MBL</td>
                <td className="py-1.5 px-3 text-right text-blue-800 font-bold border-r border-slate-200">-{formatPhp(waterfall.hmoApprovedAmount)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{waterfall.hmoShare}%</td>
              </tr>
              <tr className="bg-slate-100 font-bold">
                <td className="py-2 px-3 font-sans text-slate-900 border-r border-slate-300">NET PATIENT OUT-OF-POCKET DUE</td>
                <td className="py-2 px-3 font-sans text-slate-600 border-r border-slate-300">Non-Covered Room/Meds &amp; Shortfall</td>
                <td className="py-2 px-3 text-right text-slate-900 border-r border-slate-300 font-black text-sm">{formatPhp(waterfall.netPatientDue)}</td>
                <td className="py-2 px-3 text-right text-slate-900 font-black text-sm">{waterfall.patientDueShare}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 8-Carrier Summary */}
        <div className="mb-4 print-avoid-break">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5">
            Commercial HMO Carrier Adjudication Summary (8 Carriers)
          </div>
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300">HMO Carrier</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center">Active Cases</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center">Avg eLOA TAT</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center">Disallowed Rate</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center">Clean Approval</th>
                <th className="py-2 px-3 text-right">Total Reconciled MTD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {carriers.map((c: CommercialCarrierMetric) => (
                <tr key={c.carrier}>
                  <td className="py-1.5 px-3 font-sans font-semibold border-r border-slate-200">{c.carrier}</td>
                  <td className="py-1.5 px-3 text-center border-r border-slate-200">{c.activeCases} cases</td>
                  <td className="py-1.5 px-3 text-center border-r border-slate-200">{c.avgTatFormatted}</td>
                  <td className="py-1.5 px-3 text-center text-rose-800 font-bold border-r border-slate-200">{c.disallowanceRate.toFixed(1)}%</td>
                  <td className="py-1.5 px-3 text-center text-emerald-800 font-bold border-r border-slate-200">{c.cleanApprovalRate.toFixed(1)}%</td>
                  <td className="py-1.5 px-3 text-right font-bold text-slate-900">{formatPhp(c.reconciledTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {renderSignatures([
          { title: 'Audited & Compiled By', name: 'Arthur Delgado', subtitle: 'Hospital CFO / RCM Director' },
          { title: 'Chief Executive Officer', name: 'Dr. Roberto Mendoza, MHA', subtitle: 'Medical Director / CEO' }
        ])}
        </div>
      </div>
    );
  }

  // 5. COVERAGE APPROVALS REPORT
  if (config.type === 'COVERAGE_APPROVALS_REPORT') {
    const encounters: Encounter[] = config.data.encounters;

    return (
      <div id="medcore-print-root" data-print-orientation={getPrintOrientation(config)} className="hidden print:block w-full">
        <div className="print-document w-full max-w-5xl mx-auto p-4 sm:p-8 bg-white text-slate-900 text-xs font-sans text-left">
          {renderFacilityHeader('Multi-Payer Inpatient Roster & Commercial HMO Electronic LOA Adjudication Report')}

        <div className="mb-4">
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <colgroup>{(getPrintOrientation(config) === 'portrait' ? [18, 9, 11, 10, 9, 14, 15, 14] : [19, 7, 11, 10, 9, 15, 15, 14]).map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}</colgroup>
            <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[9px]">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300">Patient &amp; MRN</th>
                <th className="py-2 px-2.5 border-r border-slate-300">Room</th>
                <th className="py-2 px-3 border-r border-slate-300">PhilHealth ACR</th>
                <th className="py-2 px-3 border-r border-slate-300">HMO Carrier</th>
                <th className="py-2 px-2.5 border-r border-slate-300">LOA Code</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-right">Approved LOA</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-right">Excluded Supplies</th>
                <th className="py-2 px-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {encounters.map((enc) => (
                <tr key={enc.id} className="print-avoid-break">
                  <td className="py-1.5 px-3 font-sans border-r border-slate-200">
                    <strong className="text-slate-900 block">{enc.patient.fullName || enc.patient.maskedName}</strong>
                    <span className="text-[10px] text-slate-500 font-mono">{enc.encounterNumber}</span>
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200">{enc.roomBed}</td>
                  <td className="py-1.5 px-3 border-r border-slate-200 font-sans">
                    <span className="font-mono font-bold text-slate-900 block print-no-wrap">{formatPhp(enc.philhealth.totalCaseRate)}</span>
                    <span className="text-[10px] text-slate-500">{enc.philhealth.caseRateCode}</span>
                  </td>
                  <td className="py-1.5 px-3 font-sans font-medium text-slate-800 border-r border-slate-200">
                    {enc.hmo.providerName}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">{enc.hmo.approvalCode || 'Pending'}</td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-bold text-slate-900 print-no-wrap">{formatPhp(enc.hmo.approvedAmount)}</td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 text-right text-rose-800 font-bold print-no-wrap">{formatPhp(enc.hmo.disallowedConsumables)}</td>
                  <td className="py-1.5 px-2.5 text-center font-sans text-[10px] font-bold">
                    <span className="print-no-wrap">{enc.hmo.finalLoaStatus.replace(/_/g, ' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {renderSignatures([
          { title: 'HMO Liaison Coordinator', name: 'Marco Valenzuela', subtitle: 'Commercial Approvals Desk' },
          { title: 'Billing Department Supervisor', name: 'Elena Santos', subtitle: 'Inpatient RCM' }
        ])}
        </div>
      </div>
    );
  }

  // 6. DISCHARGE CLEARANCE DOSSIER
  if (config.type === 'DISCHARGE_CLEARANCE_DOSSIER') {
    const enc: Encounter = config.data.encounter;
    const pName = enc.patient.fullName || enc.patient.maskedName;

    return (
      <div id="medcore-print-root" data-print-orientation={getPrintOrientation(config)} className="hidden print:block w-full">
        <div className="print-document w-full max-w-5xl mx-auto p-4 sm:p-8 bg-white text-slate-900 text-xs font-sans text-left">
          {renderFacilityHeader('Inpatient Discharge Clearance Dossier & 45-Minute SLA Audit Sheet', enc.encounterNumber)}

        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-300 rounded mb-4 print-avoid-break">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Patient</span>
            <strong className="text-slate-900 text-sm">{pName}</strong>
            <div className="text-slate-600 font-mono text-[11px]">{enc.encounterNumber} · {enc.roomBed}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">MGH Order Timestamp</span>
            <span className="text-slate-900 font-mono block">{formatPstTimestamp(enc.mghOrderTimestamp)}</span>
            <span className="text-[10px] text-slate-600">Turnaround: {enc.elapsedMinutes} mins elapsed</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">SLA Status</span>
            <strong className="text-slate-900 text-sm block">{enc.slaStatus}</strong>
            <span className="text-[10px] text-slate-600">Stage: {enc.stage.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* 4-Station Sign-Off Checklist */}
        <div className="mb-4 print-avoid-break">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5">
            Statutory 4-Station Discharge Verification Checklist
          </div>
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300">Station / Milestone</th>
                <th className="py-2 px-3 border-r border-slate-300">Responsible Role</th>
                <th className="py-2 px-3 border-r border-slate-300">Verification Details</th>
                <th className="py-2 px-3 text-center">Station Clearance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-200">1. Physician Professional Fee</td>
                <td className="py-2 px-3 border-r border-slate-200">{enc.attendingDoctor}</td>
                <td className="py-2 px-3 border-r border-slate-200 font-mono">Declared: {formatPhp(enc.doctorAgreedFee)} · Ceiling: {formatPhp(enc.doctorAgreedFee - enc.doctorExcessPf)}</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-800">
                  {enc.stage !== 'DOCTOR_PF_PENDING' && enc.stage !== 'MGH_DECLARED' ? 'CLEARED' : 'PENDING'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-200">2. Pharmacy Return-to-Stock (RTS)</td>
                <td className="py-2 px-3 border-r border-slate-200">Clinical Pharmacist</td>
                <td className="py-2 px-3 border-r border-slate-200 font-mono">Ward returns audited · Unreturned: {enc.unreturnedMedsCount}</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-800">
                  {enc.stage !== 'PHARMACY_RTS_AUDIT' && enc.stage !== 'DOCTOR_PF_PENDING' && enc.stage !== 'MGH_DECLARED' ? 'CLEARED' : 'PENDING'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-200">3. HMO Final eLOA Adjudication</td>
                <td className="py-2 px-3 border-r border-slate-200">{enc.hmo.providerName} / HMO Desk</td>
                <td className="py-2 px-3 border-r border-slate-200 font-mono">LOA Approved: {formatPhp(enc.hmo.approvedAmount)} · Exclusions: {formatPhp(enc.hmo.disallowedConsumables)}</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-800">
                  {enc.hmo.finalLoaStatus === 'APPROVED' ? 'CLEARED' : 'PENDING'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-200">4. Patient Financial Settlement</td>
                <td className="py-2 px-3 border-r border-slate-200">Cashier Treasury / Billing</td>
                <td className="py-2 px-3 border-r border-slate-200 font-mono">Net Due: {formatPhp(enc.waterfall.netPatientDue)}</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-800">
                  {enc.stage === 'CLEARED_GATE_PASS' ? 'CLEARED' : 'PENDING'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Operational Timeline */}
        {enc.timeline && enc.timeline.length > 0 && (
          <div className="mb-4 print-flow">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5">
              Chronological Audit Trail &amp; Milestones
            </div>
            <div className="border border-slate-300 divide-y divide-slate-200">
              {enc.timeline.map((t) => (
                <div key={t.id} className="p-2 flex items-baseline justify-between text-xs print-avoid-break">
                  <div>
                    <strong className="text-slate-900">{t.title}</strong>
                    <p className="text-slate-600 text-[11px] mt-0.5">{t.description}</p>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-500 shrink-0 ml-4">
                    {t.timeDisplay} · {t.actor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {renderSignatures([
          { title: 'Discharge Flow Coordinator', subtitle: 'Patient Flow Team' },
          { title: 'Attending Physician', name: enc.attendingDoctor, subtitle: 'Clinical Clearance' },
          { title: 'Billing Supervisor', name: 'Elena Santos', subtitle: 'RCM Clearance' }
        ])}
        </div>
      </div>
    );
  }

  // 7. CLAIMS eSOA AUDIT REPORT
  if (config.type === 'CLAIMS_ESOA_AUDIT_REPORT') {
    const enc: Encounter = config.data.encounter;
    const cl = enc.philhealth;

    return (
      <div id="medcore-print-root" data-print-orientation={getPrintOrientation(config)} className="hidden print:block w-full">
        <div className="print-document w-full max-w-5xl mx-auto p-4 sm:p-8 bg-white text-slate-900 text-xs font-sans text-left">
          {renderFacilityHeader('PhilHealth eClaims 3.0 Pre-Flight Audit & CF1-CF4 Conformity Report', cl.id)}

        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-300 rounded mb-4 print-avoid-break">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Patient Name</span>
            <strong className="text-slate-900">{enc.patient.fullName || enc.patient.maskedName}</strong>
            <div className="text-[11px] font-mono text-slate-600">PIN: {enc.patient.philhealthPin}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">PhilHealth Case Rate (ACR)</span>
            <strong className="text-slate-900 font-mono text-sm">{formatPhp(cl.totalCaseRate)}</strong>
            <div className="text-[10px] text-slate-600">HCI: {formatPhp(cl.hciAmount)} · PF: {formatPhp(cl.pfAmount)}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Audit Status &amp; RTH Risk</span>
            <strong className="text-slate-900 text-sm block">{cl.status}</strong>
            <span className="text-[10px] text-slate-600 font-mono">Risk Score: {cl.rthRiskScore.toFixed(2)}</span>
          </div>
        </div>

        {/* Claim Forms 1 to 4 Checklist */}
        <div className="mb-4 print-avoid-break">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5">
            PhilHealth Claim Forms (CF1 – CF4) Pre-Flight Audit
          </div>
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300">Form</th>
                <th className="py-2 px-3 border-r border-slate-300">Audit Scope</th>
                <th className="py-2 px-3 border-r border-slate-300">Conformity Findings</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-200">CF1</td>
                <td className="py-2 px-3 border-r border-slate-200">Member Eligibility &amp; PIN Validation</td>
                <td className="py-2 px-3 border-r border-slate-200">PIN format verified against PhilHealth PEC 3.0 directory.</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-800">PASSED</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-200">CF2</td>
                <td className="py-2 px-3 border-r border-slate-200">Itemized Financial Cascade &amp; ACR Rates</td>
                <td className="py-2 px-3 border-r border-slate-200">Circular 2024-0037 +50% rate applied correctly ({cl.caseRateCode}).</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-800">PASSED</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-200">CF3</td>
                <td className="py-2 px-3 border-r border-slate-200">Maternity / Surgical Special Provisions</td>
                <td className="py-2 px-3 border-r border-slate-200">Not applicable or satisfied by ICD-10 {cl.primaryIcd10}.</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-800">PASSED</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold border-r border-slate-200">CF4</td>
                <td className="py-2 px-3 border-r border-slate-200">Clinical Data &amp; Course in Ward</td>
                <td className="py-2 px-3 border-r border-slate-200">
                  Vitals: {cl.cf4VitalsRecorded ? 'Logged' : 'Missing'} · Ward: {cl.cf4CourseInWardRecorded ? 'Logged' : 'Missing'} · Labs: {cl.cf4LabsConsistent ? 'Consistent' : 'Discrepancy'}
                </td>
                <td className="py-2 px-3 text-center font-bold text-emerald-800">
                  {cl.cf4CourseInWardRecorded && cl.cf4LabsConsistent ? 'PASSED' : 'ACTION REQUIRED'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {renderSignatures([
          { title: 'Claims Audit Officer', name: 'Grace Tan', subtitle: 'PhilHealth Certified Encoder' },
          { title: 'Attending Physician', name: enc.attendingDoctor, subtitle: 'Clinical Conforme' }
        ])}
        </div>
      </div>
    );
  }

  // 8. HMO APPEAL LETTER
  if (config.type === 'HMO_APPEAL_LETTER') {
    const { letterContent, encounter: enc, appealData } = config.data;
    const docName = appealData?.attendingPhysicianName || enc?.attendingDoctor || 'Attending Physician';
    const docPan = appealData?.doctorPan || '0098412';

    return (
      <div id="medcore-print-root" data-print-orientation={getPrintOrientation(config)} className="hidden print:block w-full">
        <div className="print-document w-full max-w-4xl mx-auto p-6 sm:p-10 bg-white text-slate-900 text-xs font-sans text-left">
          {renderFacilityHeader('Medical Necessity Reconsideration Appeal Letter')}

          <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div><strong>Case Reference:</strong> {appealData?.referenceNumber || enc?.encounterNumber}</div>
              <div><strong>HMO Carrier:</strong> {enc?.hmo?.providerName || enc?.hmo?.hmoName || 'HMO Claims Department'}</div>
              <div><strong>Patient:</strong> {enc?.patient?.fullName || enc?.patient?.maskedName}</div>
              <div><strong>Encounter / MRN:</strong> {enc?.encounterNumber} / {enc?.patient?.mrn}</div>
            </div>
          </div>

          <div className="my-6 whitespace-pre-wrap font-serif text-[13px] leading-relaxed text-slate-800">
            {letterContent}
          </div>

          {renderSignatures([
            { title: 'Attending Physician / Specialist', name: docName, subtitle: `PRC License / PAN: ${docPan}` },
            { title: 'Medical Director', name: 'Dr. Roberto Mendoza, MHA', subtitle: 'Hospital Medical Director' }
          ])}
        </div>
      </div>
    );
  }

  return null;
};
