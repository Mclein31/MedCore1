# DOMAIN/philhealth.md — PhilHealth Statutory Mechanics & eClaims Standards

> **Epistemic Status**: Codified Statutory & Regulatory Specifications  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/DOMAIN/`)  
> **Cross-References**: [ONTOLOGY.md](../ONTOLOGY.md), [patient_financial_responsibility.md](patient_financial_responsibility.md), [insurance_reconciliation.md](insurance_reconciliation.md), [RESEARCH/regulations.md](../RESEARCH/regulations.md)

---

## 1. Statutory Mandate & Payment Architecture

[FACT] The Philippine Health Insurance Corporation (PhilHealth) is the state health insurer established under Republic Act No. 7875 (National Health Insurance Act of 1995), substantially amended by Republic Act No. 10606 and Republic Act No. 11223 (Universal Health Care Act of 2019). PhilHealth provides compulsory social health insurance to all Filipino citizens, financing approximately **10.2% of national Current Health Expenditure (CHE)** (PSA 2023 PNHA).

### All Case Rates (ACR) Mechanics
[FACT] PhilHealth reimburses accredited healthcare institutions and healthcare professionals using the **All Case Rates (ACR)** payment system:
1. **Fixed Package Amounts**: Each covered medical diagnosis (classified by ICD-10) or surgical procedure (classified by Relative Value Scale [RVS] code) carries a predetermined reimbursement ceiling.
   - *Representative Examples (Historical Pre-2024)*: Dengue fever (₱13,000), Moderate Pneumonia (₱15,000), Hemodialysis (₱4,000 per session).
2. **Major Case Rate Increases (2024–2025)**:
   - **PhilHealth Circular No. 2024-0001** (effective February 2024): Instituted an initial across-the-board **+30% rate increase** across all case rates.
   - **PhilHealth Circular No. 2024-0037** (effective January 1, 2025): Implemented an additional **+50% increase across approximately 9,000 medical and procedural case rates** to enhance financial protection and significantly curtail patient out-of-pocket leakage.
   - MedCore dynamically resolves rates based on encounter discharge date, ensuring correct rate application across legacy and modernized rate schedules.
3. **Statutory Component Bifurcation**: Every ACR package is rigidly partitioned between:
   - **Hospital Charges (HCI)**: Facility fee covering bed accommodation, standard diagnostic testing, laboratory fees, and ward medications.
   - **Professional Fees (PF)**: Physician compensation allocated to accredited attending specialists.
   - Standard splits are formally codified (e.g., 70% HCI / 30% PF for standard medical cases; 60% HCI / 40% PF for surgical cases).
4. **First vs. Second Case Rate Rules**:
   - When a hospitalized patient is diagnosed with multiple concurrent conditions, PhilHealth allows billing for a primary (First) and secondary (Second) case rate.
   - [FACT] Under PhilHealth circulars, the **First Case Rate is paid at 100%**, while the **Second Case Rate is reimbursed at 50%** of its published ceiling. Procedures take precedence over medical conditions when determining the primary case rate.

### Transition to Diagnosis-Related Groups (DRG)
- [FACT] Under UHC Act modernization directives, PhilHealth is transitioning from flat All Case Rates to a prospective **Diagnosis-Related Groups (DRG)** case-mix system.
- [FACT] The DRG system introduces **Claim Form 5 (CF5)** for shadow-billing and clinical resource weight modeling, adjusting payments based on primary diagnosis, secondary complications, comorbidities, and surgical intervention intensity.
- [DECISION] MedCore's calculation microservice is architected to evaluate flat ACR tables and DRG base rate/weight algorithms interchangeably without restructuring ledger entities.

### No Balance Billing (NBB) Policy
[FACT] Under PhilHealth Circulars and DOH Administrative Orders, the **No Balance Billing (NBB)** policy strictly mandates that qualified vulnerable members (Indigents, Sponsored members, Domestic Workers/Kasambahay, and Senior Citizens) admitted to accredited government healthcare facilities or designated basic/ward beds in private hospitals shall receive covered care with **zero out-of-pocket charges**. MedCore enforces automated NBB compliance flagging.

---

## 2. Regulatory Circulars & Submission Standards

### PhilHealth Circular No. 2019-0002: Mandatory Claim Form 4 (CF4)
[FACT] Circular 2019-0002 mandates that all claims filed under the All Case Rates payment mechanism must include **Claim Form 4 (CF4)**—a standardized clinical summary.
- **Required Data Fields**: Patient clinical history, baseline vital signs upon admission, physical examination findings, daily course in the ward, diagnostic/laboratory results, and detailed Medication Administration Records (MAR).
- **Compliance Impact**: Claims lacking substantiated clinical notes or demonstrating discrepancies between recorded clinical history and the claimed ICD-10 code are immediately rejected.

### PhilHealth Circular No. 2023-0026 & eClaims 3.0: Mandatory XML eSOA
[FACT] Circular 2023-0026 established the mandatory electronic submission of the **electronic Statement of Account (eSOA) in standardized XML schema**:
1. **Full Deprecation of Scanned Media**: Under eClaims 3.0, PhilHealth has permanently phased out PDF, JPEG, or scanned image submissions of hospital statements. Every claim must contain a valid, schema-compliant XML document.
2. **Item Library Mapping**: Every billable item, medication, and clinical diagnostic in the eSOA must map directly to PhilHealth's standardized national item libraries (Philippine National Drug Formulary [PNDF] codes, standard medical device libraries).
3. **Mathematical Strictness**: Total hospital charges, professional fees, PhilHealth deductions, and discounts in the eSOA XML must balance mathematically to the exact centavo against Claim Form 2.

### Statutory 60-Day Filing Window
[FACT] Under PhilHealth regulations, claims must be formally encoded and transmitted to the PhilHealth gateway within **60 calendar days from the date of the patient's physical discharge**. Claims filed outside this window are subject to automatic forfeiture, locking provider receivables into uncollectible bad debt.

---

## 3. Single Period of Confinement (SPC) Abolition & Retroactive Claims

- [FACT] Historically, PhilHealth enforced the **Single Period of Confinement (SPC)** rule, which decreed that two or more hospital confinements for the same illness or procedural code occurring within a **90-calendar-day window** constituted a single benefit entitlement, barring the second admission from claiming an additional case rate.
- [FACT] **October 1, 2024 Abolition**: Under **PhilHealth Circular No. 2024-0021**, PhilHealth formally and permanently **abolished** the Single Period of Confinement rule effective October 1, 2024.
- [FACT] **Retroactive Claims Processing (Circular No. 2025-0015)**: PhilHealth authorized accredited healthcare facilities to retroactively process and refile previously denied or unfiled SPC claims dating back to **February 20, 2019**, unlocking billions of pesos in recoverable hospital revenue.
- [DECISION] **Architectural Treatment**: Within `MedCore ClaimReady`, the SPC module is refactored from a blocking filter into an **Informational Audit Flag & Retroactive Recovery Engine**, automatically scanning historical hospital admissions to identify and compile refilable SPC claim packages pursuant to Circular No. 2025-0015.

---

## 4. Top Return-to-Hospital (RTH) Triggers & Denials

[RESEARCHED] Up to **15% to 20%** of private hospital claims are flagged as RTH. Analysis of private hospital billing logs reveals the primary failure modes:

| RTH Failure Mode | Root Cause in Hospital Billing | MedCore Prevention Mechanism |
| :--- | :--- | :--- |
| **eSOA XML vs. CF2 Charge Mismatch** | Manual billing clerks adjust a line item in the HIS ledger but fail to update the PhilHealth portal entry, creating a centavo rounding discrepancy. | Automated bi-directional calculation engine synchronizes XML charges with ledger entries in real time. |
| **CF4 Medical Necessity Deficiency** | The clinical abstract in CF4 does not substantiate the specific ICD-10 diagnosis claimed on CF2 (e.g., claiming severe dengue without required platelet/hematocrit drop in labs). | Pre-flight semantic compliance scrubber checks laboratory values in CF4 against ICD-10 diagnostic criteria. |
| **Physician Accreditation Errors** | Billed attending doctor’s PhilHealth Accreditation Number (PAN) is expired, invalid, or missing on CF2. | Stage 2 automated registry lookup validates physician accreditation validity prior to discharge sign-off. |
| **Statutory Discount Partitioning Errors** | Senior Citizen/PWD 20% discount is erroneously deducted from the PhilHealth case rate portion instead of the gross bill before PhilHealth deduction. | Hardcoded statutory deduction waterfall algorithm ensures strict compliance with BIR/DOH calculation rules. |
| **Missing Signatures / e-Signatures** | Patient or accredited physician signature block is omitted on digital claim forms. | Cryptographic digital signature enforcement on patient mobile portal and doctor PF screen. |
