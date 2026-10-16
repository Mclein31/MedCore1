/**
 * Request contracts shared by the API (authoritative validation) and the web
 * app (form validation). Every object is strict and every string is bounded.
 */
import { z } from 'zod';
import { STAFF_ROLES } from './access';
import { isIsoDate } from './dates';
import { GOVERNMENT_ID_TYPES } from './governmentId';
import { MAX_CENTS } from './money';
import { INSTALLMENT_TERMS } from './promissory';
import { PASSWORD_MAX } from './password';
import { CHARGE_CATEGORIES } from './waterfall';

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
/** Printable text without control characters (blocks header and log injection). */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const safeText = (min: number, max: number) =>
  text(min, max).refine((v) => !CONTROL_CHARS.test(v), 'Remove control characters.');

export const Email = z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address.'));
export const Cents = z.number().int().min(0).max(MAX_CENTS);
export const PositiveCents = Cents.min(1, 'Enter an amount greater than zero.');
export const IsoDate = z.string().refine(isIsoDate, 'Use the format YYYY-MM-DD.');
export const Uuid = z.uuid();
export const SixDigitCode = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.');
export const FacilityCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,32}$/);
export const Mrn = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,32}$/, 'Check the hospital record number.');

// ---------- Staff auth ----------
export const StaffLoginBody = z.strictObject({
  email: Email,
  // The max bound stops hashing-cost abuse; the policy itself is checked when a password is set.
  password: z.string().min(1).max(PASSWORD_MAX),
});

export const MfaVerifyBody = z.strictObject({
  challenge: z.string().min(20).max(128),
  code: z.union([SixDigitCode, z.string().trim().toUpperCase().regex(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)]),
});

export const MfaEnrollStartBody = z.strictObject({ challenge: z.string().min(20).max(128) });
export const MfaEnrollConfirmBody = z.strictObject({ challenge: z.string().min(20).max(128), code: SixDigitCode });

export const ChangePasswordBody = z.strictObject({
  currentPassword: z.string().min(1).max(PASSWORD_MAX),
  newPassword: z.string().min(1).max(PASSWORD_MAX),
});

export const AcceptInviteBody = z.strictObject({
  token: z.string().min(20).max(128),
  password: z.string().min(1).max(PASSWORD_MAX),
});

export const CreateStaffBody = z.strictObject({
  email: Email,
  fullName: safeText(2, 120),
  role: z.enum(STAFF_ROLES),
  title: safeText(2, 80),
  prcLicense: z.string().trim().regex(/^\d{7}$/, 'PRC license numbers have 7 digits.').optional(),
});

export const UpdateStaffBody = z.strictObject({
  role: z.enum(STAFF_ROLES).optional(),
  title: safeText(2, 80).optional(),
  isActive: z.boolean().optional(),
});

// ---------- Patient sign-in (email code) ----------
export const PatientCodeRequestBody = z.discriminatedUnion('purpose', [
  z.strictObject({ purpose: z.literal('LOGIN'), facilityCode: FacilityCode, email: Email }),
  z.strictObject({ purpose: z.literal('REGISTER'), facilityCode: FacilityCode, mrn: Mrn, dateOfBirth: IsoDate }),
]);

export const PatientCodeVerifyBody = z.discriminatedUnion('purpose', [
  z.strictObject({
    purpose: z.literal('LOGIN'),
    facilityCode: FacilityCode,
    email: Email,
    code: SixDigitCode,
    client: z.enum(['web', 'mobile']).default('web'),
  }),
  z.strictObject({
    purpose: z.literal('REGISTER'),
    facilityCode: FacilityCode,
    mrn: Mrn,
    dateOfBirth: IsoDate,
    code: SixDigitCode,
    client: z.enum(['web', 'mobile']).default('web'),
  }),
]);

// ---------- Patients and stays ----------
export const DISCOUNT_KINDS = ['NONE', 'SENIOR', 'PWD'] as const;

export const CreatePatientBody = z
  .strictObject({
    mrn: Mrn,
    fullName: safeText(2, 120),
    dateOfBirth: IsoDate,
    sex: z.enum(['F', 'M', 'X']),
    contactPhone: z
      .string()
      .trim()
      .regex(/^(?:\+63|0)9\d{9}$/, 'Use a Philippine mobile number like 09171234567.'),
    email: Email.optional(),
    philhealthPin: z
      .string()
      .trim()
      .regex(/^\d{2}-?\d{9}-?\d$/, 'PhilHealth PINs have 12 digits.')
      .optional(),
    discountKind: z.enum(DISCOUNT_KINDS).default('NONE'),
    discountIdNumber: safeText(4, 32).optional(),
  })
  .refine((v) => v.discountKind === 'NONE' || Boolean(v.discountIdNumber), {
    path: ['discountIdNumber'],
    message: 'Senior citizen and PWD discounts need the ID number.',
  });

export const UpdatePatientContactBody = z.strictObject({
  email: Email.nullable(),
  reason: safeText(5, 300),
});

export const AdmitBody = z.strictObject({
  patientId: Uuid,
  bedId: Uuid,
  attendingPhysicianId: Uuid,
  primaryDiagnosis: safeText(3, 300),
  icd10Code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]\d{2}(?:\.\d{1,4})?$/, 'Use an ICD-10 code like J18.9.'),
});

