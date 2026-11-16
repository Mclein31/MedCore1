import { formatPeso, minutesBetween } from '@medcore/domain';
import { and, asc, desc, eq, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import type { DbOrTx } from '../../db/client';
import {
  charges,
  disputes,
  encounters,
  facilities,
  gatePasses,
  hmoCoverages,
  ledgers,
  patients,
  payments,
  philhealthClaims,
  promissoryNotes,
  receipts,
  staffUsers,
} from '../../db/schema';
import type { AiConfig } from '../../env';
import { AI_CACHE_TTL, cachedAiResult } from './aiResultCache';
import { coraLanguageCachePolicy, generateLocalizedCoraReply } from './coraLanguage';
import { coraPolicyNotice, obviousRestrictedRequest } from './coraScope';
import { AiInferenceError } from './geminiClient';
import { clearTokenMap, rehydrateText, scrubPatientData } from './phiScrubber';
import {
  buildCoraPrompt,
  CORA_ACTION_LABELS,
  type CoraEncounterContext,
  type CoraFinancialContext,
  type CoraHistoryTurn,
  type CoraLanguage,
  type CoraMode,
  type CoraResponse,
  CoraResponseSchema,
} from './prompts/coraPrompts';
import { jsonResponseSchema, validateAiResult } from './structuredResponse';

export const CORA_RESPONSE_SCHEMA = jsonResponseSchema(CoraResponseSchema);

export interface CoraChatOptions {
  db: DbOrTx;
  encounterId: string;
  facilityId: string;
  userId?: string;
  message: string;
  language?: CoraLanguage;
  mode?: CoraMode;
  conversationHistory?: CoraHistoryTurn[];
  forceRefresh?: boolean;
  aiConfig?: AiConfig;
}

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const pesosField = (cents: number) => ({
  amount: cents / 100,
  formatted: formatPeso(cents),
});

export interface LedgerGroundingSources {
  ledger?: {
    grossHospitalCents: number;
    grossProfessionalFeeCents: number;
    grossCents: number;
    vatExemptionCents: number;
    seniorPwdDiscountCents: number;
    nonCoveredCents: number;
    philhealthCents: number;
    hmoCents: number;
    coverageShortfallCents: number;
    netPatientDueCents: number;
    paidCents: number;
    financedCents: number;
    balanceCents: number;
    creditCents: number;
  } | null;
  encounter: {
    roomUpgradeExcessCents: number;
    doctorExcessPfCents: number;
  };
  claim?: { hciCents: number; pfCents: number } | null;
  hmo?: { mblCents: number; approvedCents: number } | null;
  charges: readonly { unitPriceCents: number; grossCents: number }[];
  payments: readonly { amountCents: number }[];
  activeNote?: { principalCents: number; months: number; schedule?: unknown } | null;
  disputes: readonly { contestedCents: number; status: string }[];
}

/** Collect all authoritative integer centavo figures exposed in Cora's server_record prompt. */
export function collectAllowedLedgerCents(sources: LedgerGroundingSources): Set<number> {
  const allowed = new Set<number>();
  const add = (value: number | null | undefined) => {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      const rounded = Math.round(value);
      if (Number.isSafeInteger(rounded)) allowed.add(rounded);
    }
  };

  const { ledger, encounter, claim, hmo, charges: chargeList, payments: paymentList, activeNote } = sources;
  const grossCents = ledger?.grossCents ?? 0;
  const vatCents = ledger?.vatExemptionCents ?? 0;
  const seniorPwdCents = ledger?.seniorPwdDiscountCents ?? 0;

  add(ledger?.grossHospitalCents ?? 0);
  add(ledger?.grossProfessionalFeeCents ?? 0);
  add(grossCents);
  add(vatCents);
  add(seniorPwdCents);
  add(Math.max(0, grossCents - vatCents - seniorPwdCents));
  add(ledger?.nonCoveredCents ?? 0);
  add(ledger?.philhealthCents ?? 0);
  add(ledger?.hmoCents ?? 0);
  add(ledger?.coverageShortfallCents ?? 0);
  add(ledger?.netPatientDueCents ?? 0);
  add(ledger?.paidCents ?? 0);
  add(ledger?.financedCents ?? 0);
  add(ledger?.balanceCents ?? 0);
  add(ledger?.creditCents ?? 0);

  add(encounter.roomUpgradeExcessCents);
  add(encounter.doctorExcessPfCents);

  const claimHci = claim?.hciCents ?? 0;
  const claimPf = claim?.pfCents ?? 0;
  add(claimHci);
  add(claimPf);
  add(claimHci + claimPf);

  const hmoMbl = hmo?.mblCents ?? 0;
  const hmoApproved = hmo?.approvedCents ?? 0;
  add(hmoMbl);
  add(hmoApproved);
  add(Math.max(0, hmoMbl - hmoApproved));

  for (const item of chargeList) {
    add(item.unitPriceCents);
    add(item.grossCents);
  }
  for (const payment of paymentList) {
    add(payment.amountCents);
  }
  if (activeNote) {
    add(activeNote.principalCents);
    if (activeNote.months > 0) {
      add(Math.round(activeNote.principalCents / activeNote.months));
    }
    if (Array.isArray(activeNote.schedule)) {
      for (const row of activeNote.schedule) {
        if (row && typeof row === 'object' && 'amountCents' in row) {
          add((row as { amountCents?: number }).amountCents);
        }
      }
    }
  }
  let openDisputedTotal = 0;
  for (const dispute of sources.disputes) {
    add(dispute.contestedCents);
    if (dispute.status === 'OPEN') openDisputedTotal += dispute.contestedCents;
  }
  add(openDisputedTotal);

  return allowed;
}

