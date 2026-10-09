export const encounter = {
  uuid: 'synthetic-stay', encounterNumber: 'ENC-SYNTHETIC', billNumber: 'BILL-SYNTHETIC', admissionDate: '2026-10-01', roomBed: '101', stage: 'CLEARED_GATE_PASS', amountPaid: 25, remainingBalance: 0,
  waterfall: { grossTotal: 100, vatExemption: 0, seniorPwdDiscount: 0, philhealthTotal: 50, hmoApprovedAmount: 25, netPatientDue: 25 },
  attendingDoctor: 'Sample Doctor', primaryDiagnosis: 'Synthetic record', disputes: [], timeline: [],
  items: [{ id: 'charge', category: 'PHARMACY', description: 'Itemized sample medicine', plainLanguageExplainer: 'Sample charge', qty: 1, unitPrice: 100, grossAmount: 100, patientOop: 25, philhealthCovered: 50, hmoCovered: 25 }]
};
export const receipt = { id: 'receipt', officialReceiptNumber: 'OR-SYNTHETIC', amount: 25, paymentRail: 'GCASH', payerName: 'Sample Payer', issuedAt: '2026-10-01T01:00:00Z', paymentReference: 'TX-SYNTHETIC', billReference: 'BILL-SYNTHETIC', patientName: 'Sample Patient', patientMrn: 'MRN-SYNTHETIC', status: 'SUCCESS' };
export function useAuth() { return { client: {} }; }
export function useResource() { return { data: { encounter, receipt, note: null }, loading: false, error: null, refresh: async () => {} }; }
export function useFacilityName() { return 'Sample Hospital'; }
