import { z } from 'zod';

export const RiskCalculationSchema = z.object({
  baseRisk: z.number().describe('Baseline probability weight (e.g. 0.02 to 0.05).'),
  penalties: z.array(
    z.object({
      factor: z.string().describe('Deficiency factor or violation.'),
      points: z.number().describe('Points added to the RTH risk score.'),
      description: z.string().describe('Clear rationale for penalty addition.'),
    }),
  ),
  formula: z.string().describe('Human-readable mathematical equation explaining exact risk calculation.'),
  verdict: z.string().describe('Gateway admissibility verdict against statutory 15% threshold.'),
});

export type RiskCalculation = z.infer<typeof RiskCalculationSchema>;

export const ClaimsAuditResultSchema = z.object({
  rthRiskScore: z
    .number()
    .min(0.0)
    .max(1.0)
    .describe('Predictive probability (0.00-1.00) of PhilHealth Return-to-Hospital (RTH) rejection.'),
  riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
  passThreshold: z.boolean().describe('True if rthRiskScore <= 0.15.'),
  cleanClaimReadiness: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe('Percentage (0-100) indicating clean claim readiness.'),
  riskCalculation: RiskCalculationSchema.optional(),
  flags: z.array(
    z.object({
      category: z.enum([
        'DIAGNOSTIC_DISCREPANCY',
        'MISSING_CF4_FIELD',
        'MEDICATION_DISCORDANCE',
        'SPC_RULE_RISK',
      ]),
      severity: z.enum(['CRITICAL', 'WARNING', 'INFO']),
      field: z.string().describe('CF4, ICD-10, or eSOA field path involved.'),
      description: z.string().describe('Detailed forensic audit finding.'),
      regulatoryCitation: z.string().describe('Exact PhilHealth Circular or statutory article violated.'),
      remediation: z
        .string()
        .describe('Actionable instructions for the billing encoder or physician to cure the deficiency.'),
    }),
  ),
  clinicalSummary: z
    .string()
    .describe('Concise synthesis of inpatient course, diagnostic justification, and operative concordance.'),
  suggestedDoctorAddendum: z
    .string()
    .nullable()
    .describe(
      'Pre-drafted clinical chart addendum formatted for attending physician signature, or null if none required.',
    ),
  esoaXmlConformity: z
    .boolean()
    .describe('True if itemized chargemaster gross equals statutory grossTotal with zero centavo drift.'),
  claimContext: z
    .object({
      encounterId: z.string(),
      primaryDiagnosis: z.string(),
      primaryIcd10: z.string(),
      caseRateCode: z.string(),
      totalCaseRate: z.number(),
    })
    .optional(),
  modelUsed: z.string().optional().describe('LLM engine model used for inference.'),
});

export type ClaimsAuditResult = z.infer<typeof ClaimsAuditResultSchema>;

export const CLAIMS_SCRUBBER_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    rthRiskScore: {
      type: 'NUMBER',
      description: '0.00 to 1.00 predictive probability of Return-To-Hospital rejection',
    },
    riskLevel: { type: 'STRING', enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] },
    passThreshold: { type: 'BOOLEAN', description: 'True if rthRiskScore <= 0.15' },
    cleanClaimReadiness: {
      type: 'INTEGER',
      description: '0 to 100 percentage of clean claim readiness',
    },
    riskCalculation: {
      type: 'OBJECT',
      properties: {
        baseRisk: { type: 'NUMBER', description: 'Base risk weight' },
        penalties: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              factor: { type: 'STRING' },
              points: { type: 'NUMBER', description: 'Risk points added' },
              description: { type: 'STRING' },
            },
            required: ['factor', 'points', 'description'],
          },
        },
        formula: { type: 'STRING', description: 'Step-by-step mathematical breakdown' },
        verdict: { type: 'STRING', description: 'Threshold assessment' },
      },
      required: ['baseRisk', 'penalties', 'formula', 'verdict'],
    },
    flags: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          category: {
            type: 'STRING',
            enum: ['DIAGNOSTIC_DISCREPANCY', 'MISSING_CF4_FIELD', 'MEDICATION_DISCORDANCE', 'SPC_RULE_RISK'],
          },
          severity: { type: 'STRING', enum: ['CRITICAL', 'WARNING', 'INFO'] },
          field: { type: 'STRING' },
          description: { type: 'STRING' },
          regulatoryCitation: { type: 'STRING' },
          remediation: { type: 'STRING' },
        },
        required: ['category', 'severity', 'field', 'description', 'regulatoryCitation', 'remediation'],
      },
    },
    clinicalSummary: {
      type: 'STRING',
      description: 'Comprehensive synthesis of actual inpatient stay, diagnostics, and procedures',
    },
    suggestedDoctorAddendum: { type: 'STRING', nullable: true },
    esoaXmlConformity: { type: 'BOOLEAN' },
  },
  required: [
    'rthRiskScore',
    'riskLevel',
    'passThreshold',
    'cleanClaimReadiness',
    'riskCalculation',
    'flags',
    'clinicalSummary',
    'esoaXmlConformity',
  ],
};

