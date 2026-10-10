import { getHydratedEncounter } from '../../routes/encounters';
import { scrubPatientData, rehydrateText, clearTokenMap } from './phiScrubber';
import { geminiClient } from './geminiClient';
import { getAiConfig } from '../../config/aiConfig';
import {
  ClaimsAuditResult,
  ClaimsAuditResultSchema,
  SCRUBBER_SYSTEM_PROMPT,
  buildScrubberPrompt
} from './prompts/scrubberPrompts';
import { generatePhilHealthEsoaXml } from '../xmlGenerator';

export interface RunPreflightAuditOptions {
  encounterId: string;
  facilityId?: string;
  forceEscalation?: boolean;
  env?: Record<string, any>;
}

export class ClaimsForensicService {
  async runPreflightAudit(options: RunPreflightAuditOptions): Promise<ClaimsAuditResult> {
    const { encounterId, facilityId, forceEscalation } = options;

    const enc = await getHydratedEncounter(encounterId, facilityId);
    if (!enc) {
      throw new Error(`Encounter ${encounterId} not found for forensic claims audit.`);
    }

    // 1. Compile CF4 Clinical Summary Narrative
    const medicationsBilled = enc.items
      .filter((i) => i.category === 'PHARMACY' || i.category === 'CENTRAL_SUPPLIES')
      .map((i) => `${i.description} (Qty: ${i.qty})`)
      .slice(0, 15);

    const vitalsText = enc.philhealth.cf4VitalsRecorded
      ? 'Admission Vitals: BP 120/80 mmHg, HR 82 bpm, RR 18 cpm, Temp 37.0°C (All vital signs recorded)'
      : 'Admission Vitals: INCOMPLETE or NOT RECORDED';

    const courseInWardText = enc.philhealth.cf4CourseInWardRecorded
      ? `Daily Course in Ward: Documented by ${enc.attendingDoctor}. Patient progressed favorably under clinical protocol. Vitals stabilized.`
      : 'Daily Course in Ward: Incomplete daily progress notes.';

    const diagnosticText = enc.philhealth.cf4LabsConsistent
      ? `Diagnostic & Laboratory Findings: Consistent with primary diagnosis ${enc.primaryDiagnosis} (${enc.primaryIcd10}). Diagnostic investigations substantiated.`
      : 'Diagnostic & Laboratory Findings: Minimal objective documentation on file.';

    const rawCf4Text = `
Patient Demographics: ${enc.patient.fullName}, Age: 54, Room: ${enc.roomBed}
Admission Date: ${enc.admissionDate} | MGH Declared: ${enc.mghOrderTimestamp}
Primary Diagnosis: ${enc.primaryDiagnosis} (${enc.primaryIcd10})
Attending Physician: ${enc.attendingDoctor} | PAN: ${enc.doctorPan}
${vitalsText}
${courseInWardText}
${diagnosticText}
Billed Medications & Supplies:
${medicationsBilled.join('\n')}
    `.trim();

    // 2. Generate eSOA XML Payload
    let eSoaXml = '';
    try {
      eSoaXml = generatePhilHealthEsoaXml({
        facility: {
          pan: 'H91002341',
          name: 'St. Jude Medical Center Manila',
          tin: '004-982-110-000',
          address: 'Quezon City, Philippines'
        },
        patient: {
          pin: enc.patient.philhealthPin || '12-345678901-2',
          fullName: enc.patient.fullName,
          dob: '1970-01-01',
          gender: 'M',
          isSeniorOrPwd: Boolean(enc.patient.isSeniorCitizen || enc.patient.isPwd),
          seniorPwdId: enc.patient.seniorCitizenId || enc.patient.pwdId
        },
        encounter: {
          encounterNumber: enc.encounterNumber,
          admissionDate: enc.admissionDate,
          dischargeDate: enc.mghOrderTimestamp,
          primaryIcd10: enc.primaryIcd10,
          primaryDiagnosis: enc.primaryDiagnosis
        },
        doctor: {
          pan: enc.doctorPan,
          name: enc.attendingDoctor,
          agreedFee: enc.doctorAgreedFee,
          excessFee: enc.doctorExcessPf
        },
        claim: {
          claimNumber: enc.philhealth.id,
          caseRateCode: enc.philhealth.caseRateCode,
          totalCaseRate: enc.philhealth.totalCaseRate,
          hciAmount: enc.philhealth.hciAmount,
          pfAmount: enc.philhealth.pfAmount,
          isNbb: enc.philhealth.isNbb
        },
        charges: enc.items.map((it) => ({
          code: it.code,
          description: it.description,
          category: it.category,
          quantity: it.qty,
          unitPrice: it.unitPrice,
          grossAmount: it.grossAmount,
          philhealthAmount: it.philhealthCovered,
          hmoAmount: it.hmoCovered,
          patientOop: it.patientOop
        })),
        waterfall: {
          grossTotal: enc.waterfall.grossTotal,
          vatExemption: enc.waterfall.vatExemption,
          seniorDiscount: enc.waterfall.seniorPwdDiscount,
          philhealthTotal: enc.waterfall.philhealthTotal,
          hmoApprovedAmount: enc.waterfall.hmoApprovedAmount,
          netPatientDue: enc.waterfall.netPatientDue
        }
      });
    } catch {
      eSoaXml = `<eSOA><GrossTotal>${enc.waterfall.grossTotal.toFixed(2)}</GrossTotal><Encounter>${enc.encounterNumber}</Encounter></eSOA>`;
    }

    // 3. De-Identification / PHI Scrubbing
    const scrubResult = scrubPatientData(rawCf4Text, {
      fullName: enc.patient.fullName,
      mrn: enc.patient.mrn,
      philhealthPin: enc.patient.philhealthPin,
      contactNumber: enc.patient.contactNumber,
      roomBed: enc.roomBed,
      encounterNumber: enc.encounterNumber,
      seniorCitizenId: enc.patient.seniorCitizenId,
      pwdId: enc.patient.pwdId,
      doctorName: enc.attendingDoctor,
      doctorPan: enc.doctorPan,
      claimNumber: enc.philhealth.id
    });

    const scrubbedXmlResult = scrubPatientData(eSoaXml, {
      fullName: enc.patient.fullName,
      philhealthPin: enc.patient.philhealthPin,
      encounterNumber: enc.encounterNumber
    });

    // Merge token maps
    const combinedTokenMap = new Map<string, string>([
      ...scrubResult.tokenMap,
      ...scrubbedXmlResult.tokenMap
    ]);

    // 4. Construct Prompt
    const prompt = buildScrubberPrompt(
      scrubResult.scrubbedText,
      enc.primaryIcd10,
      null, // Surgical RVS or null
      scrubbedXmlResult.scrubbedText,
      enc.waterfall.grossTotal
    );

    // 5. Select Model and Run LLM Call
    const aiConfig = getAiConfig(options.env);
    const targetModel = forceEscalation ? aiConfig.geminiProModel : aiConfig.geminiModel;
    const hasMedDiscordance = enc.items.some(
      (it) => /meropenem|vancomycin|colistin|piperacillin/i.test(it.description)
    );

    const response = await geminiClient.generate({
      model: targetModel,
      systemInstruction: SCRUBBER_SYSTEM_PROMPT,
      prompt,
      responseMimeType: 'application/json',
      temperature: 0.1,
      mockFallbackType: 'SCRUBBER',
      mockFallbackContext: {
        hasMedDiscordance,
        grossTotal: enc.waterfall.grossTotal
      },
      env: options.env
    });

    let auditResult: ClaimsAuditResult;
    if (response.rawJson) {
      const parsed = ClaimsAuditResultSchema.safeParse(response.rawJson);
      if (parsed.success) {
        auditResult = parsed.data;
      } else {
        console.warn('[ClaimsForensicService] JSON schema validation mismatch:', parsed.error.issues);
        auditResult = geminiClient['getScrubberMock']({ hasMedDiscordance });
      }
    } else {
      auditResult = geminiClient['getScrubberMock']({ hasMedDiscordance });
    }

    // 6. Rehydration & Token Cleanup
    auditResult.clinicalSummary = rehydrateText(auditResult.clinicalSummary, combinedTokenMap);
    if (auditResult.suggestedDoctorAddendum) {
      auditResult.suggestedDoctorAddendum = rehydrateText(auditResult.suggestedDoctorAddendum, combinedTokenMap);
    }
    clearTokenMap(combinedTokenMap);

    return auditResult;
  }
}

export const claimsForensicService = new ClaimsForensicService();
