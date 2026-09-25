# PROJECT.md — MedCore Executive Charter & Strategic Boundaries

> **Epistemic Status**: Core Strategic Specification  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/`)  
> **Cross-References**: [README.md](README.md), [ONTOLOGY.md](ONTOLOGY.md), [PRODUCT/problems.md](PRODUCT/problems.md), [PRODUCT/vision.md](PRODUCT/vision.md)

---

## 1. Executive Summary & Mission Statement

[DECISION] **Platform Name**: MedCore  
[DECISION] **Category**: Financial Intelligence & Multi-Payer Reconciliation Platform for Philippine Healthcare  
[DECISION] **Mission**: To eliminate the administrative friction, financial opacity, and operational gridlock of Philippine hospital discharge billing by providing an intelligent, tripartite reconciliation middleware that unifies hospital chargemasters, PhilHealth statutory benefits, and private HMO policies into a real-time, explainable digital ledger for providers, payers, and patients.

In Philippine healthcare, the point of billing and discharge is an acute operational bottleneck. When a hospitalized patient is medically cleared by their attending physician ("May Go Home" / MGH order), an administrative ordeal unfolds: the Discharge Clearance Process, which routinely consumes between **4 to 8+ hours**—and frequently spills into the next morning. During this extended wait, the patient remains trapped in their hospital room, blocking bed turnover for incoming emergency and elective admissions, while hospital billing clerks manually navigate a fragmented paper-and-portal maze between internal ledgers, PhilHealth eClaims, and private HMO desks.

MedCore resolves this systemic breakdown by orchestrating a continuous, automated three-way financial handshake throughout the inpatient stay, compressing discharge billing clearance down to **under 45 minutes** (targeting **<30 minutes**).

---

## 1.1 Project Objectives (Input, Process, Output, Outcome Framework)

### General Objective
To develop **MedCore**, an intelligent financial reconciliation and patient engagement platform that resolves common billing conflicts among patients, hospitals, and insurers by addressing seven major problems:
1. **Unclear patient responsibility** regarding out-of-pocket costs.
2. **Billing disputes** and confusion during patient discharge.
3. **Delayed payments** and slow insurance reimbursements to hospitals.
4. **Heavy administrative burden** on hospital billing personnel.
5. **Siloed portals** across different private health maintenance organizations.
6. **Legacy hospital systems** that do not communicate with modern platforms.
7. **Multiple fragmented payment channels** that require manual, in-person cashier transactions.

### Specific Objectives

- **Input:**
  - To conduct user surveys with hospital staff and patients to identify key billing pain points.
  - To design a user-friendly graphical user interface that registers and organizes patient personal details, statutory identification (Philippine Health Insurance Corporation, Senior Citizen, and Persons with Disabilities credentials), private health maintenance organization insurance parameters, and itemized hospital chargemaster feeds.
- **Process:**
  - To design a secure database to store, update, and classify complex hospital chargemaster items into simple, patient-friendly functional categories.
  - To build an automated calculation engine that systematically applies government discounts, Philippine Health Insurance Corporation case rates, and private insurance coverage to determine the exact remaining patient balance.
  - To validate billing and diagnostic data automatically before submission to prevent claim errors and clerical mistakes.
- **Output:**
  - To generate optimized electronic claim packages that accurately coordinate primary and secondary case rates with private health maintenance organization coverage to capture every eligible benefit and prevent underclaiming.
  - To produce an itemized digital patient billing statement sent directly to the patient's mobile phone that clearly explains charges and demonstrates how benefits from the Philippine Health Insurance Corporation and private health maintenance organizations are maximized to minimize out-of-pocket expenses.
  - To provide an integrated digital payment gateway supporting mobile electronic wallets, bank transfers, national interoperable Quick Response codes, and flexible digital promissory notes for any remaining balance.
  - To deliver a hospital administrative dashboard with real-time financial ledgers that monitor insurance authorization limits, flag underutilized patient benefits, and track claim approvals.
  - To generate visual reports in the form of lists, tables, and graphs that analyze insurance benefit utilization, reimbursement timelines, and financial performance trends.
- **Outcome (Positive Reversal of General Objectives):**
  - **Clear Patient Responsibility:** Patients receive transparent, easy-to-understand billing summaries with zero surprise fees.
  - **Dispute-Free Billing:** Discharge billing confrontations are eliminated through accurate, upfront itemization.
  - **Accelerated Hospital Payments:** Cash collections and insurance reimbursements are settled quickly without costly delays.
  - **Reduced Administrative Burden:** Hospital billing staff are freed from repetitive paperwork and manual calculations.
  - **Unified Insurance Coordination:** Different private insurance portals are connected into one centralized system.
  - **Modernized Hospital Systems:** Existing hospital information systems are linked and enhanced through seamless middleware.
  - **Simple Digital Payments:** Patients can pay conveniently from their phones through unified digital channels instead of waiting in cashier queues.
  - **Fast Discharge Clearance:** Patient discharge waiting times are reduced from several hours to under forty-five minutes.

---

## 2. The Non-Negotiable Core Problems

MedCore specifically targets the **Philippine Billing Trilemma**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE MEDCORE TRIAD                                      │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│        PROBLEM 1         │          PROBLEM 2          │           PROBLEM 3           │
│     UNCLEAR PATIENT      │   DISCONNECTED INSURANCE    │     BILLING DISPUTES &        │
│ FINANCIAL RESPONSIBILITY │       RECONCILIATION        │    TRANSPARENCY CONCERNS     │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • Opaque waterfall math  │ • Multi-portal fragmentation│ • High PhilHealth RTH rates   │
│ • Zero running updates   │ • 4–8 hour discharge delays │ • Retroactive HMO exclusions  │
│ • Cryptic dot-matrix SOAs│ • Manual phone/fax liaison  │ • PF bill shock at discharge  │
│ • Discharge "bill shock" │ • Re-keying & clerical gaps │ • Anti-detention legal risks  │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

1. [RESEARCHED] **Unclear Patient Financial Responsibility**: Patients face an opaque deduction waterfall across statutory Senior/PWD discounts, PhilHealth All Case Rates, and private HMO coverage. Deprived of running updates during care, patients receive cryptic 5-to-15 page dot-matrix Statements of Account (SOAs) at the cashier desk, triggering catastrophic "bill shock."
2. [RESEARCHED] **Disconnected and Inefficient Insurance Reconciliation**: Hospital billing departments must bridge three disparate data worlds simultaneously: internal Hospital Information Systems (BizBox, Comlogik, SAP), PhilHealth eClaims gateways, and commercial HMO authorization portals/switches (MediLink PayLink, Maxicare). This disconnected triaging requires manual phone calls, physical paper Doctor Professional Fee (PF) slip gathering, and clerical re-keying.
3. [RESEARCHED] **Insurance/Billing Disputes & Regulatory Exposure**: Trivial clerical discrepancies cause a **15% to 20% PhilHealth Return-to-Hospital (RTH)** rate, locking up ₱4B to ₱10B in provider liquidity across the private hospital network. Meanwhile, surprise HMO consumable exclusions and excess doctor fees lead to bitter confrontations at discharge, putting hospitals in jeopardy of violating the **Anti-Hospital Detention Law (RA 9439)** and **Anti-Hospital Deposit Law (RA 10932)**.

---

## 3. The Strategic Boundary (What MedCore Is NOT)

[DECISION] To maintain architectural discipline and avoid scope creep, MedCore's functional boundaries are strictly defined:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     HOSPITAL CORE OPERATIONS (HIS / EMR)                │
│   • Electronic Medical Records (EMR)       • Ward Nursing Shift Rosters │
│   • Pharmacy Dispensing & Inventory        • Operating Room Scheduling  │
│   • Laboratory Information Systems (LIS)   • Clinical Charting          │
│   ───────────────────────────────────────────────────────────────────   │
│                      MEDCORE DOES NOT OPERATE HERE                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Read-Replica / Order Feeds
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   MEDCORE FINANCIAL RECONCILIATION LAYER                │
│   • Real-Time Tripartite Deductions        • HMO Pre-Auth & LOA Switch  │
│   • Statutory SC/PWD Exemption Engine      • Pre-Flight eClaims Scrubber│
│   • Consumer Real-Time Digital Ledger      • Digital Settlement & Passes│
└─────────────────────────────────────────────────────────────────────────┘
```

