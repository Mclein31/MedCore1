# PRODUCT/workflows.md — The Canonical Operating Loop

> **Epistemic Status**: Core Product Workflow & Operating Engine  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/PRODUCT/`)  
> **Cross-References**: [PROJECT.md](../PROJECT.md), [product_model.md](product_model.md), [SYSTEM/workflows.md](../SYSTEM/workflows.md)

---

## 1. The 5-Pillar Value Engine: GUIDE → VERIFY → REWARD → REPORT → IMPROVE

[DECISION] MedCore operationalizes the five core value pillars across the healthcare financial lifecycle, supported by continuous intra-care tripartite ledger reconciliation, compressing post-clinical discharge clearance to **under 45 minutes** (targeting **<30 minutes**):

```
                        THE MEDCORE 5-PILLAR VALUE ENGINE

   ┌─────────────┬─────────────┬─────────────┬─────────────┬────────────────────────┐
   │    GUIDE    │   VERIFY    │   REWARD    │   REPORT    │        IMPROVE         │
   ├─────────────┼─────────────┼─────────────┼─────────────┼────────────────────────┤
   │ Pre-service │ Real-time   │ Prompt-pay  │ Operational │ Denial root causes,    │
   │ estimation, │ eligibility,│ discounts,  │ telemetry,  │ payer contract scoring,│
   │ room-tier   │ PhilHealth  │ clean-claim │ eSOA XML    │ doctor excess fee      │
   │ orientation │ MDR & PEC,  │ bonus, bed- │ audit, TAT  │ profiling, dynamic     │
   │ & deposit-  │ HMO pre-    │ turnover    │ countdown,  │ rule updates to prevent│
   │ free intake.│ auth LOA.   │ incentives, │ DAR metrics.│ future RTH rejections. │
   │             │             │ RA 9439 pay │             │                        │
   │             │             │ agreements. │             │                        │
   └─────────────┴─────────────┴─────────────┴─────────────┴────────────────────────┘