function parseDecimalTokenToCents(rawNumber: string, unit: 'PESO' | 'CENTAVO' = 'PESO'): number | null {
  const compact = rawNumber.trim();
  if (!compact || compact.startsWith('-')) return null;
  if (compact.includes(',') && !/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(compact)) return null;
  const clean = compact.replace(/,/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(clean)) return null;
  const [wholeStr = '0', fracStr = ''] = clean.split('.');
  if (unit === 'CENTAVO') {
    if (fracStr.length > 0) return null;
    const cents = Number.parseInt(wholeStr, 10);
    return Number.isSafeInteger(cents) ? cents : null;
  }
  if (fracStr.length > 2) return null;
  const whole = Number.parseInt(wholeStr, 10);
  const frac = Number.parseInt(fracStr.padEnd(2, '0') || '0', 10);
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(frac)) return null;
  const cents = whole * 100 + frac;
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Extract currency-marked or formatted monetary peso amounts from a Cora reply into centavos. */
export function extractPesoAmountsCents(text: string): { raw: string; cents: number | null }[] {
  const normalized = text.normalize('NFKC');
  const occupied: [number, number][] = [];
  const matches: { raw: string; cents: number | null; start: number }[] = [];

  const overlaps = (start: number, end: number) => occupied.some(([s, e]) => start < e && end > s);
  const record = (start: number, end: number, raw: string, cents: number | null) => {
    if (overlaps(start, end)) return;
    occupied.push([start, end]);
    matches.push({ raw, cents, start });
  };

  // Prefixed amounts: ₱350, ₱3,500.00, PHP 5,000, Php 350, P3,500
  const prefixRe =
    /(?:₱|(?<![A-Za-z0-9])(?:PHP|Php|PhP|php|P))\s*(-?\s*\d+(?:,\d+)*(?:\.\d+)?)(?![A-Za-z0-9%]|\.\d|\s*%)/g;
  for (const m of normalized.matchAll(prefixRe)) {
    const start = m.index ?? 0;
    const raw = m[0];
    record(start, start + raw.length, raw, parseDecimalTokenToCents(m[1] ?? '', 'PESO'));
  }

  // Suffixed amounts: 3,500 pesos, 350 piso, 350 a piso, 5,000 PHP, 50 centavos
  const suffixRe =
    /(?<![A-Za-z0-9.])(\d+(?:,\d+)*(?:\.\d+)?)(?:\s+a)?\s*(?:(?:philippine\s+)?pesos?|pisos?|php|centavos?|sentimos?)\b/gi;
  for (const m of normalized.matchAll(suffixRe)) {
    const start = m.index ?? 0;
    const raw = m[0];
    const unit = /(?:centavos?|sentimos?)\b/i.test(raw) ? 'CENTAVO' : 'PESO';
    record(start, start + raw.length, raw, parseDecimalTokenToCents(m[1] ?? '', unit));
  }

  // Unmarked formatted money amounts (comma-grouped thousands like 3,500 or 2-decimal amounts like 350.00)
  // while skipping clinical quantities/dates/percentages such as "1,000 mg" or "November 16, 2026".
  const unmarkedRe =
    /(?<![A-Za-z0-9.,-])(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2})(?![A-Za-z0-9%]|\.\d|,\d|\s*(?:%|percent|mg|mcg|g|kg|ml|iu|meq|mm|cm|m|km|min|mins|minute|minutes|hr|hrs|hour|hours|day|days|month|months|yr|yrs|year|years|units?|pcs?|tabs?|caps?|bottles?|vials?)\b)/gi;
  for (const m of normalized.matchAll(unmarkedRe)) {
    const start = m.index ?? 0;
    const raw = m[0];
    record(start, start + raw.length, raw, parseDecimalTokenToCents(m[1] ?? '', 'PESO'));
  }

  matches.sort((a, b) => a.start - b.start);
  return matches.map(({ raw, cents }) => ({ raw, cents }));
}

