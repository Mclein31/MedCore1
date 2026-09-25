# REQUIREMENTS/functional.md — Functional System Specifications

> **Epistemic Status**: Functional System Requirements & Module Specifications  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/REQUIREMENTS/`)  
> **Cross-References**: [PRODUCT/product_model.md](../PRODUCT/product_model.md), [SYSTEM/architecture.md](../SYSTEM/architecture.md), [mvp_scope.md](mvp_scope.md)

---

## 1. Module 1: MedCore Patient Clarify (Consumer Financial Portal)

### F-CLARIFY-001: SMS/WhatsApp Magic Link Dispatch
- [DECISION] The system shall automatically dispatch a secure, authenticated SMS/WhatsApp magic link containing a unique one-time token to the patient's registered mobile number upon admission and upon any major billing event (e.g., MGH declared, bill finalized).
- Authentication: Enforce one-time password (OTP) or birthdate verification prior to rendering protected health information.

### F-CLARIFY-002: Real-Time Interactive Deduction Waterfall
- [DECISION] The portal shall render a responsive, visual deduction cascade updating in real time:
  $$\text{Gross Charges} \longrightarrow \text{VAT Exemption} \longrightarrow \text{SC/PWD Discount} \longrightarrow \text{PhilHealth ACR} \longrightarrow \text{HMO Approved} \longrightarrow \text{Net Patient Due}$$
- Each tier shall be expandable to display itemized line-item attributions.

### F-CLARIFY-003: Plain-Language Line-Item Translation
- [DECISION] Cryptic hospital chargemaster SKU codes (e.g., `CAT-IV-024G`, `CSR-SUCT-01`) shall be mapped to human-readable labels accompanied by context tags explaining coverage determinations (e.g., *"Not covered by your HMO policy: Disallowed standard ward sundry"*).

### F-CLARIFY-004: Integrated Multi-Rail Digital Checkout
- [DECISION] The portal shall embed direct payment settlement supporting:
  - **QR Ph** interoperable national standard QR display.
  - Deep-link mobile wallet checkout for **GCash** and **Maya**.
  - Credit and Debit card tokenization (Visa, Mastercard).
  - Webhook callback verification that updates the hospital ledger within 3 seconds of payment confirmation.

### F-CLARIFY-005: Digital Discharge Pass Generation
- [DECISION] Upon zero balance confirmation or approved promissory note execution, the portal shall instantly issue a cryptographically signed **Digital Discharge Pass (QR Code)** containing encounter ID, clearance timestamp, and HMAC signature for exit verification.

---

## 2. Module 2: MedCore Flow & Verify (Eligibility & Pre-Auth Hub)

### F-FLOW-001: PhilHealth Eligibility Checking (PEC)
- [DECISION] The system shall automatically query PhilHealth verification channels upon patient intake to confirm:
  - Valid PhilHealth Identification Number (PIN).
  - Active qualifying contribution quarters.
  - Dependent eligibility against the Member Data Record (MDR).
  - No Balance Billing (NBB) entitlement flag.

### F-FLOW-002: HMO Pre-Authorization & LOA Dispatch
- [DECISION] The system shall submit structured electronic LOA requests directly to commercial HMO switch endpoints (e.g., MediLink API, Maxicare) and ingest approved LOA benefit caps and reference numbers.

### F-FLOW-003: Room Tariff & Inner Limit Evaluator
- [DECISION] When an encounter is assigned a bed category, the system shall compare the daily room rate against the patient's HMO daily allowance. If an upgrade differential exists, the system shall calculate the projected daily excess and alert admissions staff and the patient upfront.

---

## 3. Module 3: MedCore Reconcile & Ledger (Adjudication Middleware)

### F-RECON-001: Statutory Waterfall Adjudication Engine
- [FACT] The engine shall execute statutory deductions strictly in the legally mandated sequential order:
  $$\text{Net Due} = \left(\left(\text{Gross} - \text{12\% VAT} - \text{20\% SC/PWD}\right) - \text{PhilHealth ACR/DRG}\right) - \text{HMO Approved LOA}$$
- Automatically partition PhilHealth ACR benefits between Hospital Facility Charges (HCI) and Professional Fees (PF).
- Apply First vs. Second Case Rate percentage splits (100% / 50%) for multi-morbidities.

### F-RECON-002: HMO Consumable Exclusion Matching
- [DECISION] The engine shall dynamically evaluate incoming chargemaster items against the specific HMO policy exclusion matrix, automatically segregating non-covered consumables (PPE kits, suction sets, thermal blankets) into the patient out-of-pocket ledger.

### F-RECON-003: Doctor Professional Fee (PF) Digital Ledger
- [DECISION] The system shall provide an authenticated mobile web screen for attending specialists to review and electronically sign off on their professional fees within 15 minutes of MGH declaration, comparing billed PF against HMO-accredited fee ceilings.

---

## 4. Module 4: MedCore ClaimReady (Clean-Claim & Audit Engine)

### F-CLAIM-001: eSOA XML Schema Validator (Circular 2023-0026)
- [FACT] The scrubber shall audit outgoing hospital statements to ensure 100% schema conformity with PhilHealth Circular 2023-0026 and eClaims 3.0:
  - Item codes mapped to PhilHealth standard libraries.
  - Centavo-level mathematical balance between eSOA XML, CF2, and the hospital ledger.

### F-CLAIM-002: CF2 vs. CF4 Clinical Consistency Scrubber
- [DECISION] The engine shall cross-validate primary and secondary ICD-10/RVS codes on Claim Form 2 against clinical documentation in Claim Form 4 (vital signs, physical exam findings, medication administration records) to eliminate medical necessity RTH rejections.

### F-CLAIM-003: Denial Risk Scoring Engine
- [DECISION] The system shall calculate a predictive **Return-to-Hospital (RTH) Risk Score** (0.00 to 1.00) for every outgoing claim bundle, intercepting claims scoring above 0.15 for manual clerk review prior to transmission.

---

## 5. Module 5: MedCore RCM Intelligence & Optimizer

### F-RCM-001: Discharge Turnaround Time (TAT) Telemetry
- [DECISION] The system shall record timestamps for every milestone in the discharge clearance cycle ($T_0$: MGH Declared $\rightarrow$ Doctor PF Signed $\rightarrow$ Pharmacy RTS $\rightarrow$ HMO LOA Approved $\rightarrow$ Paid $\rightarrow$ Exit Pass Verified), calculating minute-level latency by ward, department, and payer.

### F-RCM-002: Payer Adjudication Scorecards
- [DECISION] The system shall generate executive benchmarks for commercial HMOs, evaluating claim approval latency, consumable disallowance rates, and payment remittance timelines.

### F-RCM-003: Digital Promissory Note & Recovery Tracking
- [DECISION] For patients unable to settle balances at discharge, the system shall generate authenticated digital promissory notes under RA 9439, scheduling automated SMS payment reminders and tracking long-term installment recovery.