```

---

## 2. Stage 1: GUIDE (Pre-Admission & Intake Financial Orientation)

- **Purpose**: Eliminate admission blindness by providing patients and hospital staff with a transparent, upfront financial estimate and coverage trajectory before clinical procedures or bed assignments begin.
- **Primary Users**: Inpatient / Family Guarantor, Hospital Admitting Officer.
- **Inputs**: Provisional ICD-10 diagnosis, admitting physician, requested room category, PhilHealth Identification Number (PIN), HMO policy details.
- **System Action**:
  1. Compares proposed room category against HMO daily room allowance to flag room-tier upgrade penalties (e.g., ₱1,500 allowance vs. ₱3,500 private room).
  2. Projects PhilHealth Case Rate package for the provisional diagnosis.
  3. Queries historical chargemaster data for the specified procedure, admitting specialist, and room category to compute an estimated out-of-pocket range.
- **Outputs**: Digital Pre-Admission Financial Summary delivered via SMS/WhatsApp magic link to the patient's smartphone.
- **Business Value**: Eliminates downstream cashier confrontations; reduces admission queue friction.
- **Patient Value**: Transparent upfront understanding of room-tier upgrade costs and HMO coverage ceilings before signing admission consent.
- **Hospital Value**: Secures compliant financial consent; establishes collection baseline upfront; complies with the Anti-Hospital Deposit Law (RA 10932) by framing orientation as deposit-free guidance.
- **Data Generated**: Patient room-tier upgrade choices, admission conversion rates, procedure price elasticities.

---

## 3. Stage 2: VERIFY (Real-Time Coverage & Eligibility Assurance)

- **Purpose**: Continuously validate patient benefit eligibility, PhilHealth active contribution status, and commercial HMO pre-authorization during the hospital stay to prevent mid-care coverage lapses.
- **Primary Users**: Hospital HMO Coordinator, Billing Intake Clerk.
- **Inputs**: PhilHealth Member Data Record (MDR) data, HMO member ID, date of admission, attending physician clinical orders.
- **System Action**:
  1. Queries PhilHealth verification endpoints to confirm qualifying monthly contributions prior to confinement.
  2. [FACT: Abolished Oct 1, 2024 via Circ 2024-0021 / Retroactive refiling via Circ 2025-0015] Verifies absence of Single Period of Confinement (SPC) conflicts while identifying retroactive claims recovery opportunities.
  3. Dispatches structured electronic pre-authorization LOA requests directly to HMO switch endpoints.
- **Outputs**: Active **MedCore Financial Clearance Badge** (Green = Verified; Yellow = Pending Action/Deficient Docs; Red = Ineligible/Exclusion Alert) on the hospital billing terminal.
- **Business Value**: Prevents uncollectible clinical services rendered to ineligible members.
- **Patient Value**: Peace of mind knowing that HMO and PhilHealth coverage is formally verified without standing in hospital basement liaison lines.
- **Hospital Value**: Zero post-discharge claim write-offs due to lapsed PhilHealth contributions or unauthorized HMO admissions.
- **Data Generated**: Payer verification response latency, pre-existing condition (PEC) denial triggers, member delinquency rates.

---

## 4. Continuous Core Engine: RECONCILE (Tripartite Automated Adjudication)

- **Purpose**: Continuously execute the mathematical waterfall across hospital chargemaster orders, PhilHealth All Case Rates, and HMO policy limits, producing a real-time, explainable ledger.
- **Primary Users**: Inpatient Billing Officer, Medical Biller, Attending Physician.
- **Inputs**: Live order streams from the HIS (pharmacy requisitions, laboratory tests, room tariffs, CSR supplies) and digital Doctor Professional Fee slips.
- **System Action**:
  1. Applies statutory 12% VAT exemption and 20% discount (RA 9994 / RA 10754) to qualifying net hospital items and professional fees for verified Senior Citizens and PWDs.
  2. Applies statutory PhilHealth All Case Rates (ACR) reflecting 2024–2025 rate increases (Circular 2024-0001 & 2024-0037), partitioning the benefit between Hospital Charges (HCI) and Professional Fees (PF), and enforcing 1st vs. 2nd Case Rate splits where applicable.
  3. Applies HMO contract adjudication: identifies and excludes policy-restricted consumables, calculates room upgrade differentials, and applies approved Maximum Benefit Limits (MBL).
  4. Computes true net Patient Due balance with explanatory natural-language tags attached to every single excluded item.
- **Outputs**: The **MedCore Smart Statement**—a living, itemized, tripartite ledger accessible in real time by the billing department and on the patient's smartphone.
- **Business Value**: Collapses the 4–6 hour manual discharge calculation process down to an automated calculation executed in seconds.
- **Patient Value**: Live visibility into charges as they occur; zero surprises at discharge; plain-language explanations for why specific items are not covered.
- **Hospital Value**: Eradicates clerical calculation errors; standardizes doctor PF reconciliation; streamlines billing team operations.
- **Data Generated**: Hospital chargemaster markup variances, recurring consumable disallowances by payer, real-time cost-to-serve metrics.

---

## 5. Stage 3: REWARD (Settlement, Promissory & Incentives)

- **Purpose**: Settlement incentives and financial closure. Replaces administrative confrontation with incentive alignment across patients, physicians, and staff.
- **Primary Users**: Patient / Family Guarantor, Billing Cashier, Attending Doctor, Hospital Staff.
- **Inputs**: Doctor PF digital concurrence, HMO final LOA sign-off, patient payment method selection, RA 9439 promissory terms.
- **System Action**:
  1. **For Patients**: Provides prompt-settlement courtesy discounts (e.g., 2% discount for settling OOP balance within 15 minutes of MGH). Unlocks multi-rail digital checkout (QR Ph, GCash, Maya) or structures legally compliant RA 9439 digital promissory notes with captured national IDs, e-signatures, and installment schedules.
  2. **For Attending Physicians**: Provides rapid fee remittance scoring/credits for doctors who sign off on their PF within 15 minutes of MGH order.
  3. **For Hospital Staff**: Tracks bed-turnover velocity bonuses and clean-claim compliance scoring.
  4. Generates a secure, cryptographically validated Digital Discharge Pass (QR Code) immediately upon balance settlement or digital promissory note execution.
- **Outputs**: Instant digital discharge clearance; cryptographic gate pass; signed RA 9439 legal promissory agreements.
- **Business Value**: Converts discharge settlement from physical cashier bottlenecks into automated digital collections; lifts promissory recovery rates from <20% to >65%.
- **Patient Value**: Dignified checkout; leaves hospital within 30 minutes; flexible installment options under RA 9439 without detention.
- **Hospital Value**: Rapid room turnover; guaranteed point-of-sale cash collection; elimination of detention liability.

---

## 6. Stage 4: REPORT (Operational Telemetry, eClaims XML & Ledgers)

- **Purpose**: Real-time operational command telemetry, pre-submission claim package compliance audit, and comprehensive ledger reporting.
- **Primary Users**: PhilHealth Claims Encoder, Medical Records Auditor, Hospital CFO, Revenue Cycle Director.
- **Inputs**: Generated eSOA XML payloads, Claim Forms (CF1, CF2, CF3, CF4), discharge timestamps, ledger balances.
- **System Action**:
  1. **Discharge SLA Countdown Telemetry**: Monitors live countdown against 45-minute hard SLA across all active inpatient encounters.
  2. **PhilHealth Pre-Flight Audit Scrubber**: Audits eSOA XML compliance with Circular 2023-0026; cross-references CF2 diagnostic codes with CF4 clinical abstracts; performs centavo reconciliation between CF2 Part II and eSOA XML.
  3. **Return-to-Hospital (RTH) Risk Gauge**: Predictive model scoring risk (0.00 to 1.00); intercepts high-risk claims (>0.15) before gateway transmission.
  4. **Tripartite Financial Reporting**: Tracks Days in Accounts Receivable (DAR), bed-hours reclaimed daily, and multi-payer receivables aging.
- **Outputs**: Audit-ready PhilHealth eClaims 3.0 packages; departmental latency heatmaps; executive RCM telemetry reports.
- **Business Value**: Pushes clean-claim rates >98.5% and slashes RTH denial rates to <2.0%.
- **Hospital Value**: Immediate visibility into billing bottlenecks; protected hospital cash reserves.

---

## 7. Stage 5: IMPROVE (Denial Analytics & Payer Optimization)

- **Purpose**: Close the loop by ingesting payer adjudication outcomes to continuously optimize billing rules, eliminate PhilHealth RTH root causes, and strengthen hospital-HMO contract negotiations.
- **Primary Users**: Hospital CFO, Revenue Cycle Director, Head of Billing, HMO Contracting Committee.
- **Inputs**: PhilHealth Return-to-Hospital (RTH) notices, denied HMO claims, audit adjustments, patient dispute tickets, post-discharge settlement timelines.
- **System Action**:
  1. Ingests claim return reasons and parses discrepancy codes.
  2. Evaluates PhilHealth RTH discrepancy patterns via Pareto analysis (centavo rounding, missing doctor PAN, deficient CF4 labs).
  3. Tracks doctors who persistently exceed HMO schedule rates.
  4. Deploys automated preventative validation rules into Stages 1, 2, and 3 to catch identical issues prior to future submissions.
- **Outputs**: Executive RCM Intelligence Dashboard, Automated Payer Denial Playbooks, and dynamic rule-engine updates deployed to Stages 1, 2, and 3.
- **Business Value**: Permanently lowers Days in Accounts Receivable (DAR); recovers 3–5% of top-line revenue previously lost to administrative leakage and write-offs.
- **Patient Value**: Billing transparency and billing rules become fairer, faster, and more predictable across the entire hospital system.
- **Hospital Value**: Hard, objective data for negotiating commercial HMO contract terms and pricing schedules.
- **Data Generated**: Payer-specific denial risk scores, physician billing compliance benchmarks, regional PhilHealth adjudication variance maps.