export const VoidEncounterBody = z.strictObject({ reason: safeText(10, 500) });

export const AddChargeBody = z.strictObject({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,32}$/),
  description: safeText(2, 200),
  category: z.enum(CHARGE_CATEGORIES),
  quantity: z.number().int().min(1).max(10_000),
  unitPriceCents: PositiveCents,
  coverage: z.enum(['COVERED', 'EXCLUDED']),
  explainer: safeText(2, 300).optional(),
});

export const RemoveChargeBody = z.strictObject({ reason: safeText(5, 300) });

export const PhilhealthCoverageBody = z.strictObject({
  caseRateCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9.-]{2,16}$/),
  hciCents: Cents,
  pfCents: Cents,
});

export const HmoCoverageBody = z.strictObject({
  providerName: safeText(2, 64),
  memberNumberLast4: z.string().regex(/^\d{4}$/),
  mblCents: Cents,
});

export const AdjustmentsBody = z.strictObject({
  roomUpgradeExcessCents: Cents,
  pfCeilingCents: Cents.nullable(),
});

// ---------- Discharge ----------
export const SignPfBody = z.strictObject({
  agreedPfCents: PositiveCents,
  onBehalfReason: safeText(10, 300).optional(),
});

export const FinalLoaBody = z.strictObject({
  approvedCents: Cents,
  approvalCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,32}$/),
});

// ---------- Settlement ----------
export const STAFF_PAYMENT_RAILS = ['CASH', 'CARD_TERMINAL', 'BANK_TRANSFER', 'GCASH', 'MAYA', 'QR_PH'] as const;
export const ONLINE_PAYMENT_RAILS = ['GCASH', 'MAYA', 'QR_PH', 'CARD', 'BANK_TRANSFER'] as const;
export const PAYMENT_RAILS = [...new Set([...STAFF_PAYMENT_RAILS, ...ONLINE_PAYMENT_RAILS, 'PROMISSORY_NOTE'] as const)];
export const ONLINE_BANKS = ['BPI', 'BDO', 'METROBANK', 'UNIONBANK', 'LANDBANK'] as const;

export const StaffPaymentBody = z.strictObject({
  amountCents: PositiveCents,
  rail: z.enum(STAFF_PAYMENT_RAILS),
  payerName: safeText(2, 120),
  externalReference: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{4,64}$/)
    .optional(),
});

// Card numbers, CVVs and expiry dates are never accepted anywhere.
export const PatientPaymentBody = z
  .strictObject({
    amountCents: PositiveCents,
    rail: z.enum(ONLINE_PAYMENT_RAILS),
    payerName: safeText(2, 120),
    cardBrand: z.enum(['VISA', 'MASTERCARD', 'JCB']).optional(),
    cardLast4: z
      .string()
      .regex(/^\d{4}$/)
      .optional(),
    bank: z.enum(ONLINE_BANKS).optional(),
  })
  .refine((v) => v.rail !== 'CARD' || (v.cardBrand && v.cardLast4), {
    path: ['cardLast4'],
    message: 'Choose the card brand and enter its last 4 digits.',
  })
  .refine((v) => v.rail !== 'BANK_TRANSFER' || v.bank, { path: ['bank'], message: 'Choose a bank.' });

export const PromissoryBody = z.strictObject({
  borrowerName: safeText(2, 120),
  relationship: z.enum(['SELF', 'SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'GUARANTOR']),
  idType: z.enum(GOVERNMENT_ID_TYPES),
  idNumber: z.string().max(32),
  months: z.union(INSTALLMENT_TERMS.map((m) => z.literal(m)) as [z.ZodLiteral<3>, z.ZodLiteral<6>, z.ZodLiteral<12>]),
  principalCents: PositiveCents,
  acceptTerms: z.literal(true, { error: 'The borrower must accept the terms.' }),
});

// ---------- Disputes ----------
export const DISPUTE_CATEGORIES = [
  'NOT_RECEIVED',
  'DUPLICATE',
  'WRONG_QUANTITY',
  'PRICE_DIFFERENCE',
  'EXCESS_PROFESSIONAL_FEE',
  'OTHER',
] as const;

export const FileDisputeBody = z.strictObject({
  chargeId: Uuid,
  category: z.enum(DISPUTE_CATEGORIES),
  reason: safeText(10, 1000),
});

export const ResolveDisputeBody = z.strictObject({
  decision: z.enum(['WAIVE', 'UPHOLD']),
  note: safeText(10, 1000),
});

// ---------- Gate pass ----------
export const VerifyGatePassBody = z.strictObject({
  passNumber: z.string().trim().toUpperCase().regex(/^GP-[A-Z0-9]{10}$/),
  pin: SixDigitCode,
});

// ---------- Lists ----------
export const PageQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(80).optional(),
});

export const BED_STATUSES = ['AVAILABLE', 'OCCUPIED', 'HOUSEKEEPING', 'MAINTENANCE'] as const;
export const UpdateBedBody = z.strictObject({ status: z.enum(['AVAILABLE', 'HOUSEKEEPING', 'MAINTENANCE']) });