export function findUngroundedPesoAmounts(reply: string, allowedCents: ReadonlySet<number>): string[] {
  const ungrounded: string[] = [];
  const seen = new Set<string>();
  for (const item of extractPesoAmountsCents(reply)) {
    if ((item.cents === null || !allowedCents.has(item.cents)) && !seen.has(item.raw)) {
      seen.add(item.raw);
      ungrounded.push(item.raw);
    }
  }
  return ungrounded;
}

export function assertReplyNumbersGroundedInLedger(reply: string, allowedCents: ReadonlySet<number>): void {
  const ungrounded = findUngroundedPesoAmounts(reply, allowedCents);
  if (ungrounded.length > 0) {
    throw new AiInferenceError(
      'AI_INVALID_RESPONSE',
      'Cora returned a peso amount that does not match the recorded ledger. Please try again.',
    );
  }
}

function buildGroundingCorrectionPrompt(
  scrubbedPrompt: string,
  ungroundedTokens: readonly string[],
  allowedAmounts: readonly string[],
): string {
  return `${scrubbedPrompt}\n\nCORRECTION: Your previous reply used peso amount(s) not present in server_record (${ungroundedTokens.join(', ')}). Rewrite the answer in the selected response_language quoting ONLY these recorded ledger peso figures: ${allowedAmounts.join(', ')}. Never alter digits or treat insurer deductions as remaining balance.`;
}

export interface DeterministicLedgerSummaryInput {
  language: CoraLanguage;
  mode: CoraMode;
  hmoProviderName?: string | null;
  grossHospitalCents: number;
  grossProfessionalFeeCents: number;
  grossCents: number;
  vatExemptionCents: number;
  seniorPwdDiscountCents: number;
  philhealthCents: number;
  hmoCents: number;
  excludedConsumablesCents: number;
  roomUpgradeExcessCents: number;
  doctorExcessPfCents: number;
  coverageShortfallCents: number;
  netPatientDueCents: number;
  paidCents: number;
  financedCents: number;
  balanceCents: number;
  creditCents: number;
}

const FALLBACK_COPY: Record<
  CoraLanguage,
  {
    banner: string;
    totalCharges: string;
    hospital: string;
    doctor: string;
    deductions: string;
    noDeductions: string;
    vat: string;
    seniorPwd: string;
    philhealth: string;
    hmo: string;
    patientShare: string;
    excluded: string;
    roomUpgrade: string;
    excessPf: string;
    shortfall: string;
    paid: string;
    financed: string;
    remaining: string;
    credit: string;
  }
> = {
  en: {
    banner: '[Recorded ledger summary — exact figures from your bill]',
    totalCharges: 'Total billed charges',
    hospital: 'hospital',
    doctor: 'doctor fee',
    deductions: 'Deductions applied',
    noDeductions: 'none recorded',
    vat: 'VAT exemption',
    seniorPwd: 'Senior/PWD discount',
    philhealth: 'PhilHealth',
    hmo: 'HMO',
    patientShare: 'Patient share',
    excluded: 'excluded items',
    roomUpgrade: 'room upgrade excess',
    excessPf: 'doctor fee excess',
    shortfall: 'uncovered charges',
    paid: 'Payments recorded',
    financed: 'Promissory note financed',
    remaining: 'Remaining balance',
    credit: 'Overpayment credit',
  },
  fil: {
    banner: '[Recorded ledger summary — eksaktong figures mula sa bill ninyo]',
    totalCharges: 'Total billed charges',
    hospital: 'hospital',
    doctor: 'doctor PF',
    deductions: 'Mga nabawas',
    noDeductions: 'walang naitalang bawas',
    vat: 'VAT exemption',
    seniorPwd: 'Senior/PWD discount',
    philhealth: 'PhilHealth',
    hmo: 'HMO',
    patientShare: 'Sagot ng pasyente',
    excluded: 'excluded items',
    roomUpgrade: 'room upgrade excess',
    excessPf: 'doctor fee excess',
    shortfall: 'uncovered charges',
    paid: 'Nabayaran na',
    financed: 'Promissory note',
    remaining: 'Natitirang balance',
    credit: 'Overpayment credit',
  },
  tl: {
    banner: '[Buod mula sa opisyal na talaan ng bayarin]',
    totalCharges: 'Kabuuang singil',
    hospital: 'ospital',
    doctor: 'bayad sa doktor',
    deductions: 'Mga ibinawas',
    noDeductions: 'walang nakatalang bawas',
    vat: 'eksemsyon sa VAT',
    seniorPwd: 'diskwentong Senior/PWD',
    philhealth: 'PhilHealth',
    hmo: 'HMO',
    patientShare: 'Bahagi ng pasyente',
    excluded: 'hindi saklaw na gamit',
    roomUpgrade: 'sobra sa kuwarto',
    excessPf: 'sobra sa bayad sa doktor',
    shortfall: 'hindi nasaklaw na singil',
    paid: 'Nabayaran na',
    financed: 'Promissory note',
    remaining: 'Natitirang babayaran',
    credit: 'Sobrang bayad',
  },
  ilo: {
    banner: '[Pakabuklan manipud iti opisial a listaan ti bill yo]',
    totalCharges: 'Dagup a singir',
    hospital: 'ospital',
    doctor: 'bayad ti doktor',
    deductions: 'Dagiti naibawas',
    noDeductions: 'awan nailista a bawas',
    vat: 'eksemsion iti VAT',
    seniorPwd: 'diskuento ti Senior/PWD',
    philhealth: 'PhilHealth',
    hmo: 'HMO',
    patientShare: 'Pasarte ti pasiente',
    excluded: 'saan a sakop a gamit',
    roomUpgrade: 'sobra ti kuarto',
    excessPf: 'sobra a bayad ti doktor',
    shortfall: 'saan a nasakup a singir',
    paid: 'Nabayadanen',
    financed: 'Promissory note',
    remaining: 'Nabati a babayaran',
    credit: 'Sobra a bayad',
  },
};

