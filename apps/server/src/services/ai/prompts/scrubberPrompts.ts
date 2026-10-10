import { z } from 'zod';

export const ClaimsAuditResultSchema = z.object({
  rthRiskScore: z.number().min(0.0).max(1.0).describe('Predictive probability (0.00-1.00) of PhilHealth Return-to-Hospital (RTH) rejection.'),
  riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
  passThreshold: z.boolean().describe('True if rthRiskScore <= 0.15.'),
  cleanClaimReadiness: z.number().int().min(0).max(100).describe('Percentage (0-100) indicating clean claim readiness.'),
  flags: z.array(
    z.object({
      category: z.enum(['DIAGNOSTIC_DISCREPANCY', 'MISSING_CF4_FIELD', 'MEDICATION_DISCORDANCE', 'SPC_RULE_RISK']),
      severity: z.enum(['CRITICAL', 'WARNING', 'INFO']),
      field: z.string().describe('CF4, ICD-10, or eSOA field path involved.'),
      description: z.string().describe('Detailed forensic audit finding.'),
      regulatoryCitation: z.string().describe('Exact PhilHealth Circular or statutory article violated.'),
      remediation: z.string().describe('Actionable instructions for the billing encoder or physician to cure the deficiency.')
    })
  ),
  clinicalSummary: z.string().describe('Concise synthesis of inpatient course, diagnostic justification, and operative concordance.'),
  suggestedDoctorAddendum: z.string().nullable().describe('Pre-drafted clinical chart addendum formatted for attending physician signature, or null if none required.'),
  esoaXmlConformity: z.boolean().describe('True if itemized chargemaster gross equals statutory grossTotal with zero centavo drift.')
});

export type ClaimsAuditResult = z.infer<typeof ClaimsAuditResultSchema>;

export const SCRUBBER_SYSTEM_PROMPT = `You are the MedCore Clinical Claims Forensic Scrubber and PhilHealth RTH Predictor, an expert Philippine Medical Coding Auditor adhering to PhilHealth eClaims 3.0 and All Case Rates (ACR) standards.

YOUR MISSION:
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

SCORING ENGINE CALIBRATION:
- Risk Score: 0.00 to 1.00.
- Pass Threshold: passThreshold = true if and only if rthRiskScore <= 0.15.
- Risk Tiers:
  - LOW: 0.00 - 0.07 (Clean claim, ready for gateway push)
  - MODERATE: 0.08 - 0.15 (Minor clerical warnings; passes threshold)
  - HIGH: 0.16 - 0.35 (Fails threshold; requires chart addendum or correction)
  - CRITICAL: > 0.35 (Severe clinical omission or statutory violation; gateway transmission blocked)

OUTPUT FORMAT:
Generate ONLY structured JSON adhering strictly to the ClaimsAuditResult schema.`;

