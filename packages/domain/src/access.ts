/**
 * The single source of truth for who may do what. Every API route declares the
 * permission it needs; nothing checks role names directly.
 *
 * Patients are a different principal type entirely (patient accounts), never a
 * staff role, so a patient login can never be granted a staff permission.
 */
export const STAFF_ROLES = [
  'HOSPITAL_CFO',
  'BILLING_SPECIALIST',
  'CLAIMS_ENCODER',
  'HMO_COORDINATOR',
  'ATTENDING_PHYSICIAN',
  'LOBBY_SECURITY',
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<StaffRole, string> = {
  HOSPITAL_CFO: 'Hospital CFO (administrator)',
  BILLING_SPECIALIST: 'Billing specialist',
  CLAIMS_ENCODER: 'Claims encoder',
  HMO_COORDINATOR: 'HMO coordinator',
  ATTENDING_PHYSICIAN: 'Attending physician',
  LOBBY_SECURITY: 'Lobby security',
};

export const PERMISSIONS = [
  'patient:read',
  'patient:write',
  'patient:contact',
  'encounter:read',
  'encounter:admit',
  'encounter:void',
  'charge:write',
  'coverage:philhealth',
  'coverage:hmo',
  'discharge:declare-mgh',
  'discharge:start',
  'discharge:sign-pf',
  'discharge:sign-pf-on-behalf',
  'discharge:clear-pharmacy',
  'discharge:final-loa',
  'bill:finalize',
  'bill:send',
  'payment:record',
  'promissory:create',
  'gatepass:read',
  'gatepass:verify',
  'dispute:read',
  'dispute:file',
  'dispute:resolve',
  'dispute:waive-unlimited',
  'claim:read',
  'claim:write',
  'bed:read',
  'bed:write',
  'analytics:read',
  'audit:read',
  'staff:manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<StaffRole, readonly Permission[]> = {
  HOSPITAL_CFO: PERMISSIONS,
  BILLING_SPECIALIST: [
    'patient:read',
    'patient:write',
    'patient:contact',
    'encounter:read',
    'encounter:admit',
    'charge:write',
    'discharge:declare-mgh',
    'discharge:start',
    'discharge:clear-pharmacy',
    'bill:finalize',
    'bill:send',
    'payment:record',
    'promissory:create',
    'gatepass:read',
    'dispute:read',
    'dispute:file',
    'dispute:resolve',
    'claim:read',
    'bed:read',
    'bed:write',
    'analytics:read',
  ],
  CLAIMS_ENCODER: ['patient:read', 'encounter:read', 'coverage:philhealth', 'claim:read', 'claim:write', 'dispute:read'],
  HMO_COORDINATOR: ['patient:read', 'encounter:read', 'coverage:hmo', 'discharge:final-loa', 'dispute:read'],
  ATTENDING_PHYSICIAN: ['patient:read', 'encounter:read', 'discharge:declare-mgh', 'discharge:sign-pf'],
  LOBBY_SECURITY: ['gatepass:verify'],
};

export function can(role: StaffRole, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function permissionsFor(role: StaffRole): Permission[] {
  return [...MATRIX[role]];
}

/**
 * Which encounters a role may see. Physicians see only stays where they are the
 * attending physician; everyone else with encounter:read sees the facility.
 */
export type EncounterScope = 'FACILITY' | 'ATTENDING_ONLY' | 'NONE';

export function encounterScope(role: StaffRole): EncounterScope {
  if (!can(role, 'encounter:read')) return 'NONE';
  return role === 'ATTENDING_PHYSICIAN' ? 'ATTENDING_ONLY' : 'FACILITY';
}

/** Billing specialists may waive at most this much per dispute; larger waivers need the CFO. */
export const WAIVER_LIMIT_CENTS = 500_000; // ₱5,000.00

export type WaiverDecision = { allowed: true } | { allowed: false; reason: string };

/** Separation of duties: nobody waives a dispute they filed, and large waivers need the CFO. */
export function canWaive(
  actor: { id: string; role: StaffRole },
  dispute: { contestedCents: number; filedByStaffId: string | null },
): WaiverDecision {
  if (!can(actor.role, 'dispute:resolve')) return { allowed: false, reason: 'Your role cannot resolve disputes.' };
  if (dispute.filedByStaffId === actor.id) {
    return { allowed: false, reason: 'A dispute must be resolved by someone other than the person who filed it.' };
  }
  if (dispute.contestedCents > WAIVER_LIMIT_CENTS && !can(actor.role, 'dispute:waive-unlimited')) {
    return { allowed: false, reason: 'Waivers above ₱5,000.00 need the CFO.' };
  }
  return { allowed: true };
}
