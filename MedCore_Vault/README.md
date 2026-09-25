# MedCore_Vault — Single-Source-of-Truth Knowledge Architecture

> **Epistemic Status**: Authoritative Project Knowledge Repository  
> **System Role**: Persistent Cognitive Vault for Autonomous Agents and Human Engineers  
> **Domain**: Financial Intelligence & Multi-Payer Reconciliation for Philippine Healthcare  
> **Project Root**: `/Users/mclein/Documents/Developer/Personal_Projects/MedCore1`  
> **Active Knowledge Layer**: Project Obsidian Vault (`MedCore_Vault/`)

---

## 1. Vault Purpose & Operational Philosophy

[DECISION] `MedCore_Vault/` serves as the persistent, single-source-of-truth knowledge base and cognitive memory for the **MedCore Platform**. It synthesizes domain research, statutory frameworks, product management requirements, system architecture specifications, and empirical healthcare benchmarks into a cohesive, rigorously structured hierarchy.

This vault is engineered to follow the **Project Memory Model**:
- **WHY**: [Problems](PRODUCT/problems.md), [Market Research](RESEARCH/market.md), [User Personas](PRODUCT/users.md), and [Value Propositions](PRODUCT/value_proposition.md).
- **WHAT**: [Product Capabilities](PRODUCT/product_model.md), [Core Closed-Loop Engine](PRODUCT/workflows.md), [Functional Requirements](REQUIREMENTS/functional.md), and [MVP Scope](REQUIREMENTS/mvp_scope.md).
- **HOW**: [System Architecture](SYSTEM/architecture.md), [Domain Entities](SYSTEM/entities.md), [Data Models](SYSTEM/data_model.md), and [System Integrations](SYSTEM/integrations.md).
- **WHY THIS WAY**: [Empirical Healthcare Data](RESEARCH/statistics.md), [Statutory Governance](RESEARCH/regulations.md), [Global Reference Adaptation (Cedar)](RESEARCH/cedar_model.md), and [Architectural Decisions](DECISIONS/product_decisions.md).

---

## 2. Epistemic Classification Taxonomy

To ensure semantic integrity and prevent AI agents from treating unverified assumptions as codified law, every substantive statement in this vault is tagged with one of the following epistemic markers:

| Tag | Epistemic Level | Definition & Operational Treatment |
| :--- | :--- | :--- |
| `[FACT]` | Codified Law / Official Data | Formally enacted Philippine statutes (RA 9994, RA 10754, RA 9439, RA 11223), PhilHealth circulars, BIR tax rules, and official PSA census statistics. Agents must never alter or violate these. |
| `[RESEARCHED]` | Empirical Findings | Verified real-world benchmarks from industry associations (PHAPi), Insurance Commission reports, hospital operations research, and healthcare financial analyses. |
| `[DECISION]` | Product & Tech Commitment | Deliberate architectural, scope, UX, or business choices finalized by the MedCore leadership. Forms the baseline for implementation. |
| `[ASSUMPTION]` | Working Hypothesis | Operational or commercial estimates (e.g., payment processing take-rate bands, conversion velocity) requiring empirical hospital pilot validation. |
| `[HYPOTHESIS]` | Predictive Belief | Anticipated behavioral, economic, or technological outcomes to be measured and validated post-deployment (e.g., machine learning denial prevention efficacy). |
| `[OPEN QUESTION]` | Unresolved Blocker | Unresolved legal, technical, or partnership ambiguities flagged for engineering spike or executive resolution. |

---

## 3. Directory Map & Structural Index

The vault is organized into 8 distinct cognitive subsystems:

