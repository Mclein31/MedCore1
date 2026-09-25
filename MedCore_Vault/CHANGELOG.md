# CHANGELOG.md — MedCore Vault Revision History

> **Epistemic Status**: Immutable System Audit Log  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/`)  
> **Standards Compliance**: Keep a Changelog & Semantic Versioning

## [1.3.0] — 2026-09-25

### Working Frontend Prototype Implementation (MedCore Command Center)

#### Added
- [FEATURE] **4-Tier Command Center**: Built interactive production frontend prototype with Global Command Bar (Tier 1), 5-Pillar Telemetry (Tier 2), Primary Operational Workspace (Tier 3), and Contextual Action Drawer & Modals (Tier 4).
- [FEATURE] **Discharge Clearance Mission Control**: Built 6-stage Kanban board (`MGH_DECLARED`, `DOCTOR_PF_PENDING`, `PHARMACY_RTS_AUDIT`, `HMO_FINAL_LOA`, `PENDING_SETTLEMENT`, `CLEARED_GATE_PASS`) tracking operational SLA timers, warnings (>25m), and breaches (>40m).
- [FEATURE] **Tripartite Reconciled Ledger Workbench**: Built continuous financial adjudication workbench displaying interactive deduction waterfall (`Gross -> 12% VAT Exemption -> 20% SC/PWD Discount -> PhilHealth ACR -> HMO Approved LOA -> Net Patient Due`) with exact centavo precision and zero floating-point drift.
- [FEATURE] **"Why Do I Owe This?" Explainer Drawer**: Natural-language translation of cryptic hospital chargemaster line items into plain English/Tagalog with statutory and policy citations (RA 9439, RA 9994/10754, PhilHealth Circular 2024-0037).
- [FEATURE] **Contextual Action Modals**:
  - `DoctorQuickSignModal`: Attending physician 15-minute quick-sign portal with automated HMO accredited schedule ceiling fallback to protect patients against unbudgeted excess PF.
  - `DigitalPromissoryModal`: Republic Act No. 9439 (Anti-Hospital Detention Law) statutory promissory note guarantee with PhilSys National ID capture and 3/6/12-month interest-free amortizations.
  - `DigitalGatePassModal`: Cryptographic HMAC-SHA256 QR discharge clearance slip with real-time lobby exit security verification.
- [FEATURE] **Full Navigation Engine**: 10 operational routes (`COMMAND_CENTER`, `GUIDE`, `VERIFY`, `RECONCILE`, `REWARD`, `REPORT`, `IMPROVE`, `DISPUTE_DESK`, `PATIENT_CLARIFY`, `SETTINGS`), plus universal Cmd+K fast patient search palette.
- [VERIFICATION] Confirmed `npx tsc --noEmit` clean exit (0 errors) and `npx vite build` successful production bundle compilation.

---

## [1.2.0] — 2026-09-25

### Master Dashboard Redesign & Project Brain Keeper Synchronization

#### Added
- [DECISION] **The 5-Pillar Value Engine**: Formally synthesized and standardized the product lifecycle around the canonical pillars:
  $$\mathbf{GUIDE} \longrightarrow \mathbf{VERIFY} \longrightarrow \mathbf{REWARD} \longrightarrow \mathbf{REPORT} \longrightarrow \mathbf{IMPROVE}$$
  with **`RECONCILE`** serving as the continuous intra-care tripartite ledger workbench.
- [FACT] **PhilHealth Rate Increases (2024–2025)**: Recorded **Circular No. 2024-0001** (+30% across the board in Feb 2024) and **Circular No. 2024-0037** (+50% across ~9,000 medical and procedural case rates effective January 1, 2025) in `DOMAIN/philhealth.md` and `.brain/PROJECT_CONTEXT.md`.
- [FACT] **Single Period of Confinement (SPC) Abolition & Retroactive Claims**: Updated SPC from "suspended" to permanently **abolished under Circular No. 2024-0021** (effective October 1, 2024). Recorded **Circular No. 2025-0015** authorizing retroactive processing and refiling of denied SPC claims back to February 20, 2019. Refactored `ClaimReady` module to include an automated retroactive claim package compiler.
- [FACT] **HMO Industry Financial Rebound (2024)**: Recorded official Insurance Commission data confirming the HMO industry returned to profitability with **₱979.8 Million in net income** (reversing a ₱4.27 Billion loss in 2023) on revenues of **₱79.37 Billion**, with **₱61.05 Billion** paid in claims, while active licensed HMOs consolidated from 29 to 25.
- [DECISION] **Olive AI Competitor Post-Mortem & Architectural Guardrail**: Formally registered the October 2023 collapse of Olive AI ($4B valuation, $900M raised) in `RESEARCH/competitors.md`. Mandated strict anti-patterns: MedCore strictly prohibits brittle RPA screen-scraping and black-box generative AI for deterministic billing math, utilizing CDC database read-replicas and centavo-accurate audit trails.
- [DECISION] **Operational Dashboard Blueprint**: Adopted the 4-tier operational cockpit architecture, 6-stage Discharge Clearance Kanban with 45-minute SLA countdown, Tripartite Reconciled Ledger Workbench with "Why Do I Owe This?" explainers, Interactive Dispute Desk, RA 9439 Digital Promissory Note Authoring Modal, and ClaimReady eSOA XML/CF4 Pre-Flight Scrubber.

---

## [1.1.0] — 2026-09-25

### Formal Project Objectives (Input, Process, Output, Outcome Framework)

#### Added
- [DECISION] Formalized the canonical **General Objective** and **Specific Objectives** structured under the Input, Process, Output, Outcome (IPOO) framework.
- [DECISION] Explicitly mirrored the seven core billing pain points in the General Objective (unclear patient responsibility, billing disputes, delayed payments, administrative burden, siloed portals, legacy hospital systems, and multiple payment channels) into positive, dispute-free operational transformations in the Outcome.
- [DECISION] Integrated Cedar-inspired clinical and financial categorization principles into the database and deduction engine architecture while maintaining independent, generalizable domain terminology.
- [DECISION] Enforced fully expanded terminology (zero abbreviations or percent symbols) in both the Project Operational Brain (`.brain/PROJECT_CONTEXT.md`) and Product Intelligence Vault (`MedCore_Vault/PROJECT.md`).
- [DECISION] Enhanced the Output deliverables to actively maximize statutory benefits and insurance coverage by coordinating Philippine Health Insurance Corporation case rates with private health maintenance organization policies, capturing all eligible reimbursements, and preventing underclaiming.

---

## [1.0.0] — 2026-09-25

### Genesis: Project Intelligence Vault Creation

#### Added
- [DECISION] Initialized `MedCore_Vault/` as the canonical, persistent, single-source-of-truth knowledge vault synthesizing inputs from the Project Manager (PM) Strategic Direction and the Domain Researcher Market/Regulatory Report.
- [DECISION] Established the **Project Memory Model** architecture across 8 directory subsystems:
  - `PRODUCT/`: Vision, Problems, Users, Value Propositions, Product Model, and Workflows.
  - `DOMAIN/`: PhilHealth, HMOs, Hospital Billing, Patient Financial Responsibility, Insurance Reconciliation, and Billing Disputes.
  - `RESEARCH/`: Market, Competitors, Cedar Model Translation, Statistics, Regulations, and Sources.
  - `BUSINESS/`: Business Model, Revenue Model, Stakeholders, and Competitive Landscape.
  - `SYSTEM/`: Architecture, Entities, Sequence Workflows, Integrations, and Data Models.
  - `DECISIONS/`: Product Decisions, Technical Decisions, and Pilot Assumptions.
  - `REQUIREMENTS/`: Functional Specifications, Non-Functional Guardrails, and MVP Release Scope.
  - Root: `README.md`, `PROJECT.md`, `ONTOLOGY.md`, and this `CHANGELOG.md`.
- [FACT] Codified verified Philippine health expenditure metrics from PSA PNHA 2023–2024:
  - Total Current Health Expenditure: ₱1.44T (2023) / ₱1.56T (2024).
  - Out-of-Pocket (OOP) Burden: 44.4% (2023) / 42.7% (2024).
  - Voluntary Health Insurance (HMO/Private): 13.0% (₱161.35B in 2023; ₱61.05B benefits paid in 2024).
  - Social Health Insurance (PhilHealth): 10.2% of CHE.
- [FACT] Formally codified statutory deduction cascade order pursuant to RA 9994, RA 10754, RA 11223, and DOH/BIR guidelines:
  $$\text{Net Due} = \left(\left(\text{Gross Charges} - \text{12\% VAT Exemption} - \text{20\% SC/PWD Discount}\right) - \text{PhilHealth ACR/DRG}\right) - \text{HMO Approved LOA}$$
- [FACT] Documented PhilHealth technical circulars: Circular 2019-0002 (CF4 mandatory clinical abstract), Circular 2023-0026 & eClaims 3.0 (XML eSOA mandate; scanned PDF deprecation), and 60-day filing rule.
- [FACT] Recorded Anti-Hospital Detention Law (RA 9439), Anti-Hospital Deposit Law (RA 10932), Universal Health Care Act (RA 11223), Consumer Protection Act (RA 11765), and Data Privacy Act (RA 10173).

#### Resolved Contradictions
- [DECISION] **Core Operating Loop Nomenclature**: Reconciled historical notes (`Guide → Verify → Reward → Report → Improve`) with the PM strategic specification. Established **`GUIDE → VERIFY → RECONCILE → APPROVE → IMPROVE`** as the canonical 5-stage loop. Mapped "Reward/Report" into Stage 4 (settlement incentives) and Stage 5 (executive telemetry).
- [DECISION] **Discharge Turnaround Time SLA**: Reconciled empirical baseline (4 to 8+ hours in tertiary private hospitals) with target goals. Codified primary operational threshold as **< 45 minutes**, with optimal performance target **< 30 minutes**.
- [DECISION] **Single Period of Confinement (SPC)**: Reconciled PM's 90-day monitoring requirement with researcher finding of PhilHealth's October 1, 2024 policy suspension. Configured SPC as a dynamic policy toggle within `ClaimReady` to handle audit compliance and regulatory re-imposition without code changes.
- [ASSUMPTION] **Payment Processing Take-Rate**: Reconciled PM's 1.2%–1.8% convenience fee estimate with researcher's 1.5%–2.5% take-rate band. Codified commercial baseline as a **1.2% to 2.5% variable band** depending on payment rail (QR Ph / e-wallets vs. credit/debit cards).

#### Operational Guidelines
- All future development agents (Coders, Reviewers, Architects) must reference `MedCore_Vault/` as immutable shared state.
- No agent may alter statutory algorithms or invent arbitrary PhilHealth/HMO deduction rules.
- Operational brain state synchronized with `.brain/PROJECT_CONTEXT.md`.
