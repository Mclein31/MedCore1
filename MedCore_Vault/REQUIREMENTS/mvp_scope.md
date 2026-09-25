# REQUIREMENTS/mvp_scope.md — Phase 1 MVP Release Boundaries & Acceptance Gates

> **Epistemic Status**: Scope Boundary Specification & Release Gating Standard  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/REQUIREMENTS/`)  
> **Cross-References**: [PRODUCT/vision.md](../PRODUCT/vision.md), [functional.md](functional.md), [non_functional.md](non_functional.md)

---

## 1. MVP Strategic Objective & Scope Boundary

[DECISION] To maximize speed to market, demonstrate immediate operational ROI to hospital CFOs, and avoid over-engineering, the **MedCore Phase 1 MVP** focuses ruthlessly on the **Post-Admission to Discharge Clearance Window** in private tertiary and secondary hospitals.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PHASE 1 MVP BOUNDARY DEFINITION                     │
├───────────────────────────────────┬─────────────────────────────────────┤
│ IN SCOPE (PHASE 1 MVP)            │ OUT OF SCOPE (DEFERRED TO PH 2/3)   │
├───────────────────────────────────┼─────────────────────────────────────┤
│ • BizBox Inpatient Read-Adapter   │ • Comlogik / SAP custom adapters    │
│ • Tripartite Statutory Cascade    │ • Direct automated HMO API clearing │
│ • Doctor Mobile PF Sign-Off       │ • DRG Base Rate & CF5 Weighting     │
│ • eClaims 3.0 Pre-Flight Scrubber │ • Outpatient / Ambulatory billing   │
│ • Patient Clarify Mobile Web PWA  │ • National Patient Health Wallet    │
│ • QR Ph / GCash / Maya Checkout   │ • Automated AI Voice Dispute Agents │
│ • Digital Discharge QR Pass       │ • Direct Payer Remittance Switch    │
│ • Digital Promissory Note (RA9439)│ • Embedded Consumer Micro-Loans     │
└───────────────────────────────────┴─────────────────────────────────────┘
```

---

## 2. In-Scope MVP Features & Core Deliverables

### 1. Hospital Integration & Ingestion
- **BizBox Read-Replica CDC Adapter**: Listens for inpatient order postings, bed transfers, and MGH orders from BizBox MS SQL Server database.
- **Chargemaster Normalization Engine**: Maps BizBox SKU items to standard clinical categories (Pharmacy, Supplies, Diagnostics, Room tariffs).

### 2. Statutory Deduction & Adjudication Engine
- **Codified Statutory Waterfall**:
  $$\text{Net Due} = \left(\left(\text{Gross} - \text{12\% VAT} - \text{20\% SC/PWD}\right) - \text{PhilHealth ACR}\right) - \text{HMO Approved LOA}$$
- **PhilHealth ACR Matrix**: Computes 100% First Case Rate and 50% Second Case Rate splits between Hospital and Doctor PF.
- **HMO Exclusion & Cap Evaluator**: Semi-automated ingestion of approved LOA amounts and automatic tagging of excluded consumables.

### 3. Frontline Operational Consoles
- **Doctor Mobile PF Sign-Off Screen**: Lightweight mobile portal allowing attending physicians to confirm billed fees via SMS magic link within 15 minutes of MGH.
- **Hospital Billing Dashboard**: Unified console displaying real-time running ledgers, LOA status, and one-click eSOA generation.

### 4. Patient Clarify & Settlement
- **Patient Clarify Mobile Web Portal**: Zero-install PWA accessed via SMS magic link, displaying plain-language line-item breakdowns.
- **Philippine Payment Rail Integration**: Instant digital checkout via QR Ph, GCash, Maya, and credit/debit cards.
- **Digital Discharge Pass**: QR code gate pass issued immediately upon balance clearance.
- **Digital Promissory Notes**: Automated generation of authenticated digital promissory notes under RA 9439 for unresolved balances.

### 5. PhilHealth eClaims 3.0 Pre-Flight Auditor
- **XML Schema Validator**: Audits eSOA XML conformances against PhilHealth Circular 2023-0026 item libraries.
- **RTH Discrepancy Scrubber**: Checks centavo balancing between CF2, CF4, and eSOA XML.

---

## 3. Explicitly Deferred Capabilities (Scope Out)

[DECISION] The following capabilities are strictly deferred to maintain release velocity:
- **Phase 2 Deferred**: Direct automated HMO pre-authorization APIs (MediLink REST endpoints); Comlogik/SAP adapters; automated claim status scraping; DRG prospective payment modeling (CF5).
- **Phase 3 Deferred**: Unified patient lifetime health wallet across multiple hospital networks; native iOS/Android consumer apps; embedded fintech medical micro-lending lines; autonomous AI voice agents for billing dispute mediation.

---

## 4. Pilot Hospital Go/No-Go Release Acceptance Gates

[DECISION] The MVP deployment in the initial pilot hospital partner (e.g., a 200–250 bed private tertiary medical center) must satisfy the following release criteria:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PILOT RELEASE ACCEPTANCE CRITERIA                    │
├──────────────────────────┬──────────────────────┬───────────────────────┤
│ Operational SLA          │ Gate Threshold       │ Measurement Protocol  │
├──────────────────────────┼──────────────────────┼───────────────────────┤
│ Discharge Turnaround     │ < 45 Minutes         │ 100 consecutive MGH   │
│ Time (TAT)               │ (Target: < 30 Mins)  │ discharge episodes    │
├──────────────────────────┼──────────────────────┼───────────────────────┤
│ PhilHealth Initial RTH   │ < 2.0%               │ Audited against first │
│ Rejection Rate           │                      │ 200 submitted claims  │
├──────────────────────────┼──────────────────────┼───────────────────────┤
│ Calculation Accuracy     │ 100.0%               │ Zero centavo mismatch │
│                          │                      │ against BIR / DOH     │
├──────────────────────────┼──────────────────────┼───────────────────────┤
│ Digital Payment Uptime   │ 99.9%                │ Zero dropped webhook  │
│                          │                      │ payment confirmations │
├──────────────────────────┼──────────────────────┼───────────────────────┤
│ Data Privacy Compliance  │ 100% Pass            │ Verified AES-256 field│
│ (RA 10173 / NPC)         │                      │ encryption in DB logs │
└──────────────────────────┴──────────────────────┴───────────────────────┘
```
