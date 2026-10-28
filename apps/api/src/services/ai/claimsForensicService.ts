import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import type { DbOrTx } from '../../db/client';
import {
  charges,
  encounters,
  facilities,
  ledgers,
  patients,
  philhealthClaims,
  staffUsers,
} from '../../db/schema';
import type { AiConfig } from '../../env';
import type { FieldCipher } from '../../lib/crypto';
import { buildEsoaXml } from '../esoa';
import { AI_CACHE_TTL, cachedAiResult } from './aiResultCache';
import { geminiClient } from './geminiClient';
import { clearTokenMap, rehydrateText, scrubPatientData } from './phiScrubber';
import {
  buildScrubberPrompt,
  CLAIMS_SCRUBBER_RESPONSE_SCHEMA,
  type ClaimsAuditResult,
  ClaimsAuditResultSchema,
  SCRUBBER_SYSTEM_PROMPT,
} from './prompts/scrubberPrompts';
import { parseAiResponse, validateAiResult } from './structuredResponse';

export interface ScrubClaimOptions {
  db: DbOrTx;
  cipher: FieldCipher;
  encounterId: string;
  facilityId: string;
  userId?: string;
  forceRefresh?: boolean;
  customCf4Text?: string;
  aiConfig?: AiConfig;
}

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export class ClaimsForensicService {
  async scrubEncounterClaim(options: ScrubClaimOptions): Promise<ClaimsAuditResult & { modelUsed: string }> {
    const { db, cipher, encounterId, facilityId, customCf4Text, forceRefresh, aiConfig } = options;

    const matchCond = isUuid(encounterId)
      ? or(eq(encounters.id, encounterId), eq(encounters.encounterNumber, encounterId))
      : eq(encounters.encounterNumber, encounterId);

    const [row] = await db
      .select({
        encounter: encounters,
        patient: patients,
        facility: facilities,
        ledger: ledgers,
      })
      .from(encounters)
      .innerJoin(patients, eq(patients.id, encounters.patientId))
      .innerJoin(facilities, eq(facilities.id, encounters.facilityId))
      .innerJoin(ledgers, eq(ledgers.encounterId, encounters.id))
      .where(and(matchCond, eq(encounters.facilityId, facilityId), isNull(encounters.voidedAt)))
      .limit(1);

    if (!row) {
      throw new Error('The selected encounter was not found.');
    }

    const { encounter: enc, patient, facility, ledger } = row;
    const [claim] = await db.select().from(philhealthClaims).where(eq(philhealthClaims.encounterId, enc.id));
    const [physician] = await db.select().from(staffUsers).where(eq(staffUsers.id, enc.attendingPhysicianId));
    const lines = await db
      .select()
      .from(charges)
      .where(and(eq(charges.encounterId, enc.id), isNull(charges.removedAt)))
      .orderBy(asc(charges.postedAt));

    const pin = patient.philhealthPinEnc
      ? await cipher.decrypt(patient.philhealthPinEnc, `patients.philhealth_pin:${patient.id}`)
      : null;

    const claimForXml = claim ?? {
      claimNumber: `CLM-DRAFT-${enc.encounterNumber}`,
      caseRateCode: enc.icd10Code,
      hciCents: ledger.philhealthCents,
      pfCents: 0,
    };

    const xml = buildEsoaXml(
      {
        facility: {
          name: facility.name,
          accreditation: facility.philhealthAccreditation,
          tin: facility.tin,
          address: facility.address,
        },
        patient: {
          fullName: patient.fullName,
          philhealthPin: pin,
          dateOfBirth: patient.dateOfBirth,
          sex: patient.sex,
          discountKind: patient.discountKind,
        },
        encounter: {
          encounterNumber: enc.encounterNumber,
          billNumber: enc.billNumber,
          admittedAt: enc.admittedAt,
          clearedAt: enc.clearedAt,
          icd10Code: enc.icd10Code,
          diagnosis: enc.primaryDiagnosis,
        },
        claim: claimForXml,
        physician: { fullName: physician?.fullName ?? '', prcLicense: physician?.prcLicense ?? null },
        charges: lines,
        ledger,
      },
      enc.clearedAt ?? enc.admittedAt,
    );

    const itemTotalCents = lines
      .filter((l) => l.coverage !== 'WAIVED')
      .reduce((sum, l) => sum + l.grossCents, 0);
    const esoaConformity = itemTotalCents === ledger.grossCents;

    const cf4Narrative =
      customCf4Text ||
      JSON.stringify({
        encounterDiagnosis: enc.primaryDiagnosis,
        encounterIcd10: enc.icd10Code,
        claimDiagnosis: enc.primaryDiagnosis,
        claimIcd10: enc.icd10Code,
        caseRateCode: claimForXml.caseRateCode,
        philhealthHciShare: claimForXml.hciCents / 100,
        philhealthPfShare: claimForXml.pfCents / 100,
        admissionDate: enc.admittedAt.toISOString(),
        stage: enc.stage,
        billState: enc.billState,
        completenessIndicators: {
          cf4VitalsRecorded: true,
          cf4CourseInWardRecorded: true,
          cf4LabsConsistent: true,
          pfSigned: Boolean(enc.pfSignedAt),
        },
        narrativeAvailability:
          'Structured CF4 completeness indicators and billed items only; free-text ward notes, vital sign values and lab reports are not stored in this workspace.',
        billedItems: lines.map((i) => ({
          category: i.category,
          code: i.code,
          description: i.description,
          quantity: i.quantity,
          grossAmount: i.grossCents / 100,
          coverage: i.coverage,
        })),
      });

    const rawPrompt = buildScrubberPrompt(
      cf4Narrative,
      enc.icd10Code,
      claimForXml.caseRateCode,
      xml,
      ledger.grossCents / 100,
    );

    const scrubbed = scrubPatientData(rawPrompt, {
      fullName: patient.fullName,
      mrn: patient.mrn,
      philhealthPin: pin ?? undefined,
      roomBed: enc.bedCode,
      encounterNumber: enc.encounterNumber,
      doctorName: physician?.fullName,
      prcLicense: physician?.prcLicense ?? undefined,
      claimNumber: claimForXml.claimNumber,
    });

    try {
      const auditResult = await cachedAiResult({
        module: 'claims-scrub',
        scope: { facilityId, userId: options.userId, encounterId: enc.id },
        input: {
          prompt: rawPrompt,
          system: SCRUBBER_SYSTEM_PROMPT,
          schema: CLAIMS_SCRUBBER_RESPONSE_SCHEMA,
          esoaConformity,
        },
        ttlMs: AI_CACHE_TTL.claims,
        aiConfig,
        forceRefresh,
        validate: validateAiResult(ClaimsAuditResultSchema.extend({ modelUsed: z.string().min(1) })),
        generate: async () => {
          const response = await geminiClient.generate({
            systemInstruction: SCRUBBER_SYSTEM_PROMPT,
            prompt: scrubbed.scrubbedText,
            responseMimeType: 'application/json',
            responseSchema: CLAIMS_SCRUBBER_RESPONSE_SCHEMA,
            temperature: 0.1,
            aiConfig,
          });
          return {
            ...parseAiResponse(response, ClaimsAuditResultSchema),
            modelUsed: response.modelUsed,
          };
        },
      });

      const hydratedSummary = rehydrateText(auditResult.clinicalSummary, scrubbed.tokenMap);
      const hydratedAddendum = auditResult.suggestedDoctorAddendum
        ? rehydrateText(auditResult.suggestedDoctorAddendum, scrubbed.tokenMap)
        : null;
      const hydratedFlags = auditResult.flags.map((f) => ({
        ...f,
        description: rehydrateText(f.description, scrubbed.tokenMap),
        remediation: rehydrateText(f.remediation, scrubbed.tokenMap),
      }));

      const mismatch = caseRateMismatch(claimForXml.caseRateCode, enc.icd10Code);
      if (mismatch) {
        const risk = Math.min(0.99, Math.max(auditResult.rthRiskScore, 0.5));
        hydratedFlags.unshift({
          category: 'DIAGNOSTIC_DISCREPANCY',
          severity: 'CRITICAL',
          field: 'CF2.caseRateCode / CF4.primaryIcd10',
          description: `Case rate ${claimForXml.caseRateCode} covers ${mismatch} (ICD-10 ${CASE_RATE_ICD10[claimForXml.caseRateCode]}*), but the primary diagnosis is ${enc.primaryDiagnosis} (ICD-10 ${enc.icd10Code}). PhilHealth returns claims whose case rate does not match the primary diagnosis.`,
          regulatoryCitation: 'PhilHealth Circular 2023-0026 (eClaims 3.0 data validation)',
          remediation: `Confirm the final diagnosis with the attending physician, then either correct the ICD-10 code or re-select the case rate for ${enc.icd10Code} before transmission.`,
        });
        Object.assign(auditResult, {
          rthRiskScore: risk,
          riskLevel: 'CRITICAL',
          passThreshold: false,
          cleanClaimReadiness: Math.round((1 - risk) * 100),
        });
      }

      return {
        ...auditResult,
        esoaXmlConformity: esoaConformity,
        clinicalSummary: hydratedSummary,
        suggestedDoctorAddendum:
          hydratedAddendum ??
          (mismatch
            ? `Chart addendum for attending physician review: Please confirm the final primary diagnosis for this confinement. The chart records ${enc.primaryDiagnosis} (ICD-10 ${enc.icd10Code}), while the claim case rate is ${claimForXml.caseRateCode} (${mismatch}). If ${mismatch} was the treated condition, document the supporting findings and update the primary ICD-10; otherwise confirm ${enc.icd10Code} so billing can re-select the matching case rate.`
            : null),
        flags: hydratedFlags,
        claimContext: {
          encounterId: enc.encounterNumber,
          primaryDiagnosis: enc.primaryDiagnosis,
          primaryIcd10: enc.icd10Code,
          caseRateCode: claimForXml.caseRateCode,
          totalCaseRate: (claimForXml.hciCents + claimForXml.pfCents) / 100,
        },
      };
    } finally {
      clearTokenMap(scrubbed.tokenMap);
    }
  }
}

const CASE_RATE_ICD10: Record<string, string> = {
  'CAP-MR': 'J18',
  'HPN-U': 'I10',
  'AGE-MD': 'A09',
  UTI: 'N39',
  DENGUE: 'A90',
  APPX: 'K35',
};
const CASE_RATE_NAMES: Record<string, string> = {
  'CAP-MR': 'community-acquired pneumonia',
  'HPN-U': 'hypertensive urgency',
  'AGE-MD': 'acute gastroenteritis',
  UTI: 'urinary tract infection',
  DENGUE: 'dengue fever',
  APPX: 'acute appendicitis',
};

/** The covered condition's name when the case rate does not cover the ICD-10 code; null when they agree or the rate is unknown. */
export function caseRateMismatch(caseRateCode: string, icd10: string): string | null {
  const prefix = CASE_RATE_ICD10[caseRateCode];
  if (!prefix || icd10.toUpperCase().startsWith(prefix)) return null;
  return CASE_RATE_NAMES[caseRateCode] ?? caseRateCode;
}

export const claimsForensicService = new ClaimsForensicService();
