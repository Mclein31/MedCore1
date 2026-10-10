import { z } from 'zod';

export const HmoAppealResponseSchema = z.object({
  referenceNumber: z.string().describe('Unique dispute appeal identifier, e.g. APL-SJMC-2026-0812.'),
  appealLetterMarkdown: z.string().describe('The complete formal medico-legal appeal letter formatted in pristine markdown with letterhead and signature block.'),
  citationsApplied: z.array(z.string()).describe('List of statutory acts, Insurance Commission circulars, and medical society guidelines cited.'),
  attendingPhysicianName: z.string(),
  doctorPan: z.string(),
  reconsiderationDeadline: z.string().describe('ISO timestamp representing 48-hour response window.'),
  suggestedAttachments: z.array(z.string()).describe('List of required clinical records to attach to the appeal packet.')
});

export type HmoAppealResponse = z.infer<typeof HmoAppealResponseSchema>;

export const APPEAL_SYSTEM_PROMPT = `You are the MedCore Senior Medico-Legal HMO Claims Adjudication Specialist and Medical Necessity Counsel.

YOUR MISSION:
Draft formal, legally unassailable, assertive, and clinical-grade Medical Necessity Reconsideration & Appeal Letters addressed to HMO Medical Directors (e.g., Maxicare, Intellicare/Asalus, Medicard, PhilCare, Pacific Cross, Etiqa) for wrongfully disallowed medical consumables, specialized antibiotics, surgical supplies, and emergency room-tier differentials.

STATUTORY & REGULATORY FOUNDATIONS:
1. EXECUTIVE ORDER NO. 192 (s. 2015) & INSURANCE COMMISSION JURISDICTION:
   - Philippine HMOs operate under the regulatory oversight of the Insurance Commission (IC).
   - HMO master agreements must comply with Insurance Commission rules regarding prompt claims settlement and non-arbitrary exclusions.
2. REPUBLIC ACT NO. 11765 (Financial Products and Services Consumer Protection Act of 2022):
   - Prohibits financial service entities, including regulated health maintenance organizations, from imposing unconscionable clauses, deceptive exclusions, or arbitrary claim denials that shift standard-of-care medical costs onto consumer-patients.
3. INFECTION CONTROL & SURGICAL STANDARDS (DOH & PSIPC):
   - Consumables such as laparoscopic trocars, endoloops, sterile barrier gowns, specialized suction irrigators, and closed-circuit wound drains are mandatory surgical infection-control consumables mandated by DOH facility licensing standards.
   - Categorizing operative infection barrier consumables as "routine ward sundries" or "admin supplies" violates accepted standards of surgical safety.
4. EMERGENCY ROOM DIFFERENTIAL DOCTRINE:
   - Under DOH and Insurance Commission emergency admission guidelines, if a patient is admitted through the Emergency Room requiring urgent inpatient admission, and the contracted standard room category is 100% occupied (confirmed by hospital census logs), placing the patient temporarily in the next available private room does not constitute a "voluntary upgrade". Imposing room penalties shifts emergency burdens onto insured members.

LETTER STRUCTURE REQUIREMENTS:
1. Hospital Letterhead Header: Formal hospital title, address, date, and unique MedCore reference number.
2. Formal Addressee: The Medical Director & Claims Adjudication Committee of the specific HMO.
3. Inpatient Reference Block: Patient Pseudonym, Masked MRN, Encounter Reference, LOA Authorization No., Admission/Discharge Dates.
4. Formal Statement of Dispute: Direct, unambiguous rejection of the disallowance with exact monetary figure.
5. Clinical & Evidentiary Justification: Specific medical rationale connecting the inpatient diagnosis, operative notes, and attending physician's clinical judgment to the billed items.
6. Statutory & Regulatory Citations: Explicit citations of RA 11765, EO 192, and DOH clinical guidelines establishing rebuttable presumption of necessity.
7. Actionable Demand: Demand for reversal and issuance of an Amended Final LOA within forty-eight (48) hours to prevent patient cost-shifting.
8. Official Signature Block: Attending Physician, PRC/PAN ID, and Hospital Medical Director / RCM Chair.

OUTPUT FORMAT:
Generate a valid JSON response adhering strictly to HmoAppealResponseSchema.`;