/** Build a labelled deterministic summary using only recorded ledger figures when model output stays ungrounded. */
export function buildDeterministicLedgerSummary(
  input: DeterministicLedgerSummaryInput,
): CoraResponse & { modelUsed: string } {
  const copy = FALLBACK_COPY[input.language];
  const chargeSubparts: string[] = [];
  if (input.grossHospitalCents > 0)
    chargeSubparts.push(`${copy.hospital} ${formatPeso(input.grossHospitalCents)}`);
  if (input.grossProfessionalFeeCents > 0) {
    chargeSubparts.push(`${copy.doctor} ${formatPeso(input.grossProfessionalFeeCents)}`);
  }

  const deductions: string[] = [];
  if (input.vatExemptionCents > 0) deductions.push(`${copy.vat} ${formatPeso(input.vatExemptionCents)}`);
  if (input.seniorPwdDiscountCents > 0) {
    deductions.push(`${copy.seniorPwd} ${formatPeso(input.seniorPwdDiscountCents)}`);
  }
  if (input.philhealthCents > 0) deductions.push(`${copy.philhealth} ${formatPeso(input.philhealthCents)}`);
  if (input.hmoCents > 0) {
    const hmoLabel =
      input.hmoProviderName && input.hmoProviderName !== 'None'
        ? `${input.hmoProviderName} ${copy.hmo}`
        : copy.hmo;
    deductions.push(`${hmoLabel} ${formatPeso(input.hmoCents)}`);
  }

  const shareParts: string[] = [];
  if (input.excludedConsumablesCents > 0) {
    shareParts.push(`${copy.excluded} ${formatPeso(input.excludedConsumablesCents)}`);
  }
  if (input.roomUpgradeExcessCents > 0) {
    shareParts.push(`${copy.roomUpgrade} ${formatPeso(input.roomUpgradeExcessCents)}`);
  }
  if (input.doctorExcessPfCents > 0) {
    shareParts.push(`${copy.excessPf} ${formatPeso(input.doctorExcessPfCents)}`);
  }
  if (input.coverageShortfallCents > 0) {
    shareParts.push(`${copy.shortfall} ${formatPeso(input.coverageShortfallCents)}`);
  }

  const sentences = [
    copy.banner,
    `${copy.totalCharges}: ${formatPeso(input.grossCents)}${chargeSubparts.length ? ` (${chargeSubparts.join(', ')})` : ''}.`,
    `${copy.deductions}: ${deductions.length ? deductions.join(', ') : copy.noDeductions}.`,
    `${copy.patientShare}: ${formatPeso(input.netPatientDueCents)}${shareParts.length ? ` (${shareParts.join(', ')})` : ''}.`,
  ];

  if (input.paidCents > 0) sentences.push(`${copy.paid}: ${formatPeso(input.paidCents)}.`);
  if (input.financedCents > 0) sentences.push(`${copy.financed}: ${formatPeso(input.financedCents)}.`);
  sentences.push(`${copy.remaining}: ${formatPeso(input.balanceCents)}.`);
  if (input.creditCents > 0) sentences.push(`${copy.credit}: ${formatPeso(input.creditCents)}.`);

  const actionLabels = CORA_ACTION_LABELS[input.language];
  const suggestedActions: CoraResponse['suggestedActions'] = [
    { actionType: 'NAVIGATE_BILL', label: actionLabels.NAVIGATE_BILL },
    input.balanceCents > 0
      ? { actionType: 'NAVIGATE_PAYMENT', label: actionLabels.NAVIGATE_PAYMENT }
      : { actionType: 'NAVIGATE_COVERAGE', label: actionLabels.NAVIGATE_COVERAGE },
  ];

  return {
    scopeDecision: 'ANSWERED',
    reply: sentences.join(' '),
    mode: input.mode,
    suggestedActions,
    modelUsed: 'ledger-summary-fallback',
  };
}