- **MedCore is NOT a Hospital Information System (HIS)**: MedCore does not manage ward nursing shifts, bed housekeeping logistics, laboratory specimen routing, or central supply stockroom procurement.
- **MedCore is NOT an Electronic Medical Record (EMR)**: MedCore does not maintain longitudinal patient health histories, bedside clinical notes, doctor orders, or diagnostic imaging archives.
- **MedCore IS a Dedicated Financial Intelligence & Multi-Payer Reconciliation Middleware**: MedCore integrates on top of existing HIS platforms (via read-replicas, HL7/FHIR feeds, and eSOA XML export listeners) and acts as an intelligent clearinghouse connecting hospital ledgers, government health insurance (PhilHealth), commercial HMOs, and patient digital wallets.

### 3.1 The 5-Pillar Value Engine
[DECISION] The MedCore product loop is standardized around five core operational pillars:
$$\mathbf{GUIDE} \longrightarrow \mathbf{VERIFY} \longrightarrow \mathbf{REWARD} \longrightarrow \mathbf{REPORT} \longrightarrow \mathbf{IMPROVE}$$
- **GUIDE (Stage 1)**: Pre-admission cost estimation, room category allowance comparisons, and deposit-free financial orientation (RA 10932).
- **VERIFY (Stage 2)**: Real-time PhilHealth PEC checking, qualifying contribution checks, and HMO electronic pre-authorization (eLOA).
- **REWARD (Stage 3)**: Settlement incentives, prompt-settlement courtesy discounts (e.g., 2%), rapid Doctor PF remittance credits, and RA 9439 digital promissory notes.
- **REPORT (Stage 4)**: Real-time discharge countdown telemetry (<45 min SLA), pre-flight eSOA XML/CF4 scrubbing, Days in A/R (DAR), and tripartite financial ledger balances.
- **IMPROVE (Stage 5)**: Continuous learning and denial prevention loop. Aggregates PhilHealth RTH discrepancy codes and HMO disallowances to deploy preventative validation rules into Stages 1–3, permanently reducing claim rejections to <2%.