export const SCRUBBER_FEW_SHOT_EXAMPLES = [
  {
    input: {
      encounterId: "enc-9012",
      icd10: "K81.0 (Acute cholecystitis)",
      rvsCode: "47562 (Laparoscopy, surgical; cholecystectomy)",
      cf4Narrative: {
        admissionVitals: { bp: "120/80", hr: 84, rr: 18, temp: 37.1 },
        chiefComplaint: "Severe RUQ abdominal pain radiating to right scapula",
        courseInWard: "Day 1: Patient pre-opped. Day 2: Underwent lap chole. Day 3: Tolerating diet, discharged.",
        diagnosticFindings: "Ultrasound showed thick-walled gallbladder (4.2mm) with multiple calculi.",
        medicationsBilled: ["IV Ceftriaxone 1g", "IV Ketorolac 30mg", "IV Meropenem 1g q8h"]
      },
      eSoaXmlGross: 112400.00,
      statutoryGross: 112400.00
    },
    output: {
      rthRiskScore: 0.28,
      riskLevel: "HIGH",
      passThreshold: false,
      cleanClaimReadiness: 72,
      flags: [
        {
          category: "MEDICATION_DISCORDANCE",
          severity: "CRITICAL",
          field: "cf4Narrative.medicationsBilled[IV Meropenem]",
          description: "IV Meropenem 1g billed in eSOA chargemaster for uncomplicated lap cholecystitis without documented sepsis, severe leukocytosis, or culture sensitivity report in CF4 ward course.",
          regulatoryCitation: "PhilHealth Circular 2019-0002 Sec. 6.2 & Standard Treatment Guidelines",
          remediation: "Require attending surgeon or infectious disease specialist to issue a clinical addendum justifying escalation to carbapenem therapy (e.g. peritonitis, intra-abdominal perforation, or resistant flora)."
        }
      ],
      clinicalSummary: "Inpatient admission for acute calculous cholecystitis successfully managed with laparoscopic cholecystectomy. Diagnostic ultrasound confirms acute cholecystitis. Surgical RVS 47562 aligns with ICD-10 K81.0.",
      suggestedDoctorAddendum: "CLINICAL CHART ADDENDUM - ANTIMICROBIAL JUSTIFICATION\nPatient: [PATIENT_PSEUDONYM_A] | Encounter: [ENCOUNTER_REF_X]\nAttending Physician: [ATTENDING_PHYSICIAN_A], MD | PAN: [DOCTOR_PAN_MASKED]\n\n\"During laparoscopic cholecystectomy on Day 2, bile spillage with murky peritoneal exudate was observed intraoperatively. In view of secondary peritonitis risk and empirical coverage against resistant Gram-negative pathogens, escalation from Ceftriaxone to IV Meropenem 1g q8h was instituted for 48 hours until clinical stabilization. Patient responded with afebrile status and normalized vitals prior to discharge.\"",
      esoaXmlConformity: true
    }
  },
  {
    input: {
      encounterId: "enc-4411",
      icd10: "A90 (Dengue fever)",
      rvsCode: null,
      cf4Narrative: {
        admissionVitals: { bp: "100/70", hr: 92, rr: 20, temp: 38.8 },
        chiefComplaint: "High grade fever for 4 days with petechial rash and body aches",
        courseInWard: "Day 1: Admitted, hydrated. Dengue NS1 confirmed positive. Plt 110k. Day 2: Afebrile, Plt 85k, no spontaneous bleeding. Day 3: Plt trending up to 125k, discharge clearance given.",
        diagnosticFindings: "Dengue Duo: NS1 Ag POSITIVE, IgM Negative, IgG Negative. Platelet nadir: 85,000/uL.",
        medicationsBilled: ["IV Plain Lactated Ringer's 1L", "Paracetamol 500mg tab"]
      },
      eSoaXmlGross: 24500.00,
      statutoryGross: 24500.00,
      readmissionDaysPrior: 35
    },
    output: {
      rthRiskScore: 0.04,
      riskLevel: "LOW",
      passThreshold: true,
      cleanClaimReadiness: 96,
      flags: [
        {
          category: "SPC_RULE_RISK",
          severity: "INFO",
          field: "encounter.admissionInterval",
          description: "Patient readmitted within 35 days for acute viral infection. Single Period of Confinement (SPC) denial is barred under current statutory rules.",
          regulatoryCitation: "PhilHealth Circular No. 2024-0021 & Circular No. 2025-0015",
          remediation: "No remediation necessary. SPC rule was formally abolished on Oct 1, 2024. Claim is clean and eligible for full All Case Rates reimbursement."
        }
      ],
      clinicalSummary: "Well-documented Dengue Fever inpatient stay with documented NS1 laboratory confirmation, daily platelet monitoring, and conservative fluid resuscitation compliant with PhilHealth Dengue All Case Rate clinical guidelines.",
      suggestedDoctorAddendum: null,
      esoaXmlConformity: true
    }
  }
];

export function buildScrubberPrompt(
  cf4Text: string,
  icd10Code: string,
  rvsCode: string | null,
  eSoaXmlString: string,
  grossTotal: number
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