export const APPEAL_FEW_SHOT_EXAMPLES = [
  {
    input: {
      encounterId: "enc-5521",
      patientPseudonym: "[PATIENT_PSEUDONYM_A]",
      attendingPhysician: "Dr. Roberto C. Tan, MD, FPCS",
      doctorPan: "PAN-1984-77123",
      hmoProviderName: "Maxicare Healthcare Corporation",
      deniedItemDescription: "Laparoscopic Trocars (10mm & 5mm), Endoloop Sutures, and Sterile Barrier Drapes",
      deniedAmount: 14250.00,
      hmoDenialReason: "Routine ward supplies excluded under Section 4.2 of Master Agreement",
      primaryDiagnosis: "Acute Gangrenous Appendicitis with Localized Peritonitis",
      clinicalNotes: "Emergency laparoscopic appendectomy performed. Appendix was severely friable and ruptured at tip. Trocars were single-patient surgical access devices; sterile barrier drapes were critical to prevent surgical site infection."
    },
    output: {
      referenceNumber: "APL-MC-2026-0941",
      appealLetterMarkdown: `# ST. JUDE MEDICAL CENTER
**Office of Medical Affairs & Revenue Cycle Management**
*142 E. Rodriguez Sr. Boulevard, Quezon City, Philippines*

**DATE**: October 10, 2026
**REFERENCE NO.**: APL-MC-2026-0941

**TO**:
**THE MEDICAL DIRECTOR & CLAIMS COMMITTEE**
Maxicare Healthcare Corporation
Maxicare Tower, 203 Salcedo St., Legaspi Village, Makati City

**RE: FORMAL DEMAND FOR RECONSIDERATION & MEDICAL NECESSITY APPEAL**
- **Patient**: [PATIENT_PSEUDONYM_A]
- **Encounter Ref**: [ENCOUNTER_REF_X]
- **MRN**: [MRN_MASKED_X]
- **HMO Card No.**: [HMO_CARD_MASKED]
- **Original LOA No.**: [LOA_NUM_MASKED]
- **Disallowed Amount**: ₱14,250.00 (Laparoscopic Consumables & Infection Control Packs)

---

Dear Medical Director:

St. Jude Medical Center formally lodges this **Appeal for Reconsideration** against Maxicare's disallowance of **₱14,250.00** representing laparoscopic surgical consumables and sterile barrier barrier sets incurred during the emergency inpatient management of the above-named patient.

### 1. Statement of Dispute
Your claims adjudication notice cites *"Section 4.2: Routine Ward Supplies"* to justify disallowing single-use laparoscopic trocars (10mm & 5mm), endoloop sutures, and impermeable surgical barrier drapes. We vigorously reject this characterization. Operative access trocars and wound-barrier drapes are specialized surgical instruments, not routine inpatient floor sundries.

### 2. Clinical Necessity & Evidentiary Findings
The patient presented with **Acute Gangrenous Appendicitis with Localized Peritonitis** (ICD-10: K35.3). Operative findings documented an inflamed, gangrenous appendix with purulent peritoneal fluid.
- **Laparoscopic Trocars (5mm & 10mm)**: Essential single-use surgical ports required to introduce endoscopic instruments and suction-irrigation without causing trauma to the abdominal wall.
- **Endoloop Ligatures**: Medically imperative to achieve secure stump closure of the friable, necrotic appendiceal base, mitigating fecal contamination and intra-abdominal abscess formation.
- **Sterile Barrier Drapes**: Mandated by Department of Health (DOH) Healthcare-Associated Infection (HAI) prevention protocols for class II/contaminated wounds.

### 3. Statutory & Regulatory Foundations
1. **Republic Act No. 11765 (Financial Products and Services Consumer Protection Act of 2022)**: Mandates fair treatment and prohibits health maintenance organizations from imposing arbitrary and unreasonable exclusions that contradict established standard-of-care medical guidelines.
2. **Insurance Commission Executive Order No. 192 (s. 2015)**: Confirms that clinical determinations made by the Attending Surgeon regarding procedural necessity enjoy a rebuttable presumption of medical validity. Classifying specialized operative consumables as 'ward supplies' shifts lawful operating room costs onto the insured consumer.

### 4. Demand for Reconsideration
In light of the substantiated operative records and statutory mandates, we demand the immediate reversal of this disallowance and the transmission of an **Amended Final Letter of Authorization (LOA)** in the amount of **₱14,250.00** within forty-eight (48) hours of receipt.

Failure to resolve this claim will compel the hospital to refer this dispute to the Insurance Commission Consumer Assistance Division pursuant to RA 11765.

Respectfully submitted,

__________________________________________
**DR. ROBERTO C. TAN, MD, FPCS**
Attending Surgeon | PRC No. 0084921 | PAN: [DOCTOR_PAN_MASKED]

__________________________________________
**DR. JOSEFINA M. AGUINALDO, MD, MHA**
Medical Director, St. Jude Medical Center`,
      citationsApplied: [
        "Republic Act No. 11765 (Financial Products and Services Consumer Protection Act of 2022)",
        "Insurance Commission Executive Order No. 192 (s. 2015)",
        "Department of Health (DOH) Surgical Site Infection Prevention Standards"
      ],
      attendingPhysicianName: "Dr. Roberto C. Tan, MD, FPCS",
      doctorPan: "PAN-1984-77123",
      reconsiderationDeadline: "2026-10-12T16:00:00.000Z",
      suggestedAttachments: [
        "Official Operative Technique Record (Form OR-3)",
        "Pathology / Histopathology Tissue Biopsy Report",
        "Itemized Operating Room Materials Consumption Log"
      ]
    }
  }
];

export function buildHmoAppealPrompt(
  encounterId: string,
  patientPseudonym: string,
  attendingDoctor: string,
  doctorPan: string,
  hmoProvider: string,
  deniedItem: string,
  deniedAmount: number,
  denialReason: string,
  primaryDiagnosis: string,
  clinicalJustificationNotes: string
): string {
  return `Draft an authoritative, medico-legal HMO Medical Necessity Appeal letter:

=== CASE IDENTIFIERS ===
Encounter Reference: ${encounterId}
Patient Pseudonym: ${patientPseudonym}
Attending Physician: ${attendingDoctor} (PAN: ${doctorPan})
Target HMO Provider: ${hmoProvider}

=== DISPUTE PARTICULARS ===
Disallowed Item / Fee: ${deniedItem}
Disallowed Amount: ₱${deniedAmount.toFixed(2)}
HMO Denial Reason: ${denialReason}

=== CLINICAL PROFILE & JUSTIFICATION ===
Primary Inpatient Diagnosis: ${primaryDiagnosis}
Attending Clinical & Operative Notes:
${clinicalJustificationNotes}

Formulate a formal markdown appeal letter citing RA 11765, EO 192, and DOH clinical necessity standards. Return valid JSON adhering to HmoAppealResponseSchema.`;
}
