# RESEARCH/competitors.md — Global & Domestic Competitive Analysis

> **Epistemic Status**: Empirical Competitive Intelligence & Capability Benchmarking  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/RESEARCH/`)  
> **Cross-References**: [PROJECT.md](../PROJECT.md), [cedar_model.md](cedar_model.md), [BUSINESS/competitive_landscape.md](../BUSINESS/competitive_landscape.md)

---

## 1. Overview of Competitive Benchmarking

[DECISION] To establish defensible differentiation, MedCore evaluates 9 major global platforms and domestic solutions across a rigorous **12-point capability framework**:
1. Problem solved
2. Paying customer
3. Primary end users
4. Hospital billing capability
5. Insurance capability
6. PhilHealth capability
7. HMO capability
8. Claims capability
9. Patient transparency capability
10. Multi-payer reconciliation capability
11. Monetization / revenue model
12. Residual gap addressed by MedCore

---

## 2. Global Competitor Profiles

### 1. Cedar Healthcare
- **1. Problem Solved**: Disconnected post-visit patient billing, confusing paper bills, lack of payer-provider statement alignment, and low patient collection rates.
- **2. Who Pays**: Large US health systems, regional hospital networks, and health plans (payers).
- **3. Who Uses It**: Patients (consumer mobile experience), hospital billing administrators, and revenue cycle teams.
- **4. Billing Capability**: World-class consumer digital billing engine, bill consolidation across multiple providers, and dynamic payment scheduling.
- **5. Insurance Capability**: Deep US commercial payer integration via Cedar Cover (OODA Health engine), real-time eligibility checks, and aligned EOB display.
- **6. PhilHealth Capability**: **None**. Built strictly for US HIPAA and ANSI X12 837/835 EDI transactions; zero support for PhilHealth eSOA XML or ACR/CF4 logic.
- **7. HMO Capability**: High for US commercial payers (e.g., Blue Cross Blue Shield, Highmark); zero support for Philippine HMO protocols.
- **8. Claims Capability**: Pre-service out-of-pocket estimation and post-claim reconciliation; relies on provider clearinghouses for core adjudication.
- **9. Patient Transparency Capability**: Market-leading. Real-time cost estimates pre-visit, plain-language EOB reconciliation post-visit.
- **10. Reconciliation Capability**: High provider-payer-patient matching for US adjudicated claims.
- **11. Revenue Model**: Enterprise SaaS recurring subscription + contingency gainshare (1% to 4%) on collection lift + payment gateway processing spreads.
- **12. What Gap Remains for MedCore?**: Cedar does not operate in Southeast Asia, does not support PhilHealth eClaims 3.0 XML or Philippine statutory discount cascades (RA 9994/10754), and lacks Philippine HMO switch integrations (MediLink/PayLink).

---

### 2. Waystar (NASDAQ: WAY)
- **1. Problem Solved**: Enterprise-wide revenue cycle fragmentation, manual claim scrubbing, high denial rates, and disconnected clearinghouse workflows.
- **2. Who Pays**: Enterprise hospitals, academic medical centers, and ambulatory clinics.
- **3. Who Uses It**: Hospital RCM departments, billing specialists, and patient access teams.
- **4. Billing Capability**: Full enterprise clearinghouse billing, claim scrubbing, electronic statement transmission, and patient estimation.
- **5. Insurance Capability**: Extensive clearinghouse connectivity across thousands of US commercial and government payers.
- **6. PhilHealth Capability**: **None**.
- **7. HMO Capability**: Comprehensive US commercial HMO/PPO integration; zero Philippine HMO support.
- **8. Claims Capability**: Automated 837 claim submission, 835 remittance posting, automated denial appeals, and contract modeling.
- **9. Patient Transparency Capability**: Moderate. Offers pre-service patient estimation and payment tools, but primarily designed as a provider-centric back-office platform.
- **10. Reconciliation Capability**: Automated bank deposit and remittance reconciliation for US payers.
- **11. Revenue Model**: Hybrid subscription software licensing + per-transaction clearinghouse claim fees.
- **12. What Gap Remains for MedCore?**: Completely lacks Philippine healthcare localization, regulatory rule engines, and consumer-facing transparency tailored to local hospitals.

---

### 3. Flywire (NASDAQ: FLYW)
- **1. Problem Solved**: Healthcare payment processing friction, high-balance patient payment plans, and international patient receivables.
- **2. Who Pays**: Healthcare provider systems, hospital networks, universities.
- **3. Who Uses It**: Patients and hospital billing cashiers.
- **4. Billing Capability**: Sophisticated payment engine, digital payment plans, and multi-currency processing.
- **5. Insurance Capability**: Limited. Ingests patient balance from EHR/PMS; does not conduct core claim adjudication.
- **6. PhilHealth Capability**: **None**.
- **7. HMO Capability**: **None**.
- **8. Claims Capability**: **None**. Operates strictly downstream of claims adjudication.
- **9. Patient Transparency Capability**: High on payment options and transparent merchant checkout; low on medical bill itemization.
- **10. Reconciliation Capability**: Automates payment-to-EHR reconciliation for settled cash/credit transactions.
- **11. Revenue Model**: Payment processing transaction fees (merchant take-rate) + software subscription fees.
- **12. What Gap Remains for MedCore?**: Does not solve the complex pre-settlement adjudication between PhilHealth, HMOs, and hospital billing.

---

### 4. Experian Health
- **1. Problem Solved**: Patient identity verification, upfront financial clearance, insurance coverage discovery, and credit risk assessment.
- **2. Who Pays**: Large enterprise health systems and hospital chains.
- **3. Who Uses It**: Patient registration staff, financial counselors, billing managers.
- **4. Billing Capability**: Comprehensive patient estimation, credit profiling, collection scoring.
- **5. Insurance Capability**: Automated eligibility verification, coverage discovery (finding hidden Medicaid/commercial insurance).
- **6. PhilHealth Capability**: **None**.
- **7. HMO Capability**: Extensive for US payers.
- **8. Claims Capability**: Claims scrubbing, denial analytics, contract compliance audits.
- **9. Patient Transparency Capability**: Delivers pre-service cost estimates, but lacks a modern consumer billing engagement UI like Cedar.
- **10. Reconciliation Capability**: Focuses on tracking underpayments against contractual payer fee schedules.
- **11. Revenue Model**: Enterprise annual software licensing + per-query data transaction fees.
- **12. What Gap Remains for MedCore?**: Unusable in the Philippines due to reliance on US credit bureau data and absence of PhilHealth/local HMO integration.

---

### 5. AKASA
- **1. Problem Solved**: Manual labor bottlenecks in hospital revenue cycles; automates prior authorization, claims management, and medical coding using generative AI.
- **2. Who Pays**: Large health systems and hospital billing organizations.
- **3. Who Uses It**: Revenue cycle operations staff, medical coders, billing teams.
- **4. Billing Capability**: Automated charge capture verification, mid-cycle coding workflows.
- **5. Insurance Capability**: AI-driven scraping and EDI querying across disparate payer portals to resolve claims and status checks.
- **6. PhilHealth Capability**: **None**.
- **7. HMO Capability**: US commercial payers only.
- **8. Claims Capability**: Automated claim denial triage, appeal generation, and status updating directly inside EHRs (Epic, Cerner).
- **9. Patient Transparency Capability**: Minimal. Focused on back-office operations.
- **10. Reconciliation Capability**: Automated claim status reconciliation.
- **11. Revenue Model**: Enterprise SaaS platform subscription + outcome-based pricing.
- **12. What Gap Remains for MedCore?**: AKASA is an enterprise back-office automation tool for US hospitals; it does not touch the patient experience, discharge clearance, or Philippine payer ecosystems.

---

### 6. Olive AI (Cautionary Competitor Post-Mortem: Liquidated October 2023)
- **1. Historical Scale & Collapse**: Raised **>$900 Million** in venture capital, peaked at a **$4.0 Billion valuation**, and suffered a catastrophic complete liquidation of assets in October 2023 (clearinghouse assets sold to Waystar, prior auth to Humata Health, utilization management to Availity).
- **2. Core Failure Modes**:
  1. *Brittle RPA Masquerading as AI*: Olive marketed an "autonomous AI workforce" but heavily relied on brittle screen-scraping bots simulating human clicks on web portals. When hospital EHRs or insurer portals updated minor HTML or CSS tags, the bots failed silently, requiring hundreds of hidden human operators to manually re-key data.
  2. *The "Black Box" Problem & Unverifiable ROI*: Promised impossible 500% ROI gains, but delivered only 10%–15% actual cost reductions. Failed to provide CFOs with deterministic, transparent, centavo-accurate audit trails.
  3. *Distracted Sprawl*: Pivoted across dozens of unrelated healthcare domains (operating room scheduling, cyber defense, patient intake) rather than mastering the deterministic mathematical core of revenue cycle adjudication.
- **3. Strategic Architectural Guardrail for MedCore**:
  - **No Brittle RPA**: MedCore connects directly to hospital databases via non-invasive Change Data Capture (CDC) read-replica listeners and standardized REST/webhook APIs—never screen-scraping.
  - **Deterministic Math, Not Generative AI**: Billing waterfall calculations, VAT exemptions, Senior/PWD discounts, and PhilHealth ACR splits are computed via deterministic microservices with zero hallucination risk.
  - **Verifiable Centavo Audit Trails**: Every calculation, adjustment, and status transition is permanently recorded in a tamper-evident audit ledger compliant with RA 10173.

---

## 3. Domestic Competitor Profiles (Philippine Ecosystem)

### 7. BizBox (Metro Pacific Health Tech / CHC)
- **1. Problem Solved**: Comprehensive enterprise Hospital Information System (HIS); automates clinical charts, pharmacy, laboratory, in-patient admissions, and general hospital accounting.
- **2. Who Pays**: Private and public hospitals and clinics (upfront licensing/implementation + annual support contracts).
- **3. Who Uses It**: Doctors, nurses, pharmacists, hospital billing clerks, cashiers, medical records officers.
- **4. Billing Capability**: Strong legacy hospital billing module; calculates room charges, departmental fees, and prints physical SOAs.
- **5. Insurance Capability**: Basic insurance mapping fields; relies on manual clerk data entry for HMO policy caps.
- **6. PhilHealth Capability**: Certified PhilHealth Health Information Technology Provider (HITP). Integrated eClaims module supporting eSOA XML generation, CF2/CF4 encoding, and BEACON portal integration.
- **7. HMO Capability**: Very limited. Acts as a passive ledger entry (clerk manually encodes HMO approved amount after receiving physical LOA or portal printout).
- **8. Claims Capability**: Direct eClaims submission to PhilHealth; no automated claim submission to HMOs.
- **9. Patient Transparency Capability**: **Zero**. Patient receives only a physical, complex printout at discharge. No mobile interface or real-time cost tracking.
- **10. Reconciliation Capability**: Internal hospital departmental reconciliation; poor automated reconciliation with external HMO remittances.
- **11. Revenue Model**: Traditional enterprise software license, installation fees, recurring maintenance contracts.
- **12. What Gap Remains for MedCore?**: BizBox is an operational back-office ERP/HIS. It lacks patient-facing transparency, automated multi-payer dynamic reconciliation, and real-time pre-discharge LOA integration.

---

### 8. PhilHealth eClaims Ecosystem (PhilHealth Portal / eClaims 3.0)
- **1. Problem Solved**: Government-mandated national health insurance claim processing and statutory reimbursement.
- **2. Who Pays**: Government-funded agency; free for accredited facilities, though compliance requires certified software.
- **3. Who Uses It**: Hospital PhilHealth clerks, billing encoders, PhilHealth claims adjudicators.
- **4. Billing Capability**: Computes All Case Rates (ACR) and DRG benchmark deductions; does not manage non-PhilHealth hospital billing.
- **5. Insurance Capability**: Validates PhilHealth member eligibility and coverage status via Member Data Records (MDR).
- **6. PhilHealth Capability**: Core platform. Governs CF1, CF2, CF4, and eSOA XML standards.
- **7. HMO Capability**: **None**. Completely blind to private HMO coverage.
- **8. Claims Capability**: Full processing of government social health insurance claims.
- **9. Patient Transparency Capability**: Low. Member portal allows checking contribution history, but provides zero visibility into running hospital inpatient bills or real-time claim adjudication during confinement.
- **10. Reconciliation Capability**: Provides electronic remittance lists of paid/denied claims to hospitals, which hospitals must manually reconcile against their general ledgers.
- **11. Revenue Model**: Funded by national budget allocations, employer/employee payroll contributions, and sin tax revenues.
- **12. What Gap Remains for MedCore?**: It is a single-payer government gateway, not a multi-payer orchestrator. It does not interface with HMOs or provide patient billing transparency.

---

### 9. PhilHealth-Certified HITPs (Segworks, Exist Codev, TTSI, K-Plex)
- **1. Problem Solved**: Certified middleware bridges enabling hospital EMR/HIS systems to transmit XML claims safely into PhilHealth's eClaims gateway.
- **2. Who Pays**: Healthcare facilities (hospitals, dialysis clinics, ambulatory centers).
- **3. Who Uses It**: Hospital IT staff and billing encoders.
- **4. Billing Capability**: Validates eSOA XML schemas against PhilHealth item libraries; no consumer billing or hospital ledger engine.
- **5. Insurance Capability**: Restricted to PhilHealth eligibility verification.
- **6. PhilHealth Capability**: High. Specifically built to comply with PhilHealth circulars.
- **7. HMO Capability**: **None**.
- **8. Claims Capability**: Secure transmission and validation of eClaims XML batches.
- **9. Patient Transparency Capability**: **Zero**. Pure B2B middleware.
- **10. Reconciliation Capability**: Delivers PhilHealth claim status updates (In Process, RTH, Denied, Paid).
- **11. Revenue Model**: Per-claim transmission fee (e.g., ₱10–₱30 per claim) or annual subscription license.
- **12. What Gap Remains for MedCore?**: They are narrow technical bridges for PhilHealth compliance. They do not bridge HMOs, do not interact with patients, and do not automate pre-discharge reconciliation.

---

### 10. HMO Claims Platforms (MediLink Network, Inc., In-House HMO Portals)
- **1. Problem Solved**: Electronic Letter of Authorization (eLOA) issuance, card-swipe member verification, and electronic claims submission between HMOs and accredited providers.
- **2. Who Pays**: HMOs/insurers (Maxicare, Intellicare, Medicard, etc.) and hospitals (transaction switch fees).
- **3. Who Uses It**: Hospital HMO liaison officers, clinic receptionists, HMO claims examiners.
- **4. Billing Capability**: Transmits itemized claim billing from provider to HMO; does not compute the unified patient hospital bill.
- **5. Insurance Capability**: Adjudicates policy benefits against member's specific corporate health plan (MBL, deductibles, co-pays).
- **6. PhilHealth Capability**: Very weak. Requires the hospital clerk to manually certify that PhilHealth has been deducted before issuing final HMO approval.
- **7. HMO Capability**: Market-leading in the Philippines. Connects 700+ hospitals to major HMO payors.
- **8. Claims Capability**: Processes eLOAs, claim batches, and payment remittance vouchers.
- **9. Patient Transparency Capability**: Low. Delivers an SMS approval code or printed LOA showing the approved total, but does not provide an itemized breakdown of covered vs. excluded hospital charges.
- **10. Reconciliation Capability**: High for payer-to-provider remittances, but siloed from the hospital's internal HIS and PhilHealth records.
- **11. Revenue Model**: Transaction fees per LOA / swipe + claims processing fees paid by HMOs and healthcare providers.
- **12. What Gap Remains for MedCore?**: MediLink is an HMO clearinghouse switch. It has no patient engagement app, does not resolve the pre-discharge discharge clearance bottleneck, and does not unify PhilHealth ACR + Senior Citizen discounts + hospital excess into a single transparent ledger.

---

## 4. Comprehensive Architectural Differentiation Matrix

| Dimension / Capability | Legacy HIS (BizBox) | HMO Switch (MediLink) | HITP (Segworks) | Global RCM (Cedar) | MedCore Platform |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Domain Focus** | Hospital back-office operations & EMR | B2B HMO LOA transit gateway | PhilHealth eClaims transmission | US patient billing & engagement | Intelligent multi-payer reconciliation & patient UX |
| **Real-Time Patient Bill Transparency** | ❌ No (Dot-matrix paper) | ❌ No (Clerk/payer only) | ❌ No (Middleware) | ✅ Yes (US only) | ✅ **Yes (Mobile Web / PWA)** |
| **Statutory Deduction Engine (RA 9994/10754)** | ⚠️ Manual clerk setup | ❌ No | ❌ No | ❌ Incompatible | ✅ **Automated dynamic calculation** |
| **PhilHealth eClaims 3.0 XML Pipeline** | ⚠️ Basic export | ❌ No | ✅ Transmission only | ❌ Incompatible | ✅ **Automated pre-flight audit** |
| **HMO Multi-Payer Coordination** | ❌ Manual re-keying | ⚠️ Siloed LOA switch | ❌ No | ❌ Incompatible | ✅ **Unified Payer Coordination Engine** |
| **Pre-Discharge Clearance Automation** | ❌ 4–8 hour queue | ❌ No (LOA only) | ❌ No | ❌ N/A (Post-care) | ✅ **Accelerated to < 45 minutes** |
| **Patient Financing / Smart Promissory** | ❌ Paper IOUs | ❌ No | ❌ No | ✅ Integrated US loans | ✅ **Digital Promissory & Installments (RA 9439)** |
