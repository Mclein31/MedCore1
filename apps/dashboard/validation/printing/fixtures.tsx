import { renderToStaticMarkup } from 'react-dom/server';
import { PrintDocument } from '../../src/components/printing/PrintDocumentContainer';
import type { PrintDocumentConfig } from '../../src/services/printEngine';
import { INITIAL_ENCOUNTERS } from '../../src/data/mockData';
import { MedCoreProvider } from '../../src/context/MedCoreContext';
import { RcmAnalyticsPage } from '../../src/pages/RcmAnalyticsPage';
import { computeWaterfallAggregate, computeMacroKpiMetrics, computeCommercialCarrierMetrics } from '../../src/utils/rcmAnalyticsCalculations';

// Public synthetic seed data only. No API/session/database needed for PDF QA.
const encounter = structuredClone(INITIAL_ENCOUNTERS[0]);
const encounters = structuredClone(INITIAL_ENCOUNTERS);
const payment = { id: 'PAY-VALIDATION', paymentId: 'PAY-11111111-2222-3333-4444-555555555555', amount: encounter.waterfall.netPatientDue, timestamp: '2026-10-08T10:00:00Z', paymentRail: 'GCASH', payerName: 'Print Validation Patient', payerContactMasked: '09**-***-0000', channelReference: 'TXN-11111111-2222-3333-4444-555555555555', gatewayAuthCode: 'AUTH-VALIDATION', officialReceiptNumber: 'OR-11111111-2222-3333-4444-555555555555' };
const executive = { waterfall: computeWaterfallAggregate(encounters), kpis: computeMacroKpiMetrics(encounters, encounters), carriers: computeCommercialCarrierMetrics(encounters) };
export const documents: Array<{ name: string; config: PrintDocumentConfig; expected?: string[] }> = [
  ...(['OFFICIAL_ESOA', 'PATIENT_LEDGER', 'DIGITAL_GATE_PASS', 'DISCHARGE_CLEARANCE_DOSSIER', 'CLAIMS_ESOA_AUDIT_REPORT'] as const).map(type => ({ name: type.toLowerCase(), config: { type, data: { encounter } } })),
  { name: 'official_receipt', config: { type: 'OFFICIAL_RECEIPT', data: { payment, patientName: 'Print Validation Patient', encounterNumber: encounter.encounterNumber, roomBed: encounter.roomBed, remainingBalance: 0 } } },
  { name: 'executive_rcm_report', config: { type: 'EXECUTIVE_RCM_REPORT', data: executive } },
  { name: 'coverage_approvals_report', config: { type: 'COVERAGE_APPROVALS_REPORT', data: { encounters: encounters.slice(0, 36) } } },
  { name: 'coverage_long_references', config: { type: 'COVERAGE_APPROVALS_REPORT', data: { encounters: encounters.slice(0, 36).map(enc => ({ ...enc, hmo: { ...enc.hmo, approvalCode: 'APPROVALREFERENCE'.repeat(4).slice(0, 64) } })) } } },
  { name: 'coverage_portrait', config: { type: 'COVERAGE_APPROVALS_REPORT', orientation: 'portrait', data: { encounters: encounters.slice(0, 24) } } },
  { name: 'ledger_portrait', config: { type: 'PATIENT_LEDGER', orientation: 'portrait', data: { encounter } } },
  { name: 'coverage_250_rows', config: { type: 'COVERAGE_APPROVALS_REPORT', data: { encounters: encounters.map((enc, i) => ({ ...enc, encounterNumber: `ROW-${String(i + 1).padStart(3, '0')}`, hmo: { ...enc.hmo, approvalCode: `LOA-${String(i + 1).padStart(3, '0')}`, finalLoaStatus: 'APPROVED' } })) } }, expected: encounters.map((_, i) => `ROW-${String(i + 1).padStart(3, '0')}`) },
  { name: 'ledger_100_long_items', config: { type: 'PATIENT_LEDGER', data: { encounter: { ...encounter, primaryDiagnosis: 'Clinical diagnosis with a full description that must wrap and remain present in the printed statement. '.repeat(4), items: Array.from({ length: 100 }, (_, i) => ({ ...encounter.items[0], id: `print-item-${i}`, code: `ITEM-${String(i + 1).padStart(3, '0')}`, description: `Extended service description ${'UNBROKENREFERENCE'.repeat(8)} to verify wrapping preserves every character in a long hospital charge.`, status: 'SUPERVISORY_WAIVED' })) } } }, expected: Array.from({ length: 100 }, (_, i) => `ITEM-${String(i + 1).padStart(3, '0')}`) }
];
export function renderDocument(config: PrintDocumentConfig) { return renderToStaticMarkup(<PrintDocument config={config} />); }
export function renderAnalytics() { return renderToStaticMarkup(<MedCoreProvider><RcmAnalyticsPage /></MedCoreProvider>); }
