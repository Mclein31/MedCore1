# PRODUCT/users.md — Target User Personas & Ecosystem Stakeholders

> **Epistemic Status**: User Persona Architecture & Ecosystem Analysis  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/PRODUCT/`)  
> **Cross-References**: [PROJECT.md](../PROJECT.md), [problems.md](problems.md), [value_proposition.md](value_proposition.md), [product_model.md](product_model.md)

---

## 1. User Persona Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MEDCORE ECOSYSTEM ACTORS                                  │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│    PRIMARY CONSUMER      │    OPERATIONAL FRONTLINE    │     EXECUTIVE & CLINICAL      │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • Inpatient / Guarantor  │ • Hospital Billing Clerk    │ • Attending Physician         │
│   (Patient Family)       │ • Hospital HMO Liaison      │ • Hospital CFO / RCM Director │
│                          │ • PhilHealth Claims Encoder │                               │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 2. Inpatient / Patient Family (Guarantor)

- **Role in the Ecosystem**: The end-consumer paying the net out-of-pocket balance and enduring the hospitalization experience.
- [RESEARCHED] **Key Frustrations with Status Quo**:
  - Trapped in the hospital room for 4 to 8+ hours after the doctor signs "May Go Home" (MGH).
  - Kept completely blind to running costs during the 3-to-7 day hospital stay.
  - Inability to decipher multi-page, densely coded dot-matrix Statements of Account (SOAs).
  - Severe discharge "bill shock" caused by unexpected consumable disallowances (PPE, suction kits, thermal blankets) and surprise Doctor Professional Fee excesses.
  - Forced to queue physically at the ground-floor cashier desk with cash or paper bank slips.
- [DECISION] **What MedCore Delivers**:
  - **MedCore Patient Clarify**: Mobile web/PWA application requiring zero app-store download, accessible via SMS/WhatsApp magic link.
  - **Real-Time Running Ledger**: Live visibility into gross charges, statutory discounts, PhilHealth deductions, and HMO coverage as orders are placed.
  - **"Why Do I Owe This?" Plain-Language Translator**: Replaces cryptic hospital SKUs with clear explanations of non-covered items and policy limits.
  - **Instant Digital Settlement**: 1-click checkout supporting QR Ph, GCash, Maya, credit/debit cards, and healthcare installment financing.
  - **Digital Discharge Pass**: QR code clearance delivered directly to the smartphone, allowing the patient to leave the room within 30 minutes of clinical sign-off.

---

## 3. Hospital Billing Clerk / Officer

- **Role in the Ecosystem**: The operational worker responsible for collating departmental charges, verifying discounts, computing insurance subtractions, and assembling the final Statement of Account.
- [RESEARCHED] **Key Frustrations with Status Quo**:
  - Manually re-keying chargemaster items, pharmacy returns, and laboratory charges between disparate terminals.
  - Fielding aggressive, stressful phone calls from nursing stations demanding to know why the bill is taking hours.
  - Manually computing the mathematical cascade of Senior Citizen/PWD 20% discounts and 12% VAT exemptions across mixed taxable and non-taxable hospital items.
  - Re-typing approved HMO Letter of Authorization (LOA) amounts received via email or printed slips back into legacy Hospital Information Systems (BizBox, Comlogik).
- [DECISION] **What MedCore Delivers**:
  - **MedCore Reconcile & Ledger Dashboard**: Unified operational console that aggregates orders from HIS read-replicas in real time.
  - **Single-Click Waterfall Adjudication**: Automatically applies statutory VAT exemptions, Senior/PWD discounts, PhilHealth All Case Rates, and HMO policy limits.
  - **Automated e-SOA Assembly**: Generates certified PhilHealth-compliant electronic Statements of Account in seconds, eliminating manual spreadsheet math.

---

## 4. Hospital HMO / Liaison Officer

- **Role in the Ecosystem**: The coordinator stationed at the hospital HMO desk responsible for verifying member coverage, obtaining pre-authorizations, and securing final Letters of Authorization (LOAs) from private insurers.
- [RESEARCHED] **Key Frustrations with Status Quo**:
  - Logging into multiple disparate HMO web portals (e.g., MediLink PayLink, Maxicare Provider Portal, Intellicare/Avega) or waiting on hold with call centers.
  - Manually transcribing preliminary hospital bills, scanning PDFs, and faxing or emailing them to HMO claim adjusters.
  - Engaging in adversarial phone arguments with HMO adjusters over disallowed hospital sundries, consumables, and room tariff upgrades.
  - Managing long physical lines of anxious patient relatives waiting outside the HMO coordinator desk.
- [DECISION] **What MedCore Delivers**:
  - **MedCore Flow & Verify**: Centralized multi-payer pre-authorization dashboard that dispatches structured digital LOA requests directly into HMO endpoints.
  - **Pre-Cleansed Chargemaster Feeds**: Automatically maps hospital supply codes to specific HMO contract rulebooks, pre-flagging non-covered sundries before transmission.
  - **Real-Time LOA Status Pipeline**: Visual tracker displaying pending, reviewed, and approved LOAs across all commercial payers in a single view.

---

## 5. PhilHealth Claims Processor / Medical Records Officer

- **Role in the Ecosystem**: Hospital staff member tasked with assembling, encoding, auditing, and transmitting PhilHealth eClaims packages (CF1, CF2, CF3, CF4, and eSOA XML).
- [RESEARCHED] **Key Frustrations with Status Quo**:
  - High Return-to-Hospital (RTH) rates (15% to 20%) resulting from trivial clerical errors, rounding differences between CF2 and eSOA, or missing physician accreditation numbers.
  - PhilHealth Circular 2023-0026 and eClaims 3.0 mandates that strictly ban scanned PDF bills and require complex XML schema mapping against PhilHealth standard libraries.
  - Managing the strict 60-day post-discharge filing deadline while manually tracking down missing clinical summaries from doctors for Claim Form 4 (CF4).
- [DECISION] **What MedCore Delivers**:
  - **MedCore ClaimReady Pre-Flight Scrubber**: Automated compliance engine that audits outgoing claim packages against PhilHealth business rules before submission.
  - **Automated Cross-Validation**: Reconciles eSOA XML line items against CF2 diagnosis codes and CF4 clinical abstract text to ensure 100% data consistency.
  - **Denial Risk Scorer**: Flags high-risk claims with potential RTH triggers for billing clerk review, cutting the initial rejection rate to under 2%.

---

## 6. Attending Physician / Medical Specialist

- **Role in the Ecosystem**: Independent clinical practitioner managing inpatient medical care and billing professional fees (PF).
- [RESEARCHED] **Key Frustrations with Status Quo**:
  - Paper Doctor PF slips getting delayed, misplaced, or lost in transit between ward nursing stations and the central billing office.
  - Repeated phone calls from billing clerks asking whether they accept specific HMO fee schedules or demand out-of-pocket top-ups.
  - Delayed payment disbursements from the hospital cashier due to post-discharge claim reconciliation backlogs.
- [DECISION] **What MedCore Delivers**:
  - **Mobile Doctor PF Portal**: Simple, lightweight mobile screen allowing attending doctors to review and electronically confirm their professional fees in seconds.
  - **HMO Fee Schedule Transparency**: Displays the patient's HMO coverage limit for that specific specialty/procedure upfront, allowing doctors to accept the rate or confirm excess fees transparently.
  - **Accelerated PF Remittance**: Direct linkage between digital discharge settlement and hospital doctor-disbursement ledgers.

---

## 7. Hospital CFO / Head of Revenue Cycle (RCM)

- **Role in the Ecosystem**: C-suite executive responsible for hospital financial performance, operating margins, cash flow liquidity, and bed capacity utilization.
- [RESEARCHED] **Key Frustrations with Status Quo**:
  - Long Days in Accounts Receivable (DAR) exceeding 75+ days due to PhilHealth and HMO reconciliation backlogs.
  - ₱4B to ₱10B in industry-wide trapped receivables from PhilHealth RTH claims and delayed reimbursements.
  - High bad-debt write-offs (3% to 7% of gross revenues) resulting from uncollected patient promissory notes under Republic Act No. 9439.
  - Slow inpatient bed turnover: 4 to 8+ hour discharge clearance delays block beds from admitting emergency room or elective surgery patients, squandering millions in potential daily revenue.
- [DECISION] **What MedCore Delivers**:
  - **MedCore RCM Intelligence & Optimizer**: Executive command dashboard tracking discharge clearance velocity down to the minute across wards, departments, and payers.
  - **Cash Flow Acceleration**: Reduces discharge billing clearance to <45 minutes, reclaiming hundreds of bed-hours daily for higher-margin admissions.
  - **Denial Elimination & DAR Reduction**: Cuts PhilHealth RTH rates to <2% and accelerates DAR from 75+ days to under 35 days.
  - **Automated Digital Promissory Notes**: Converts uncollected balances into authenticated, trackable digital installment plans under RA 9439 guidelines.