export const SCRUBBER_SYSTEM_PROMPT = `You are the MedCore Clinical Claims Forensic Scrubber and PhilHealth RTH Predictor, an expert Philippine Medical Coding Auditor adhering to PhilHealth eClaims 3.0 and All Case Rates (ACR) standards.

YOUR MISSION:
Use only the supplied record. Completeness booleans are indicators, not clinical narratives. Never invent normal vital signs, laboratory values, patient improvement, surgical procedures or physician orders. If source narratives are unavailable, explicitly state this limitation; suggested addenda must request clinician verification and leave unrecorded facts blank. Audit the claimDiagnosis/claimIcd10 and case rate in the supplied profile and flag any mismatch with encounterDiagnosis/encounterIcd10 or XML. Never propose a different case rate based on memory.
Audit inpatient Claim Form 4 (CF4) narratives, primary/secondary ICD-10 codes, RVS surgical procedure codes, and electronic Statement of Account (eSOA) XML payloads to identify clerical, diagnostic, and clinical inconsistencies before claims are transmitted to the PhilHealth Health Information Technology Provider (HITP) gateway.

AUDIT RULES & STATUTORY CITATIONS:
1. MANDATORY CF4 CLINICAL ELEMENTS (PhilHealth Circular 2019-0002 & 2023-0026):
   - Baseline Admission Vitals: Blood Pressure (systolic/diastolic), Heart Rate, Respiratory Rate, and Temperature are mandatory. If any is missing, flag as CRITICAL (+0.40 RTH score).
   - Daily Course in the Ward: Day-by-day physician progress notes must show clinical evolution and therapeutic response. Omission of ward days for multi-day stays is a severe violation (+0.45 RTH score).
   - Objective Diagnostic / Laboratory Findings: Clinical chart must document lab or radiology reports confirming the primary diagnosis (e.g., CBC leukocytosis for appendicitis, CXR infiltrates for pneumonia).

2. MEDICATION VS. DIAGNOSIS DISCORDANCE:
   - High-tier intravenous antibiotics (e.g., Meropenem, Ceftriaxone, Piperacillin-Tazobactam, Vancomycin, Colistin) billed in eSOA without documented clinical fever, elevated WBC, or blood/urine/sputum culture in CF4 trigger RTH 02 disallowances.
   - Flag as WARNING (+0.30 RTH score) and generate a Suggested Doctor Addendum.

3. DIAGNOSTIC VS. PROCEDURAL CONCORDANCE:
   - Primary ICD-10 must directly substantiate the primary RVS code. Mismatches (e.g., ICD-10 K80.2 Cholelithiasis without cholecystitis paired with Laparoscopic Appendectomy RVS 44970) trigger immediate rejection (+0.50 RTH score).

4. SINGLE PERIOD OF CONFINEMENT (SPC) STATUTORY UPDATE (Circulars 2024-0021 & 2025-0015):
   - HISTORICAL CONTEXT: Previously, PhilHealth denied readmissions within 90 calendar days for the same illness under the SPC rule.
   - LEGAL TRUTH: PhilHealth Circular No. 2024-0021 formally ABOLISHED the 90-day Single Period of Confinement rule on October 1, 2024. Furthermore, PhilHealth Circular No. 2025-0015 authorizes retroactive refiling and processing of denied claims back to February 20, 2019.
   - AUDIT DIRECTIVE: If an encounter is flagged as a 90-day readmission for the same diagnosis, DO NOT penalize the RTH risk score. Instead, emit an INFO flag citing PhilHealth Circular 2024-0021 / 2025-0015, certifying that readmission claims are legally clean and eligible for full reimbursement.

5. STATUTORY 60-DAY FILING RULE (RA 11223 IRR):
   - Claims with discharge dates > 60 calendar days from current transmission date must be flagged as CRITICAL (+0.60 RTH score) due to statutory lapse.

SCORING ENGINE CALIBRATION & RISK FORMULA:
- Base Risk: 0.02 to 0.05 baseline weight.
- Penalties:
  - Missing CF4 Admission Vitals: +0.40
  - Missing Daily Ward Course Progress Notes: +0.35
  - High-Tier Medication Discordance (Unsubstantiated IV Antibiotic): +0.30
  - Diagnostic / Laboratory Discrepancy: +0.25
  - Statutory 60-Day Filing Rule Exceeded: +0.60
  - SPC Readmission (Abolished under Circular 2024-0021): +0.00 (INFO only)
- Total Risk Calculation: rthRiskScore = min(0.99, max(0.02, baseRisk + sum(penalties))).
- Clean Claim Readiness: cleanClaimReadiness = round((1.0 - rthRiskScore) * 100).
- Pass Threshold: passThreshold = true if and only if rthRiskScore <= 0.15.
- Risk Tiers:
  - LOW: 0.00 - 0.07 (Clean claim, ready for gateway push)
  - MODERATE: 0.08 - 0.15 (Minor clerical warnings; passes threshold)
  - HIGH: 0.16 - 0.35 (Fails threshold; requires chart addendum or correction)
  - CRITICAL: > 0.35 (Severe clinical omission or statutory violation; gateway transmission blocked)

DIAGNOSIS CONTEXT FIDELITY DIRECTIVE:
You MUST audit the EXACT primary diagnosis, ICD-10 code, RVS code, and CF4 clinical narrative supplied in the prompt. NEVER substitute or hallucinate an unrelated illness (e.g., NEVER output Dengue Fever when the encounter diagnosis is Cholecystitis, Renal Failure, Appendicitis, Pneumonia, or Fracture). Your clinicalSummary, flagged issues, and suggested doctor addendum must be 100% specific to the patient's actual condition.

OUTPUT FORMAT:
Generate ONLY structured JSON conforming strictly to the defined schema with riskCalculation, flags, clinicalSummary, and esoaXmlConformity.`;

export function buildScrubberPrompt(
  cf4Text: string,
  icd10Code: string,
  rvsCode: string | null,
  eSoaXmlString: string,
  grossTotal: number,
): string {
  return `Audit the following inpatient clinical claim dossier against PhilHealth eClaims 3.0 standards:

=== PRIMARY CODING ===
Primary ICD-10 Code: ${icd10Code}
Primary RVS Surgical Code: ${rvsCode ?? 'NONE (Medical Confinement)'}

=== CF4 CLINICAL NARRATIVE & CHART DATA ===
${cf4Text}

=== ELECTRONIC STATEMENT OF ACCOUNT (eSOA) PAYLOAD ===
${eSoaXmlString}

=== CERTIFIED STATUTORY GROSS TOTAL ===
Gross Total: ₱${grossTotal.toFixed(2)}

Perform a forensic check for missing CF4 mandatory fields, diagnostic-procedural concordance, medication discordance, SPC abolition compliance (Circulars 2024-0021/2025-0015), and eSOA centavo reconciliation. Return valid JSON conforming to ClaimsAuditResultSchema.`;
}
