/**
 * Discharge clearance is a strict state machine. Every transition is named,
 * has exactly one legal source stage, and is checked server-side.
 */
export const DISCHARGE_STAGES = [
  'ADMITTED',
  'MGH_DECLARED',
  'DOCTOR_PF_PENDING',
  'PHARMACY_RTS_AUDIT',
  'HMO_FINAL_LOA',
  'PENDING_SETTLEMENT',
  'CLEARED',
] as const;
export type DischargeStage = (typeof DISCHARGE_STAGES)[number];

export const STAGE_LABELS: Record<DischargeStage, string> = {
  ADMITTED: 'Admitted',
  MGH_DECLARED: 'May go home',
  DOCTOR_PF_PENDING: 'Doctor fee sign-off',
  PHARMACY_RTS_AUDIT: 'Pharmacy return-to-stock',
  HMO_FINAL_LOA: 'HMO final LOA',
  PENDING_SETTLEMENT: 'Awaiting settlement',
  CLEARED: 'Cleared to exit',
};

export type DischargeAction =
  | 'DECLARE_MGH'
  | 'START_CLEARANCE'
  | 'SIGN_PROFESSIONAL_FEE'
  | 'CLEAR_PHARMACY'
  | 'RECORD_FINAL_LOA'
  | 'SETTLE';

const SOURCE_STAGE: Record<DischargeAction, DischargeStage> = {
  DECLARE_MGH: 'ADMITTED',
  START_CLEARANCE: 'MGH_DECLARED',
  SIGN_PROFESSIONAL_FEE: 'DOCTOR_PF_PENDING',
  CLEAR_PHARMACY: 'PHARMACY_RTS_AUDIT',
  RECORD_FINAL_LOA: 'HMO_FINAL_LOA',
  SETTLE: 'PENDING_SETTLEMENT',
};

export interface TransitionContext {
  /** True when an HMO is on file for the stay, so the final LOA step is required. */
  hasHmo: boolean;
}

export type TransitionResult = { ok: true; to: DischargeStage } | { ok: false; reason: string };

export function transition(
  from: DischargeStage,
  action: DischargeAction,
  ctx: TransitionContext,
): TransitionResult {
  const required = SOURCE_STAGE[action];
  if (from !== required) {
    return {
      ok: false,
      reason: `This step needs the stay to be at "${STAGE_LABELS[required]}", but it is at "${STAGE_LABELS[from]}".`,
    };
  }
  switch (action) {
    case 'DECLARE_MGH':
      return { ok: true, to: 'MGH_DECLARED' };
    case 'START_CLEARANCE':
      return { ok: true, to: 'DOCTOR_PF_PENDING' };
    case 'SIGN_PROFESSIONAL_FEE':
      return { ok: true, to: 'PHARMACY_RTS_AUDIT' };
    case 'CLEAR_PHARMACY':
      return { ok: true, to: ctx.hasHmo ? 'HMO_FINAL_LOA' : 'PENDING_SETTLEMENT' };
    case 'RECORD_FINAL_LOA':
      return { ok: true, to: 'PENDING_SETTLEMENT' };
    case 'SETTLE':
      return { ok: true, to: 'CLEARED' };
  }
}

/** Billing data (charges, coverage) may change only before the bill is being settled. */
export function chargesEditable(stage: DischargeStage): boolean {
  return stage !== 'PENDING_SETTLEMENT' && stage !== 'CLEARED';
}

export type SlaStatus = 'ON_TRACK' | 'WARNING' | 'BREACH';

/** The discharge SLA clock starts at the may-go-home order. */
export function slaStatus(elapsedMinutes: number, warningMinutes: number, breachMinutes: number): SlaStatus {
  if (elapsedMinutes >= breachMinutes) return 'BREACH';
  if (elapsedMinutes >= warningMinutes) return 'WARNING';
  return 'ON_TRACK';
}