```
MedCore_Vault/
├── README.md                           # This index, navigation rules, and agent guidance
├── PROJECT.md                          # Executive summary, mission, boundaries, and metrics
├── ONTOLOGY.md                         # Authoritative glossary of Philippine healthcare & billing terms
├── CHANGELOG.md                        # Immutable audit log of knowledge additions and modifications
│
├── PRODUCT/                            # Product Strategy, Scoping, and UX Architecture
│   ├── vision.md                       # 5-Year Horizon (Phase 1 Wedge → Phase 2 Network → Phase 3 Wallet)
│   ├── problems.md                     # Deep-dive into the Philippine Billing Trilemma
│   ├── users.md                        # User personas (Patient, Billing Clerk, HMO Liaison, etc.)
│   ├── value_proposition.md            # Multi-stakeholder value propositions (Provider, Payer, Patient)
│   ├── product_model.md                # The 5 Modular Pillars (Clarify, Flow, Reconcile, ClaimReady, RCM)
│   └── workflows.md                    # The Canonical Operating Loop (GUIDE → VERIFY → RECONCILE → APPROVE → IMPROVE)
│
├── DOMAIN/                             # Deep Philippine Healthcare Domain & Regulatory Mechanics
│   ├── philhealth.md                   # PhilHealth All Case Rates, DRG migration, CF1–CF4, eClaims 3.0 XML
│   ├── hmo.md                          # Private HMO ecosystem, MBL caps, inner limits, exclusion lists
│   ├── hospital_billing.md             # Chargemaster architecture, ward silos, doctor PF slip workflows
│   ├── patient_financial_responsibility.md # The strict statutory deduction cascade algorithm
│   ├── insurance_reconciliation.md     # Multi-portal fragmentation and manual tripartite triage
│   └── billing_disputes.md             # Root causes of discharge friction, RA 9439, and RA 10932 exposure
│
├── RESEARCH/                           # Empirical Evidence, Market Benchmarks, & Global Analyses
│   ├── market.md                       # Current Health Expenditure (CHE), OOP metrics, TAM/SAM/SOM
│   ├── competitors.md                  # 12-point capability matrix of global and domestic players
│   ├── cedar_model.md                  # Cedar Healthcare ($3.2B) model deep-dive and Philippine translation
│   ├── statistics.md                   # Consolidated metrics (TAT, denial rates, PHAPi backlog)
│   ├── regulations.md                  # Codified legal frameworks (RA 9994, 10754, 9439, 10932, 11223, 10173)
│   └── sources.md                      # Bibliographic registry of government circulars, reports, and citations
│
├── BUSINESS/                           # Commercial Model, Monetization, & Go-to-Market
│   ├── business_model.md               # The 4-part hybrid model (SaaS + Per-Discharge + Rail + Gainshare)
│   ├── revenue_model.md                # Hospital CFO ROI models, bed-turnover economics, cash recovery
│   ├── stakeholders.md                 # Provider-Payer-Patient incentive alignment
│   └── competitive_landscape.md        # Positioning matrix ("The Integration Middle")
│
├── SYSTEM/                             # Technical Architecture, Data Schemas, & System Contracts
│   ├── architecture.md                 # System overview, component diagrams, security tiers
│   ├── entities.md                     # Formal domain entities and bounded contexts
│   ├── workflows.md                    # Sequence diagrams for Intake, Live Adjudication, and Discharge
│   ├── integrations.md                 # BizBox/Comlogik read-replicas, eClaims XML, HMO webhooks
│   └── data_model.md                   # JSON/SQL schemas for tripartite ledger, claims, and passes
│
├── DECISIONS/                          # Architectural Decision Records (ADRs) & Assumptions
│   ├── product_decisions.md            # Log of confirmed scope and design choices
│   ├── technical_decisions.md          # Technology stack, encryption, and modularity decisions
│   └── assumptions.md                  # Catalog of assumptions tagged for hospital pilot testing
│
└── REQUIREMENTS/                       # System Specifications & Release Scope
    ├── functional.md                   # Detailed functional requirements by module
    ├── non_functional.md               # Latency, security (NPC/RA 10173), availability, auditability
    └── mvp_scope.md                    # Phase 1 delivery boundaries, included features, and exclusions
```

---

## 4. Querying & Navigation Guidance for Autonomous Agents

When assigned to a task within the MedCore workspace, autonomous agents must adhere to the following protocol:

1. **Understand Boundaries**: Read [PROJECT.md](PROJECT.md) first to ensure you do not treat MedCore as an EMR, ward management system, or full HIS replacement.
2. **Standardize Nomenclature**: Consult [ONTOLOGY.md](ONTOLOGY.md) before writing code, documentation, or schemas to ensure consistent naming of domain concepts (e.g., distinguishing between `All Case Rates (ACR)` and `Diagnosis-Related Groups (DRG)`).
3. **Validate Statutory Logic**: Never guess mathematical algorithms. Always reference [patient_financial_responsibility.md](DOMAIN/patient_financial_responsibility.md) for the statutory deduction cascade.
4. **Inspect Architectural Contracts**: When building or modifying data models, review [SYSTEM/data_model.md](SYSTEM/data_model.md) and [SYSTEM/entities.md](SYSTEM/entities.md).
5. **Honor Non-Functional Guardrails**: Check [REQUIREMENTS/non_functional.md](REQUIREMENTS/non_functional.md) for data privacy mandates under the Philippine Data Privacy Act of 2012 (RA 10173) and National Privacy Commission regulations.
