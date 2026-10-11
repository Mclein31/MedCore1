import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { philhealthClaims } from '../../db/schema';
import { getHydratedEncounter, invalidateEncountersCache } from '../../routes/encounters';
import { getClaimEsoaXml } from '../../routes/claims';
import { scrubPatientData, rehydrateText, clearTokenMap } from './phiScrubber';
import { AiInferenceError, geminiClient } from './geminiClient';
import { parseAiResponse } from './structuredResponse';
import { getAiConfig } from '../../config/aiConfig';
import { ClaimsAuditResult, ClaimsAuditResultSchema, SCRUBBER_SYSTEM_PROMPT, CLAIMS_SCRUBBER_RESPONSE_SCHEMA, buildScrubberPrompt } from './prompts/scrubberPrompts';

export interface RunPreflightAuditOptions {
  encounterId: string;
  facilityId?: string;
  forceEscalation?: boolean;
  env?: Record<string, any>;
}

function canonicalField(flag: ClaimsAuditResult['flags'][number]): string {
  const text = `${flag.field} ${flag.description}`;
  if (flag.category === 'MISSING_CF4_FIELD') {
    if (/vital/i.test(text)) return 'cf4VitalsRecorded';
    if (/course|ward|progress/i.test(text)) return 'cf4CourseInWardRecorded';
    if (/lab|diagnostic.*document/i.test(text)) return 'cf4LabsConsistent';
    if (/filing|60.day/i.test(text)) return 'filingDeadline';
  }
  return flag.field;
}
export function normalizeAuditRisk(audit: ClaimsAuditResult): ClaimsAuditResult {
  if (!audit.esoaXmlConformity) audit.flags.push({ category: 'DIAGNOSTIC_DISCREPANCY', severity: 'CRITICAL', field: 'esoaXmlConformity',
    description: 'The supplied eSOA did not pass conformity review.', regulatoryCitation: 'eSOA conformity review', remediation: 'Correct and revalidate the XML before filing.' });
  const uniqueFlags = new Map<string, ClaimsAuditResult['flags'][number]>();
  const severityWeight = { INFO: 0, WARNING: 1, CRITICAL: 2 };
  for (const flag of audit.flags) {
    const field = canonicalField(flag), key = `${flag.category}:${field}`;
    const existing = uniqueFlags.get(key);
    if (!existing || severityWeight[flag.severity] > severityWeight[existing.severity]) uniqueFlags.set(key, { ...flag, field });
  }
  audit.flags = [...uniqueFlags.values()];
  const baseRisk = 0.04;
  const penalties = audit.flags.filter(f => f.severity !== 'INFO').map(f => ({
    factor: f.category,
    points: f.category === 'SPC_RULE_RISK' ? 0 : f.category === 'MEDICATION_DISCORDANCE' ? 0.30 :
      f.category === 'DIAGNOSTIC_DISCREPANCY' ? 0.50 : /vital/i.test(f.field) ? 0.40 :
      /course|ward/i.test(f.field) ? 0.45 : /filing|60.day/i.test(f.field) ? 0.60 : 0.25,
    description: f.description
  })).filter(p => p.points > 0);
  const total = Math.round((baseRisk + penalties.reduce((sum, p) => sum + p.points, 0)) * 10000) / 10000;
  const score = Math.min(0.99, total);
  const pass = score <= 0.15;
  return { ...audit, rthRiskScore: score, passThreshold: pass,
    cleanClaimReadiness: Math.round((1 - score) * 100),
    riskLevel: score <= 0.07 ? 'LOW' : score <= 0.15 ? 'MODERATE' : score <= 0.35 ? 'HIGH' : 'CRITICAL',
    riskCalculation: { baseRisk, penalties,
      formula: `4% baseline + ${(100 * (total - baseRisk)).toFixed(0)}% penalties${total > 0.99 ? ' (capped at 99%)' : ''} = ${(100 * score).toFixed(0)}% RTH risk`,
      verdict: pass ? 'Passes configured review threshold (≤15%)' : 'Exceeds configured review threshold (15%); remediation required.' }
  };
}
function auditFingerprint(enc: NonNullable<Awaited<ReturnType<typeof getHydratedEncounter>>>): string {
  return JSON.stringify({
    primaryDiagnosis: enc.primaryDiagnosis, primaryIcd10: enc.primaryIcd10,
    claim: { primaryDescription: enc.philhealth.primaryDescription, primaryIcd10: enc.philhealth.primaryIcd10,
      caseRateCode: enc.philhealth.caseRateCode, totalCaseRate: enc.philhealth.totalCaseRate,
      cf4VitalsRecorded: enc.philhealth.cf4VitalsRecorded, cf4CourseInWardRecorded: enc.philhealth.cf4CourseInWardRecorded,
      cf4LabsConsistent: enc.philhealth.cf4LabsConsistent },
    items: [...enc.items].sort((a, b) => a.id.localeCompare(b.id)), waterfall: enc.waterfall
  });
}
export class ClaimsForensicService {
  async runPreflightAudit(options: RunPreflightAuditOptions): Promise<ClaimsAuditResult> {
    const enc = await getHydratedEncounter(options.encounterId, options.facilityId);
    if (!enc) throw new Error('The selected encounter was not found.');
    if (!options.facilityId) throw new Error('A facility is required to audit the selected claim.');
    const xml = await getClaimEsoaXml(enc.philhealth.id, options.facilityId);
    if (!xml) throw new Error('The selected encounter has no PhilHealth claim to audit.');
    const profile = {
      patient: enc.patient.fullName, age: enc.patient.age, gender: enc.patient.gender,
      encounterNumber: enc.encounterNumber, admissionDate: enc.admissionDate,
      encounterDiagnosis: enc.primaryDiagnosis, encounterIcd10: enc.primaryIcd10,
      claimDiagnosis: enc.philhealth.primaryDescription, claimIcd10: enc.philhealth.primaryIcd10,
      caseRateCode: enc.philhealth.caseRateCode, totalCaseRate: enc.philhealth.totalCaseRate,
      cf4VitalsRecorded: enc.philhealth.cf4VitalsRecorded,
      cf4CourseInWardRecorded: enc.philhealth.cf4CourseInWardRecorded,
      cf4LabsConsistent: enc.philhealth.cf4LabsConsistent,
      clinicalEvidence: 'Only completeness indicators are stored. Actual vital values, laboratory results, physician orders and daily progress notes are not available. Do not invent them.',
      items: enc.items.filter(i => !['WAIVED', 'SUPERVISORY_WAIVED'].includes(i.status)).map(i => ({ description: i.description, category: i.category, quantity: i.qty }))
    };
    // Scrub the complete outgoing prompt once so token mappings cannot collide.
    const scrubbed = scrubPatientData(buildScrubberPrompt(JSON.stringify(profile), enc.philhealth.primaryIcd10, null, xml, enc.waterfall.grossTotal), {
      fullName: enc.patient.fullName, mrn: enc.patient.mrn, philhealthPin: enc.patient.philhealthPin,
      contactNumber: enc.patient.contactNumber, roomBed: enc.roomBed, encounterNumber: enc.encounterNumber,
      doctorName: enc.attendingDoctor, doctorPan: enc.doctorPan, claimNumber: enc.philhealth.id,
      seniorCitizenId: enc.patient.seniorCitizenId, pwdId: enc.patient.pwdId
    });
    try {
      const config = getAiConfig(options.env);
      const response = await geminiClient.generate({
        model: options.forceEscalation ? config.geminiProModel : config.geminiModel,
        systemInstruction: SCRUBBER_SYSTEM_PROMPT, prompt: scrubbed.scrubbedText,
        responseMimeType: 'application/json', responseSchema: CLAIMS_SCRUBBER_RESPONSE_SCHEMA,
        temperature: 0.1, env: options.env
      });
      const parsed = parseAiResponse(response, ClaimsAuditResultSchema);
      const addFlag = (field: string, description: string) => {
        const existing = parsed.flags.find(f => canonicalField(f) === field && f.category === 'MISSING_CF4_FIELD');
        if (existing) existing.severity = 'CRITICAL';
        else parsed.flags.push({ category: 'MISSING_CF4_FIELD', severity: 'CRITICAL', field, description,
          regulatoryCitation: 'CF4 completeness review', remediation: 'Verify and complete the source chart before filing.' });
      };
      if (!enc.philhealth.cf4VitalsRecorded) addFlag('cf4VitalsRecorded', 'Admission vital signs are marked as not recorded.');
      if (!enc.philhealth.cf4CourseInWardRecorded) addFlag('cf4CourseInWardRecorded', 'Course in ward is marked as not recorded.');
      if (!enc.philhealth.cf4LabsConsistent) addFlag('cf4LabsConsistent', 'Diagnostic documentation is marked as inconsistent.');
      if (enc.primaryIcd10 !== enc.philhealth.primaryIcd10) {
        const existing = parsed.flags.find(f => f.category === 'DIAGNOSTIC_DISCREPANCY' && f.field === 'primaryIcd10');
        if (existing) existing.severity = 'CRITICAL';
        else parsed.flags.push({ category: 'DIAGNOSTIC_DISCREPANCY', severity: 'CRITICAL', field: 'primaryIcd10',
          description: `Encounter diagnosis ${enc.primaryIcd10} differs from claim diagnosis ${enc.philhealth.primaryIcd10}.`,
          regulatoryCitation: 'Claim and encounter diagnostic consistency review', remediation: 'Reconcile the claim code with the documented encounter diagnosis.' });
      }
      const audit = normalizeAuditRisk(parsed);
      audit.clinicalSummary = rehydrateText(audit.clinicalSummary, scrubbed.tokenMap);
      audit.flags = audit.flags.map(f => ({ ...f, description: rehydrateText(f.description, scrubbed.tokenMap), remediation: rehydrateText(f.remediation, scrubbed.tokenMap) }));
      if (audit.suggestedDoctorAddendum) audit.suggestedDoctorAddendum = rehydrateText(audit.suggestedDoctorAddendum, scrubbed.tokenMap);
      audit.modelUsed = response.modelUsed;
      audit.claimContext = { encounterId: enc.uuid, primaryDiagnosis: enc.philhealth.primaryDescription, primaryIcd10: enc.philhealth.primaryIcd10, caseRateCode: enc.philhealth.caseRateCode, totalCaseRate: enc.philhealth.totalCaseRate };
      const latest = await getHydratedEncounter(enc.uuid, options.facilityId);
      if (!latest || auditFingerprint(latest) !== auditFingerprint(enc)) throw new AiInferenceError('AI_STALE_CONTEXT', 'The selected claim changed during generation. Run the audit again using the updated record.', 409);
      const status = ['CLEAN', 'WARNING', 'INTERCEPTED'].includes(latest.philhealth.status) ? (audit.passThreshold ? 'CLEAN' as const : 'WARNING' as const) : latest.philhealth.status;
      await db.update(philhealthClaims).set({ rthRiskScore: audit.rthRiskScore.toFixed(4), status, updatedAt: new Date() }).where(eq(philhealthClaims.encounterId, enc.uuid));
      invalidateEncountersCache(options.facilityId);
      return audit;
    } finally { clearTokenMap(scrubbed.tokenMap); }
  }
}
export const claimsForensicService = new ClaimsForensicService();
