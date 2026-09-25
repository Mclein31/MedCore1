# PRODUCT/product_model.md — Modular Product Architecture

> **Epistemic Status**: Functional Product Specification & System Decomposition  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/PRODUCT/`)  
> **Cross-References**: [PROJECT.md](../PROJECT.md), [problems.md](problems.md), [workflows.md](workflows.md), [REQUIREMENTS/functional.md](../REQUIREMENTS/functional.md)

---

## 1. Modular Architecture Overview

[DECISION] MedCore is composed of five interconnected, specialized modules designed to address the Philippine billing trilemma without replacing the hospital's underlying Hospital Information System (HIS):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MEDCORE PRODUCT ARCHITECTURE                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                     MEDCORE PATIENT CLARIFY (Patient Financial Portal)                 │
│      [Solves Problem 1 & Problem 3: Plain-Language Breakdown & Digital Settlement]     │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│         MEDCORE FLOW & VERIFY            │          MEDCORE RECONCILE & LEDGER         │
│  [Solves Problem 1 & Problem 2:          │  [Solves Problem 2 & Problem 3:             │
│   Eligibility, Pre-Admission & LOA]      │   Tripartite Waterfall & Auto-Discounts]    │
├──────────────────────────────────────────┴─────────────────────────────────────────────┤
│                         MEDCORE CLAIMREADY & AUDIT ENGINE                              │
│       [Solves Problem 2 & Problem 3: PhilHealth eClaims & HMO Clean Claims]            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                         MEDCORE RCM INTELLIGENCE & OPTIMIZER                           │
│       [Solves Problem 2 & Problem 3: Denial Analytics & Payer Contract Intel]          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Module 1: MedCore Patient Clarify (Patient Financial Experience Portal)

- **Target Problems**: Problem 1 (Unclear Responsibility) & Problem 3 (Billing Disputes).
- **Primary Users**: Inpatient, Family Guarantor, Billing Cashier.
- **Delivery Vector**: Mobile Web / Progressive Web App (PWA) accessed via SMS/WhatsApp magic link (zero native app store download required).

### Core Capabilities
1. [DECISION] **Visual Deduction Waterfall**: Displays gross hospital charges, statutory 12% VAT exemption, 20% Senior Citizen / PWD discounts, PhilHealth Case Rate packages, approved HMO coverage, and net out-of-pocket obligations through an intuitive, interactive cascading chart.
2. [DECISION] **"Why Do I Owe This?" Line-Item Explainer**: Translates cryptic chargemaster SKU numbers into natural, patient-friendly language (e.g., *"Disposable Suction Set — ₱450. Not covered by your HMO policy because it falls under standard non-covered ward consumable exclusions"*).
3. [DECISION] **Digital Out-of-Pocket Payment Engine**: Integrated with local Philippine payment rails:
   - QR Ph (national standard interoperable QR)
   - E-Wallets: GCash, Maya
   - Credit / Debit Cards (Visa, Mastercard, JCB)
   - Integrated Healthcare BNPL / Installment partners (e.g., Billease, specialized medical financing)
4. [DECISION] **Discharge Status Tracker**: Live visual progress bar tracking the operational clearance stages:
   $$\text{Doctor Cleared (MGH)} \longrightarrow \text{Pharmacy Reconciled} \longrightarrow \text{HMO LOA Received} \longrightarrow \text{Bill Finalized} \longrightarrow \text{Cleared to Depart}$$
5. [DECISION] **Digital Discharge Pass**: Issues a cryptographically signed QR code discharge clearance directly on the phone upon full settlement or approved promissory note execution.

---

## 3. Module 2: MedCore Flow & Verify (Eligibility & LOA Orchestration)

- **Target Problems**: Problem 1 (Unclear Responsibility) & Problem 2 (Disconnected Reconciliation).
- **Primary Users**: Hospital HMO Coordinator, Admissions / Intake Officer.

### Core Capabilities
1. [DECISION] **PhilHealth Eligibility Checking (PEC Engine)**: Automatically validates qualifying monthly contributions, membership category (Indigent, Sponsored, Senior, Employed), and dependent registrations against PhilHealth Member Data Records (MDR).
2. [FACT: Suspended Oct 1, 2024; DECISION: Configurable toggle] **Single Period of Confinement (SPC) Monitor**: Audits admissions against the 90-day confinement window for identical diagnostic codes.
3. [DECISION] **HMO Pre-Authorization & LOA Hub**: Centralized dispatch terminal that formats and transmits structured electronic Letter of Authorization (LOA) requests directly to HMO API endpoints (MediLink, Maxicare, Intellicare) or structured webhook dispatchers.
4. [DECISION] **Room Tariff & Inner Limit Evaluator**: Instantly alerts admissions clerks and patients if a requested room category (e.g., Private Suite vs. Semi-Private) exceeds the patient’s HMO daily room allowance, calculating the exact projected daily room-rate differential and associated diagnostic markup penalties.

---

## 4. Module 3: MedCore Reconcile & Ledger (Tripartite Adjudication Middleware)

- **Target Problems**: Problem 2 (Disconnected Reconciliation) & Problem 3 (Billing Disputes).
- **Primary Users**: Hospital Inpatient Billing Officer, Medical Biller, Attending Physician.

### Core Capabilities
1. [FACT] **Statutory Rules & Deduction Engine**: Pre-programmed with Philippine statutory algorithms:
   - Senior Citizen (RA 9994) & PWD (RA 10754) 12% VAT exemption and 20% discount calculations.
   - PhilHealth All Case Rates (ACR) schedule, automatically partitioning benefits between Hospital Charges (HCI) and Professional Fees (PF), and enforcing 1st vs. 2nd Case Rate percentage splits.
2. [DECISION] **HMO Exclusion & Limit Matrix**: Dynamically matches individual hospital chargemaster line items against HMO contract exclusion lists, inner limits, and Maximum Benefit Limits (MBL).
3. [DECISION] **Doctor Professional Fee (PF) Digital Ledger**:
   - Enables attending medical specialists to confirm, adjust, or electronically sign off on their professional fees directly from a mobile web interface.
   - Cross-references billed PF against accredited HMO schedule ceilings to calculate excess PF transparently.
4. [DECISION] **Bi-Directional HIS Integration Adapter**: Ingests live order streams (pharmacy requisitions, laboratory tests, room charges) via read-replicas, HL7/FHIR feeds, or database triggers, and writes reconciled ledger balances back into standard HIS ledgers (BizBox, Comlogik, SAP).

---

## 5. Module 4: MedCore ClaimReady (Clean-Claim & Audit Engine)

- **Target Problems**: Problem 2 (Disconnected Reconciliation) & Problem 3 (Billing Disputes).
- **Primary Users**: Hospital PhilHealth Claims Processor, Medical Records Auditor.

### Core Capabilities
1. [DECISION] **PhilHealth Compliance Scrubber**: Audits claim packages prior to transmission to the PhilHealth gateway:
   - Validates schema conformity for mandatory **eSOA XML** files pursuant to PhilHealth Circular 2023-0026 and eClaims 3.0.
   - Validates data completeness for Claim Forms 1, 2, 3, and 4 (CF1, CF2, CF3, CF4).
   - Cross-references ICD-10 diagnostic codes and RVS surgical codes between CF2 and CF4 clinical summaries to prevent medical necessity rejections.
2. [DECISION] **Automated Attachment Collation**: Automatically binds certified electronic SOAs, laboratory results, operative summaries, and physician accreditation numbers into secure submission bundles.
3. [DECISION] **Denial Risk Scorer**: Employs predictive rule sets to score outgoing claims for Return-to-Hospital (RTH) risk, intercepting deficient claims before they exit the hospital firewall.

---

## 6. Module 5: MedCore RCM Intelligence & Optimizer

- **Target Problems**: Problem 2 (Disconnected Reconciliation) & Problem 3 (Billing Disputes).
- **Primary Users**: Hospital CFO, Revenue Cycle Director, Head of Billing, HMO Contracting Committee.

### Core Capabilities
1. [DECISION] **Discharge Turnaround Telemetry**: Tracks hospital discharge clearance times down to the minute, identifying bottlenecks across nursing stations, pharmacy returns, doctor PF approvals, and HMO LOA turnaround.
2. [DECISION] **Payer Adjudication Scorecards**: Benchmarks commercial HMOs on claim approval speed, line-item disallowance rates, and reimbursement payment latency.
3. [DECISION] **Denial Root-Cause Analytics**: Categorizes PhilHealth RTH notices and HMO deductions, dynamically deploying preventative validation rules back into Modules 2, 3, and 4.
4. [DECISION] **Digital Promissory Note Ledger**: Tracks promissory notes executed under RA 9439, automating digital payment reminders, structured installment collections, and recovering bad debt.
