import type { PatientEncounter } from '../types/domain';

// All currency rendering goes through here so every screen shows identical
// Philippine Peso formatting.

export function formatPeso(amount: number | string | null | undefined): string {
  const n = typeof amount === 'string' ? Number(amount) : (amount ?? 0);
  if (!Number.isFinite(n)) return '₱0.00';
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Patient-friendly claim status. Never show raw backend codes alone.
export function describeClaimStatus(status: string): { title: string; detail: string } {
  switch ((status || '').toUpperCase()) {
    case 'UNAVAILABLE':
      return { title: 'Status unavailable', detail: 'Claim status is not available in the patient app yet.' };
    case 'APPROVED':
      return { title: 'Approved', detail: 'Your claim was approved. No action needed.' };
    case 'TRANSMITTED':
    case 'SUBMITTED':
    case 'UNDER PROCESSING':
      return {
        title: 'Being processed',
        detail: 'Your claim was sent and is being reviewed. The hospital billing team is monitoring it.',
      };
    case 'RETURNED':
      return {
        title: 'Action needed',
        detail:
          'Your claim was returned to the hospital for additional information. The hospital billing team is reviewing it.',
      };
    case 'DENIED':
      return {
        title: 'Not approved',
        detail:
          'Your claim was not approved. Please contact the hospital financial office to understand your options.',
      };
    case 'PAID':
      return { title: 'Paid', detail: 'Your claim has been paid to the hospital.' };
    case 'DRAFT':
    case 'FOR REVIEW':
      return {
        title: 'In preparation',
        detail: 'Your claim is being prepared by the hospital billing team.',
      };
    case 'CLEAN':
      return {
        title: 'Verified & applied',
        detail: 'Your PhilHealth benefit has been verified and applied to your hospital bill.',
      };
    case 'WARNING':
    case 'INTERCEPTED':
    default:
      return { title: 'In review', detail: 'Your claim is going through the hospital insurance review.' };
  }
}

export function describeHmoStatus(status: string): { title: string; detail: string } {
  switch ((status || '').toUpperCase()) {
    case 'APPROVED':
      return { title: 'HMO Approved', detail: 'Your HMO approved the covered amount.' };
    case 'AWAITING_CODE':
      return {
        title: 'Being reviewed',
        detail: 'Your HMO authorization is being reviewed. This usually clears before discharge.',
      };
    case 'DISALLOWED_ITEMS':
      return {
        title: 'Some items not covered',
        detail: 'Your HMO excluded some items. The bill below explains which ones and why.',
      };
    case 'PARTIALLY_APPROVED':
      return {
        title: 'Partially approved',
        detail: 'Your HMO approved part of the bill. The remaining part is shown below.',
      };
    case 'REJECTED':
      return {
        title: 'Not approved',
        detail: 'Your HMO did not approve this request. Please contact the hospital financial office.',
      };
    case 'UNDER_REVIEW':
      return { title: 'Under review', detail: 'Your HMO is reviewing your coverage.' };
    default:
      return { title: 'In progress', detail: 'Your HMO authorization is being prepared.' };
  }
}

export function describeDischargeStage(stage: string): string {
  switch ((stage || '').toUpperCase()) {
    case 'MGH_DECLARED':
      return 'Your doctor cleared you to go home. Billing is preparing your statement.';
    case 'DOCTOR_PF_PENDING':
      return 'Waiting for your doctor to confirm professional fees.';
    case 'PHARMACY_RTS_AUDIT':
      return 'Pharmacy is checking returned medicines.';
    case 'HMO_FINAL_LOA':
      return 'Waiting for your final HMO approval.';
    case 'PENDING_SETTLEMENT':
      return 'Your bill is ready for settlement.';
    case 'CLEARED_GATE_PASS':
      return 'You are cleared to leave. Show your discharge pass at the lobby.';
    default:
      return 'Your discharge is being processed.';
  }
}

// Short explainer for "Why do I owe this amount?" Built only from verified
// backend waterfall values. Never invents numbers.
export function explainBalance(enc: PatientEncounter): string {
  const w = enc.waterfall;
  const adjustments = (w.vatExemption || 0) + (w.seniorPwdDiscount || 0);
  return (
    `Your hospital charges totaled ${formatPeso(w.grossTotal)}. ` +
    (adjustments > 0 ? `Statutory discounts reduced this by ${formatPeso(adjustments)}. ` : '') +
    `PhilHealth covered ${formatPeso(w.philhealthTotal)}. Your HMO covered ${formatPeso(w.hmoApprovedAmount)}. ` +
    `Your responsibility is ${formatPeso(w.netPatientDue)}. ` +
    `The remaining balance is ${formatPeso(remainingBalance(enc))}.`
  );
}

//Friendly label for payment rails.
export function describeRail(rail: string): string {
  switch ((rail || '').toUpperCase()) {
    case 'GCASH':
      return 'GCash';
    case 'MAYA':
      return 'Maya';
    case 'QR_PH':
      return 'QR Ph';
    case 'CREDIT_DEBIT_CARD':
      return 'Card';
    case 'BANK_TRANSFER':
      return 'Bank transfer';
    case 'PROMISSORY_NOTE':
      return 'Promissory note';
    default:
      return rail || 'Payment';
  }
}

export function remainingBalance(enc: PatientEncounter): number {
  return (
    enc.remainingBalance ??
    Math.max(0, enc.waterfall.netPatientDue - (enc.amountPaid ?? enc.waterfall.patientPaid ?? 0))
  );
}
export function hasHmo(enc: PatientEncounter): boolean {
  return !!enc.hmo?.providerName && enc.hmo.providerName.toLowerCase() !== 'none';
}
