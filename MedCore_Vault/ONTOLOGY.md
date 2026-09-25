# ONTOLOGY.md — Philippine Healthcare & Financial Intelligence Lexicon

> **Epistemic Status**: Authoritative Domain Glossary & Semantic Standard  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/`)  
> **Cross-References**: [PROJECT.md](PROJECT.md), [DOMAIN/philhealth.md](DOMAIN/philhealth.md), [DOMAIN/hmo.md](DOMAIN/hmo.md), [DOMAIN/patient_financial_responsibility.md](DOMAIN/patient_financial_responsibility.md)

---

## 1. Purpose & Semantic Governance

[DECISION] This document defines the canonical domain ontology for the MedCore platform. Engineering work and data models must adhere strictly to these definitions. In particular, definitions must never conflate US healthcare terms (e.g., "Copay", "Coinsurance", "Deductible", "ANSI X12 837/835") with Philippine statutory and commercial constructs without explicitly mapping their local equivalents.

---

## 2. Core Glossary of Terms

### Hospital Operations & Clinical Milestones

#### Chargemaster
- [FACT] **Definition**: The comprehensive master price list of all billable items, services, procedures, medications, diagnostics, bed categories, and consumable supplies provided by a hospital.
- **MedCore Context**: Chargemaster items are ingested via HIS adapters. In Philippine private hospitals, items are frequently categorized into pharmacy requisitions, central supply room (CSR) kits, laboratory, radiology, operating room charges, and daily room rates.

#### May Go Home (MGH)
- [FACT] **Definition**: The official clinical order entered into the patient record by the attending physician certifying that the inpatient is medically cleared for discharge.
- **MedCore Context**: MGH represents timestamp $T_0$ of the Discharge Clearance bottleneck. It triggers the transition from clinical care to administrative and financial reconciliation.

#### Doctor Professional Fee (PF)
- [FACT] **Definition**: The fee billed by attending, admitting, consulting, or surgical physicians for inpatient care. In the Philippines, private hospital physicians are independent practitioners who determine their own fee schedules.
- **MedCore Context**: Traditionally captured via physical paper slips signed by doctors and routed to billing. Doctor fees are subject to statutory Senior/PWD discounts, PhilHealth case rate splits, and HMO schedule ceilings.

#### Excess Professional Fee (Excess PF)
- [FACT] **Definition**: The monetary variance when an independent physician’s billed professional fee exceeds the approved ceiling negotiated by the patient's HMO or health plan.
- **MedCore Context**: This variance automatically falls into the patient's direct out-of-pocket obligation. Because patients are rarely warned upfront, excess PF is one of the highest-volume dispute drivers at discharge.

#### Discharge Pass (Gate Pass)
- [FACT] **Definition**: The physical or digital authorization issued by hospital billing/cashier confirming that all financial liabilities have been settled or legally guaranteed, permitting the patient and their belongings to leave the facility.
- **MedCore Context**: MedCore digitizes this into a cryptographically verified Digital Discharge Pass (QR Code) rendered on the patient’s mobile web portal upon balance clearance.

---

### PhilHealth & State Healthcare Constructs

#### All Case Rates (ACR)
- [FACT] **Definition**: PhilHealth's primary provider payment mechanism, which reimburses accredited healthcare institutions and physicians a fixed, predetermined monetary amount for specific ICD-10 medical diagnoses or RVS surgical procedures.
- **MedCore Context**: Under ACR, the reimbursement package is strictly bifurcated between **Hospital Charges (HCI)** and **Professional Fees (PF)** (e.g., 70/30 or 60/40 splits). If multiple conditions exist, PhilHealth rules govern First vs. Second Case Rate percentage splits.

#### Diagnosis-Related Groups (DRG)
- [FACT] **Definition**: An advanced, prospective case-mix classification system that groups hospital patients with similar clinical characteristics and resource consumption into standardized payment categories, factoring in severity, comorbidities, and procedures.
- **MedCore Context**: PhilHealth is actively transitioning from flat ACR to DRG-based reimbursement (mandating CF5 shadow billing). MedCore's rule engine is built to support both flat ACR and dynamic DRG weighting.

#### No Balance Billing (NBB)
- [FACT] **Definition**: A statutory mandate pursuant to the Universal Health Care Act and PhilHealth policy stating that qualified vulnerable members (e.g., Indigent, Sponsored, Senior Citizens) admitted to accredited government healthcare facilities or designated basic/ward beds in private hospitals shall not be charged any out-of-pocket excess beyond the PhilHealth case rate.
- **MedCore Context**: MedCore flags NBB-eligible admissions to prevent unlawful out-of-pocket billing and automatically verify zero-copay compliance.

#### Single Period of Confinement (SPC)
- [FACT] **Definition**: A historical PhilHealth policy rule stipulating that two or more hospital confinements for the same illness or procedural code occurring within a 90-calendar-day window are treated as a single benefit entitlement, disqualifying the second admission from claiming an additional case rate.
- **MedCore Context**: PhilHealth officially suspended the SPC rule on October 1, 2024. [DECISION] In MedCore, the SPC engine is retained as a configurable policy toggle within `ClaimReady` to support retroactive audits and handle potential regulatory reinstatement.

#### Member Data Record (MDR)
- [FACT] **Definition**: The official PhilHealth document detailing the principal member's personal identity, PhilHealth Identification Number (PIN), membership category, qualifying contributions, and registered dependents.
- **MedCore Context**: Ingested during Stage 2 (VERIFY) to ensure member active status prior to care.

#### Claim Forms 1 to 4 (CF1, CF2, CF3, CF4)
- [FACT] **Definition**: The standardized PhilHealth claim documentation suite:
  - **CF1 (Member Information)**: Member and patient identification, employment details, and eligibility certifications.
  - **CF2 (Provider & Encounter Information)**: Admission/discharge dates, ICD-10 diagnosis codes, RVS surgical procedure codes, and itemized billing summary.
  - **CF3 (Maternity & Perinatal Record)**: Detailed clinical record for obstetric and newborn cases.
  - **CF4 (Clinical Summary & Record)**: Standardized clinical abstract mandated under Circular 2019-0002, containing vital signs, physical exam findings, course in the ward, and medication administration records.
- **MedCore Context**: MedCore ClaimReady performs pre-submission cross-validation between CF2 charges, CF4 clinical notes, and the eSOA XML payload to prevent Return-to-Hospital (RTH) errors.

#### eSOA (Electronic Statement of Account XML)
- [FACT] **Definition**: The standardized machine-readable XML payload mandated by PhilHealth under Circular No. 2023-0026 and eClaims 3.0, representing the itemized hospital bill mapped to PhilHealth's national standard library.
- **MedCore Context**: Replaces scanned image/PDF SOAs. ClaimReady ingests and validates the eSOA XML schema before transmission to the PhilHealth gateway.

#### Return-to-Hospital (RTH)
- [FACT] **Definition**: A PhilHealth claim that has been reviewed by a medical/clerical evaluator and rejected back to the healthcare institution due to data discrepancies, missing CF4 fields, diagnostic code mismatches, or schema errors.
- **MedCore Context**: Hospitals have a strict 60-day refiling window. RTH claims lock up provider liquidity. MedCore's pre-flight audit scrubber is designed to drive RTH rates from 15–20% down to <2%.

---

### Private Commercial Payers & HMO Constructs

#### Health Maintenance Organization (HMO)
- [FACT] **Definition**: An entity registered with the Insurance Commission that organizes or arranges the delivery of agreed healthcare services to subscribed corporate and individual members on a prepaid basis through a network of accredited providers.
- **MedCore Context**: Key Philippine players include Maxicare, Intellicare, Medicard, and PhilCare.

#### Letter of Authorization (LOA) & Electronic LOA (eLOA)
- [FACT] **Definition**: A binding written or electronic guarantee issued by an HMO or private insurer to an accredited hospital authorizing specific medical treatments, inpatient admission, or diagnostic testing up to an approved financial ceiling.
  - **Initial eLOA (Admission)**: Authorizes initial room-and-board tier (e.g., Semi-Private ₱1,500/day) and preliminary coverage limit upon swiping or portal logging.
  - **Final eLOA (Discharge Clearance)**: The adjudicated approval code issued post-confinement specifying the exact net hospital charges the HMO will absorb after striking out excluded sundries and excess physician fees.
- **MedCore Context**: In standard hospital operations, the Final eLOA represents the single largest discharge bottleneck, consuming **2 to 4+ hours** of waiting as hospital clerks and remote HMO claims examiners trade emails and phone calls. MedCore automates this exchange via pre-cleansed data payloads, compressing eLOA turnaround from hours to seconds.

#### Tripartite Reconciliation (Three-Way Reconciliation)
- [FACT] **Definition**: The simultaneous, automated mathematical handshake and ledger alignment between three traditionally disconnected parties in Philippine healthcare: the **Hospital Provider** (chargemaster line items), the **Statutory Insurer** (PhilHealth All Case Rates and mandatory Senior/PWD discounts), and the **Private Payer** (commercial HMO policies and eLOA caps).
- **MedCore Context**: The core intellectual property and architectural purpose of MedCore. Replaces sequential manual re-keying with a continuous closed-loop reconciliation engine.

#### EGAY Platform
- [FACT] **Definition**: The holistic provincial governance and development framework of the Provincial Government of Cagayan (PGC) under Governor Manuel Mamba, structured across four primary development pillars: **E**ducation, **G**ood Governance, **A**griculture, and **Y**outh & Elderly Welfare.
- **MedCore Context**: MedCore anchors directly into the EGAY Platform's **Good Governance** pillar (promoting public hospital financial transparency, eliminating administrative red tape, and preventing billing corruption) and **Youth & Elderly Welfare** pillar (automating the protection and statutory discounts of senior citizens under RA 9994).

#### "PhilHealth-First" Rule
- [FACT] **Definition**: A contractual clause enforced by private Philippine HMOs establishing that HMO benefits are secondary and supplemental to PhilHealth statutory benefits.
- **MedCore Context**: If a patient fails to provide PhilHealth documents, the HMO will deduct the estimated PhilHealth case rate portion from their authorization and bill it to the patient. MedCore guarantees PhilHealth eligibility upfront to preserve HMO coverage.

---

### Statutory Governance & Patient Rights

#### Senior Citizen & PWD Discounts (RA 9994 / RA 10754)
- [FACT] **Definition**: Philippine statutory mandates providing qualified senior citizens (age 60+) and persons with disabilities a **12% Value-Added Tax (VAT) exemption** followed by a **20% statutory discount** on medical goods, physician services, and hospitalization charges.
- **MedCore Context**: Must be computed first in the statutory waterfall before PhilHealth and HMO deductions are applied.

#### Anti-Hospital Detention Law (RA 9439)
- [FACT] **Definition**: A criminal statute prohibiting hospitals and clinics from detaining or preventing the physical departure of a patient who has been medically cleared due to non-payment of hospital bills. Patients in non-private (ward) rooms are entitled to depart upon executing a promissory note.
- **MedCore Context**: Severe disputes during discharge clearance expose hospital executives to criminal penalties under RA 9439. MedCore provides structured digital promissory notes with authenticated installment agreements.

#### Anti-Hospital Deposit Law (RA 10932)
- [FACT] **Definition**: Legislation making it illegal to solicit, demand, or accept any deposit or advance payment as a prerequisite for administering basic emergency medical treatment or obstetric care.
- **MedCore Context**: Ensures pre-admission financial estimation (Stage 1: GUIDE) is framed as transparent orientation, never as an unlawful gatekeeping deposit.