---

## 4. Key Performance Indicators & Target Metrics

MedCore evaluates operational and business success against four quantifiable vectors:

| Metric Category | Baseline (Philippine Reality) | MedCore Target | Epistemic Status |
| :--- | :--- | :--- | :--- |
| **Discharge Turnaround Time (TAT)** | 4 to 8+ hours in tertiary private hospitals (2.5–4.5 hrs rural) | **< 45 minutes** (primary SLA); **< 30 minutes** (target) | `[RESEARCHED]` $\rightarrow$ `[DECISION]` |
| **PhilHealth Return-to-Hospital (RTH) Rate** | 15% to 20% initial rejection rate | **< 2%** via pre-flight XML/CF4 scrubbing | `[RESEARCHED]` $\rightarrow$ `[DECISION]` |
| **Days in Accounts Receivable (DAR)** | 75+ days average for multi-payer claims | **< 35 days** through automated clean submission | `[RESEARCHED]` $\rightarrow$ `[DECISION]` |
| **Point-of-Service (POS) Collections** | Delayed collections; heavy promissory note reliance (<20% recovery) | **+25% to +40%** digital out-of-pocket settlement lift | `[RESEARCHED]` $\rightarrow$ `[DECISION]` |
| **Clerical Administrative Overhead** | Hundreds of manual hours cross-referencing portals & slips | **40% reduction** in billing clerk reconciliation time | `[RESEARCHED]` $\rightarrow$ `[DECISION]` |

---

## 5. Architectural Alignment & Vault Governance

All development, testing, and operational agents working on MedCore must verify their outputs against the files in this vault:
- For domain rules governing PhilHealth, see [DOMAIN/philhealth.md](DOMAIN/philhealth.md).
- For HMO policy logic and exclusion handling, see [DOMAIN/hmo.md](DOMAIN/hmo.md).
- For system integration standards, see [SYSTEM/integrations.md](SYSTEM/integrations.md).
- For release gating and Phase 1 constraints, see [REQUIREMENTS/mvp_scope.md](REQUIREMENTS/mvp_scope.md).