class CoraLedgerFallbackSignal extends Error {
  constructor(readonly fallback: CoraResponse & { modelUsed: string }) {
    super('Returning deterministic ledger summary fallback.');
  }
}

export class CoraService {
  async chat(options: CoraChatOptions): Promise<CoraResponse & { modelUsed: string }> {
    const {
      db,
      encounterId,
      facilityId,
      message,
      language = 'fil',
      mode = 'GENERAL',
      conversationHistory = [],
      forceRefresh,
      aiConfig,
    } = options;

    const matchCond = isUuid(encounterId)
      ? or(eq(encounters.id, encounterId), eq(encounters.encounterNumber, encounterId))
      : eq(encounters.encounterNumber, encounterId);

    const [row] = await db
      .select({ encounter: encounters, patient: patients, facility: facilities })
      .from(encounters)
      .innerJoin(patients, eq(patients.id, encounters.patientId))
      .innerJoin(facilities, eq(facilities.id, encounters.facilityId))
      .where(and(matchCond, eq(encounters.facilityId, facilityId), isNull(encounters.voidedAt)))
      .limit(1);

    if (!row) {
      throw new Error('The selected encounter was not found.');
    }

    const { encounter: enc, patient, facility } = row;
    const [physician] = await db
      .select({ fullName: staffUsers.fullName, prcLicense: staffUsers.prcLicense })
      .from(staffUsers)
      .where(eq(staffUsers.id, enc.attendingPhysicianId));
    const [ledger] = await db.select().from(ledgers).where(eq(ledgers.encounterId, enc.id));
    const [claim] = await db.select().from(philhealthClaims).where(eq(philhealthClaims.encounterId, enc.id));
    const [hmo] = await db.select().from(hmoCoverages).where(eq(hmoCoverages.encounterId, enc.id));
    const chargeRows = await db
      .select()
      .from(charges)
      .where(and(eq(charges.encounterId, enc.id), isNull(charges.removedAt)))
      .orderBy(asc(charges.postedAt));
    const paymentRows = await db
      .select({
        reference: payments.reference,
        amountCents: payments.amountCents,
        rail: payments.rail,
        createdAt: payments.createdAt,
        officialReceiptNumber: receipts.officialReceiptNumber,
      })
      .from(payments)
      .innerJoin(receipts, eq(receipts.paymentId, payments.id))
      .where(eq(payments.encounterId, enc.id))
      .orderBy(asc(payments.createdAt));
    const noteRows = await db.select().from(promissoryNotes).where(eq(promissoryNotes.encounterId, enc.id));
    const disputeRows = await db
      .select()
      .from(disputes)
      .where(eq(disputes.encounterId, enc.id))
      .orderBy(desc(disputes.createdAt));
    const [activePass] = await db
      .select()
      .from(gatePasses)
      .where(and(eq(gatePasses.encounterId, enc.id), eq(gatePasses.status, 'ACTIVE')))
      .limit(1);

    const pendingSteps: string[] = [];
    if (!enc.pfSignedAt) pendingSteps.push("Doctor's Professional Fee Sign-Off");
    if (!enc.pharmacyClearedAt) pendingSteps.push('Pharmacy Return-to-Stock Audit');
    if (hmo && hmo.loaStatus !== 'APPROVED') pendingSteps.push('HMO Final LOA Approval');
    if (enc.stage !== 'CLEARED' && (ledger?.balanceCents ?? 0) > 0) {
      pendingSteps.push('Final Cashier or Mobile Settlement');
    }

    const mappedStage = enc.stage === 'CLEARED' ? 'CLEARED_GATE_PASS' : enc.stage;

    const encounterCtx: CoraEncounterContext = {
      patientPseudonym: patient.fullName,
      roomBedMasked: enc.bedCode,
      roomCategory: enc.roomCategory,
      admissionDate: enc.admittedAt.toISOString(),
      primaryDiagnosis: `${enc.primaryDiagnosis} (${enc.icd10Code})`,
      stage: mappedStage,
      hmoProviderName: hmo?.providerName ?? 'None',
      hmoApprovalCode: hmo?.approvalCode ?? undefined,
      hmoDisallowedConsumables: (ledger?.nonCoveredCents ?? 0) / 100,
      pendingChecklistSteps: pendingSteps,
    };

    const grossTotalCents = ledger?.grossCents ?? 0;
    const vatExemptionCents = ledger?.vatExemptionCents ?? 0;
    const seniorPwdDiscountCents = ledger?.seniorPwdDiscountCents ?? 0;
    const discountedBaseCents = Math.max(0, grossTotalCents - vatExemptionCents - seniorPwdDiscountCents);
    const philhealthHciCents = claim?.hciCents ?? 0;
    const philhealthPfCents = claim?.pfCents ?? 0;
    const philhealthAppliedCents = ledger?.philhealthCents ?? 0;
    const hmoAppliedCents = ledger?.hmoCents ?? 0;
    const hmoRawApprovedCents = hmo?.approvedCents ?? 0;
    const hmoMblTotalCents = hmo?.mblCents ?? 0;
    const hmoMblRemainingCents = Math.max(0, hmoMblTotalCents - hmoRawApprovedCents);
    const coverageShortfallCents = ledger?.coverageShortfallCents ?? 0;
    const netPatientDueCents = ledger?.netPatientDueCents ?? 0;
    const paidCents = ledger?.paidCents ?? 0;
    const financedCents = ledger?.financedCents ?? 0;
    const remainingBalanceCents = ledger?.balanceCents ?? 0;
    const creditCents = ledger?.creditCents ?? 0;
    const excludedConsumablesCents = ledger?.nonCoveredCents ?? 0;

    const grossTotal = grossTotalCents / 100;
    const vatExemption = vatExemptionCents / 100;
    const seniorPwdDiscount = seniorPwdDiscountCents / 100;
    const philhealthHci = philhealthHciCents / 100;
    const philhealthPf = philhealthPfCents / 100;
    const philhealthTotal = philhealthAppliedCents / 100;

    const financialCtx: CoraFinancialContext = {
      grossHospitalCharges: (ledger?.grossHospitalCents ?? 0) / 100,
      grossDoctorFee: (ledger?.grossProfessionalFeeCents ?? 0) / 100,
      grossTotal,
      vatExemption,
      seniorPwdDiscount,
      netVatDiscountedBase: discountedBaseCents / 100,
      philhealthHci,
      philhealthPf,
      philhealthTotal,
      hmoApprovedAmount: hmoAppliedCents / 100,
      netPatientDue: netPatientDueCents / 100,
      patientPaid: paidCents / 100,
      remainingBalance: remainingBalanceCents / 100,
      roomUpgradeExcess: enc.roomUpgradeExcessCents / 100,
      excludedConsumables: excludedConsumablesCents / 100,
      doctorExcessPf: enc.doctorExcessPfCents / 100,
      coverageShortfall: coverageShortfallCents / 100,
      promissoryFinanced: financedCents / 100,
      overpaymentCredit: creditCents / 100,
      hmoRawApprovedAmount: hmoRawApprovedCents / 100,
    };

    const activeNote = noteRows.find((n) => n.status === 'ACTIVE') ?? noteRows[0];
    const openDisputes = disputeRows.filter((d) => d.status === 'OPEN');
    const disputedTotalCents = openDisputes.reduce((sum, d) => sum + d.contestedCents, 0);
    const monthlyInstallmentCents = activeNote
      ? Math.round(activeNote.principalCents / activeNote.months)
      : 0;

    const allowedLedgerCents = collectAllowedLedgerCents({
      ledger,
      encounter: {
        roomUpgradeExcessCents: enc.roomUpgradeExcessCents,
        doctorExcessPfCents: enc.doctorExcessPfCents,
      },
      claim,
      hmo,
      charges: chargeRows,
      payments: paymentRows,
      activeNote,
      disputes: disputeRows,
    });

    const authoritativeLedger = {
      currency: 'PHP',
      groundingRule:
        'Quote ONLY exact peso figures from authoritativeLedger/charges/payments/promissoryNote. Deductions (vatExemption, seniorPwdDiscount, philhealth, hmo) reduce grossTotal and are NEVER owed by the patient or included in remainingBalance.',
      chargesSummary: {
        hospitalCharges: pesosField(ledger?.grossHospitalCents ?? 0),
        doctorProfessionalFee: pesosField(ledger?.grossProfessionalFeeCents ?? 0),
        grossTotal: pesosField(grossTotalCents),
      },
      deductionsReducingBill: {
        note: 'Subtracted from grossTotal in legal order; absorbed by statute, PhilHealth, or HMO—NEVER owed by the patient.',
        vatExemption: pesosField(vatExemptionCents),
        seniorPwdDiscount: pesosField(seniorPwdDiscountCents),
        netVatDiscountedBase: pesosField(discountedBaseCents),
        philhealth: {
          hciShare: pesosField(philhealthHciCents),
          pfShare: pesosField(philhealthPfCents),
          appliedDeduction: pesosField(philhealthAppliedCents),
          statutoryCaseRateTotal: pesosField(philhealthHciCents + philhealthPfCents),
        },
        hmo: {
          providerName: hmo?.providerName ?? 'None',
          loaStatus: hmo?.loaStatus ?? 'NOT_APPLICABLE',
          appliedDeduction: pesosField(hmoAppliedCents),
          approvedLoaAmount: pesosField(hmoRawApprovedCents),
          mblTotal: pesosField(hmoMblTotalCents),
          mblRemaining: pesosField(hmoMblRemainingCents),
        },
      },
      patientResponsibilityBreakdown: {
        note: 'ONLY these patient-responsibility amounts make up netPatientDue (not PhilHealth or HMO coverage).',
        excludedConsumables: pesosField(excludedConsumablesCents),
        roomUpgradeExcess: pesosField(enc.roomUpgradeExcessCents),
        doctorExcessPf: pesosField(enc.doctorExcessPfCents),
        coverageShortfall: pesosField(coverageShortfallCents),
        netPatientDue: pesosField(netPatientDueCents),
      },
      settlementAndBalance: {
        netPatientDue: pesosField(netPatientDueCents),
        patientPaid: pesosField(paidCents),
        promissoryFinanced: pesosField(financedCents),
        remainingBalance: pesosField(remainingBalanceCents),
        overpaymentCredit: pesosField(creditCents),
      },
    };

    const evidence = {
      authoritativeLedger,
      facility: {
        name: facility.name,
        address: facility.address,
        tin: facility.tin,
        accreditationNumber: facility.philhealthAccreditation,
        unrecordedPolicies: 'Phone number, visiting hours and amenity rules are not recorded.',
      },
      patientStatus: {
        isSeniorCitizen: patient.discountKind === 'SENIOR',
        isPwd: patient.discountKind === 'PWD',
      },
      attendingDoctor: {
        name: physician?.fullName ?? 'Attending Physician',
        prcLicense: physician?.prcLicense ?? null,
        pfSigned: Boolean(enc.pfSignedAt),
      },
      coverage: {
        caseRateCode: claim?.caseRateCode ?? null,
        claimNumber: claim?.claimNumber ?? null,
        claimStatus: claim?.status ?? null,
        hmoLoaStatus: hmo?.loaStatus ?? 'NOT_APPLICABLE',
        hmoMblTotal: hmoMblTotalCents / 100,
        hmoMblRemaining: hmoMblRemainingCents / 100,
      },
      settlement: {
        paymentStatus:
          remainingBalanceCents === 0
            ? financedCents > 0
              ? 'PROMISSORY'
              : 'PAID'
            : paidCents > 0
              ? 'PARTIAL'
              : 'UNPAID',
        gatePassCode: activePass?.passNumber ?? null,
        gatePassIssuedAt: activePass?.issuedAt?.toISOString() ?? null,
        elapsedMinutes: enc.mghOrderedAt ? minutesBetween(enc.mghOrderedAt, enc.clearedAt ?? new Date()) : 0,
        slaTargetMinutes: facility.slaBreachMinutes,
      },
      disputes: {
        openDisputeCount: openDisputes.length,
        disputedTotalAmount: disputedTotalCents / 100,
        disputedTotalFormatted: formatPeso(disputedTotalCents),
      },
      charges: chargeRows.map((i) => ({
        category: i.category,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPriceCents / 100,
        unitPriceFormatted: formatPeso(i.unitPriceCents),
        grossAmount: i.grossCents / 100,
        grossAmountFormatted: formatPeso(i.grossCents),
        coverage: i.coverage,
        isDisputed: i.isDisputed,
        explainer: i.explainer,
      })),
      payments: paymentRows.map((p) => ({
        paymentMethod: p.rail,
        amount: p.amountCents / 100,
        amountFormatted: formatPeso(p.amountCents),
        orNumber: p.officialReceiptNumber,
        referenceNumber: p.reference,
        timestamp: p.createdAt.toISOString(),
      })),
      promissoryNote: activeNote
        ? {
            principalAmount: activeNote.principalCents / 100,
            principalAmountFormatted: formatPeso(activeNote.principalCents),
            installmentMonths: activeNote.months,
            monthlyInstallment: monthlyInstallmentCents / 100,
            monthlyInstallmentFormatted: formatPeso(monthlyInstallmentCents),
            firstDueDate: activeNote.firstDueDate,
            status: activeNote.status,
          }
        : null,
    };

    const scrubCtx = {
      fullName: patient.fullName,
      mrn: patient.mrn,
      philhealthPin: patient.philhealthPinLast4 ?? undefined,
      contactNumber: patient.contactPhoneLast4,
      roomBed: enc.bedCode,
      encounterNumber: enc.encounterNumber,
      doctorName: physician?.fullName,
      prcLicense: physician?.prcLicense ?? undefined,
      claimNumber: claim?.claimNumber,
      hmoCardMasked: hmo?.memberNumberLast4,
      hmoApprovalCode: hmo?.approvalCode ?? undefined,
      borrowerName: activeNote?.borrowerName,
    };

    const scrubbedMessage = scrubPatientData(message, scrubCtx);
    const scrubbedHistory = conversationHistory.slice(-6).map((turn) => ({
      role: turn.role,
      content: scrubPatientData(turn.content, scrubCtx).scrubbedText,
    }));
    const rawPrompt = buildCoraPrompt(
      encounterCtx,
      financialCtx,
      scrubbedMessage.scrubbedText,
      language,
      mode,
      evidence,
      scrubbedHistory,
    );
    const scrubbed = scrubPatientData(rawPrompt, scrubCtx);

    const allowedFormattedAmounts = [...allowedLedgerCents].sort((a, b) => a - b).map(formatPeso);
    const deterministicFallback = buildDeterministicLedgerSummary({
      language,
      mode,
      hmoProviderName: hmo?.providerName ?? null,
      grossHospitalCents: ledger?.grossHospitalCents ?? 0,
      grossProfessionalFeeCents: ledger?.grossProfessionalFeeCents ?? 0,
      grossCents: grossTotalCents,
      vatExemptionCents,
      seniorPwdDiscountCents,
      philhealthCents: philhealthAppliedCents,
      hmoCents: hmoAppliedCents,
      excludedConsumablesCents,
      roomUpgradeExcessCents: enc.roomUpgradeExcessCents,
      doctorExcessPfCents: enc.doctorExcessPfCents,
      coverageShortfallCents,
      netPatientDueCents,
      paidCents,
      financedCents,
      balanceCents: remainingBalanceCents,
      creditCents,
    });

    const hydrateAnswer = (answer: CoraResponse, modelUsed: string): CoraResponse & { modelUsed: string } => {
      const hydratedReply = rehydrateText(
        rehydrateText(answer.reply, scrubbed.tokenMap),
        scrubbedMessage.tokenMap,
      );
      return {
        scopeDecision: answer.scopeDecision,
        reply: hydratedReply,
        mode: answer.mode || mode,
        suggestedActions: (answer.suggestedActions || []).map((a) => ({
          label: rehydrateText(a.label, scrubbed.tokenMap),
          actionType: a.actionType,
        })),
        modelUsed,
      };
    };

    try {
      return await cachedAiResult({
        module: 'cora-chat',
        scope: { facilityId, userId: options.userId, encounterId: enc.id },
        input: {
          prompt: rawPrompt,
          language,
          policy: coraLanguageCachePolicy(language),
          schema: CORA_RESPONSE_SCHEMA,
        },
        ttlMs: AI_CACHE_TTL.cora,
        aiConfig,
        forceRefresh,
        validate: validateAiResult(CoraResponseSchema.extend({ modelUsed: z.string().min(1) })),
        generate: async () => {
          const deadline = Date.now() + 40000;
          if (obviousRestrictedRequest(scrubbedMessage.scrubbedText)) {
            return {
              scopeDecision: 'RESTRICTED' as const,
              reply: coraPolicyNotice('RESTRICTED', language),
              mode,
              suggestedActions: [],
              modelUsed: 'policy-guard',
            };
          }

          const first = await generateLocalizedCoraReply({
            prompt: scrubbed.scrubbedText,
            language,
            aiConfig,
            deadline,
          });
          if (first.answer.scopeDecision === 'OUT_OF_SCOPE' || first.answer.scopeDecision === 'RESTRICTED') {
            return {
              scopeDecision: first.answer.scopeDecision,
              reply: coraPolicyNotice(first.answer.scopeDecision, language),
              mode,
              suggestedActions: [],
              modelUsed: first.modelUsed,
            };
          }

          const firstHydrated = hydrateAnswer(first.answer, first.modelUsed);
          const ungroundedFirst = findUngroundedPesoAmounts(firstHydrated.reply, allowedLedgerCents);
          if (ungroundedFirst.length === 0) {
            return firstHydrated;
          }

          // Retry once automatically with an explicit correction listing allowed ledger figures.
          if (Date.now() < deadline - 1000) {
            const correctionPrompt = buildGroundingCorrectionPrompt(
              scrubbed.scrubbedText,
              ungroundedFirst,
              allowedFormattedAmounts,
            );
            try {
              const retry = await generateLocalizedCoraReply({
                prompt: correctionPrompt,
                language,
                aiConfig,
                deadline,
              });
              if (
                retry.answer.scopeDecision === 'OUT_OF_SCOPE' ||
                retry.answer.scopeDecision === 'RESTRICTED'
              ) {
                return {
                  scopeDecision: retry.answer.scopeDecision,
                  reply: coraPolicyNotice(retry.answer.scopeDecision, language),
                  mode,
                  suggestedActions: [],
                  modelUsed: retry.modelUsed,
                };
              }
              const retryHydrated = hydrateAnswer(retry.answer, retry.modelUsed);
              if (findUngroundedPesoAmounts(retryHydrated.reply, allowedLedgerCents).length === 0) {
                return retryHydrated;
              }
            } catch {
              // Fall through to deterministic ledger summary so the demo never surfaces an error here.
            }
          }

          throw new CoraLedgerFallbackSignal(deterministicFallback);
        },
      });
    } catch (err) {
      if (err instanceof CoraLedgerFallbackSignal) {
        return err.fallback;
      }
      throw err;
    } finally {
      clearTokenMap(scrubbed.tokenMap);
      clearTokenMap(scrubbedMessage.tokenMap);
    }
  }
}

export const coraService = new CoraService();
