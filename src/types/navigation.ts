export type NavRoute =
  | 'COMMAND_CENTER'
  | 'DISCHARGE_CLEARANCE'
  | 'ENCOUNTERS_LEDGER'
  | 'COVERAGE_APPROVALS'
  | 'DISPUTES_EXCEPTIONS'
  | 'CLAIMS_ESOA'
  | 'RCM_ANALYTICS'
  | 'CONFIGURATION'
  | 'PATIENT_PORTAL';

export type UserRole =
  | 'BILLING_SPECIALIST'
  | 'HMO_COORDINATOR'
  | 'CLAIMS_ENCODER'
  | 'HOSPITAL_CFO'
  | 'ATTENDING_PHYSICIAN'
  | 'PATIENT_GUARANTOR'
  | 'LOBBY_SECURITY';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  avatarInitials: string;
  hospitalName: string;
}
