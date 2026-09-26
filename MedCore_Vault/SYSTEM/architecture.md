# SYSTEM/architecture.md — System Architecture & Component Blueprint

> **Epistemic Status**: Core Technical Architecture & Systems Engineering Specification  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/SYSTEM/`)  
> **Cross-References**: [entities.md](entities.md), [workflows.md](workflows.md), [integrations.md](integrations.md), [data_model.md](data_model.md)

---

## 1. High-Level Architectural Topology

[DECISION] MedCore is architected as an event-driven, cloud-native reconciliation middleware sitting between hospital legacy on-premise systems, external government and commercial payer gateways, and modern patient mobile endpoints:

```
                      MEDCORE PLATFORM ARCHITECTURAL TOPOLOGY

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                         HOSPITAL ON-PREMISE BOUNDARY                        │
  │  ┌───────────────┐     ┌───────────────┐     ┌───────────────────────────┐  │
  │  │ Hospital HIS  │     │ Pharmacy / LIS│     │ Doctor PF Entry / Mobile  │  │
  │  │ (BizBox / SQL)│     │ Dispensary DB │     │ Digital Sign-Off Console  │  │
  │  └───────┬───────┘     └───────┬───────┘     └─────────────┬─────────────┘  │
  │          │                     │                           │                │
  │          ▼                     ▼                           ▼                │
  │  ┌───────────────────────────────────────────────────────────────────────┐  │
  │  │         MedCore Local Agent / Read-Replica CDC Listener (Edge)        │  │
  │  └───────────────────────────────────┬───────────────────────────────────┘  │
  └──────────────────────────────────────┼──────────────────────────────────────┘
                                         │ mTLS / AES-256 Encrypted Tunnel
                                         ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                        MEDCORE CLOUD RECONCILIATION ENGINE                  │
  │                                                                             │
  │   ┌─────────────────────────────────────────────────────────────────────┐   │
  │   │          API Gateway (TLS 1.3, Rate-Limiting, OAuth2/OIDC)          │   │
  │   └──────────────────────────────────┬──────────────────────────────────┘   │
  │                                      │                                      │
  │   ┌──────────────────────────────────┴──────────────────────────────────┐   │
  │   │                   CORE MICROSERVICES CLUSTER                        │   │
  │   │  ┌────────────────────────┐         ┌────────────────────────┐      │   │
  │   │  │   Eligibility Engine   │         │  Reconcile & Waterfall │      │   │
  │   │  │  (PhilHealth/MDR/PEC)  │         │   Calculation Engine   │      │   │
  │   │  └────────────────────────┘         └────────────────────────┘      │   │
  │   │  ┌────────────────────────┐         ┌────────────────────────┐      │   │
  │   │  │ ClaimReady Scrubber    │         │  Discharge Clearance   │      │   │
  │   │  │  (eSOA XML Validator)  │         │  Orchestration Hub     │      │   │
  │   │  └────────────────────────┘         └────────────────────────┘      │   │
  │   │  ┌────────────────────────┐         ┌────────────────────────┐      │   │
  │   │  │  Payer Rule Matrix     │         │  Digital Promissory &  │      │   │
  │   │  │  (HMO Inner Limits)    │         │  Payment Rails Adapter │      │   │
  │   │  └────────────────────────┘         └────────────────────────┘      │   │
  │   └──────────────────────────────────┬──────────────────────────────────┘   │
  │                                      │                                      │
  │   ┌──────────────────────────────────┴──────────────────────────────────┐   │
  │   │       Distributed Data Layer (PostgreSQL, Redis Cache, S3 Vault)    │   │
  │   └──────────────────────────────────┬──────────────────────────────────┘   │
  └──────────────────────────────────────┼──────────────────────────────────────┘
                                         │
             ┌───────────────────────────┼───────────────────────────┐
             ▼                           ▼                           ▼
  ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
  │  PAYER ECOSYSTEM    │     │   PATIENT CLIENT    │     │   HOSPITAL CLIENT   │
  │ • PhilHealth Gateway│     │ • Patient Clarify   │     │ • Billing Console   │
  │   (eClaims 3.0 XML) │     │   (Mobile Web/PWA)  │     │ • HMO Liaison Desk  │
  │ • MediLink Switch   │     │ • QR Ph / GCash Pay │     │ • Cashier Terminal  │
  │ • HMO REST APIs     │     │ • QR Discharge Pass │     │ • CFO RCM Dashboard │
  └─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

---

## 2. Core Subsystems & Service Responsibilities

### 1. Ingestion & Change Data Capture (CDC) Tier
- **MedCore Local Agent (Edge)**: Deployed inside the hospital DMZ. Reads changes from the hospital HIS read-replica database (e.g., BizBox MS SQL Server or PostgreSQL) using non-invasive transaction log listeners.
- **Normalization Pipeline**: Translates proprietary hospital chargemaster schemas, pharmacy codes, and doctor fee slips into standardized MedCore Common Health Finance Objects (CHFO).

### 2. The Core Adjudication Microservices
- **Statutory Waterfall Calculation Engine**: Evaluates the strict Philippine deduction sequence in sub-second latency:
  $$\text{Net Due} = \left(\left(\text{Gross Charges} - \text{12\% VAT Exemption} - \text{20\% SC/PWD Discount}\right) - \text{PhilHealth ACR/DRG}\right) - \text{HMO Approved LOA}$$
- **PhilHealth ClaimReady Engine**: Ingests Claim Forms 1 through 4 and parses eSOA XML schemas against PhilHealth Circular 2023-0026 item libraries. Performs automated semantic cross-checks between CF4 clinical summaries and CF2 diagnostic ICD-10/RVS codes.
- **HMO Adjudication & Exclusion Engine**: Houses the digital rulebook for major commercial payers (Maxicare, Intellicare, Medicard, PhilCare), evaluating daily room limits, surgical consumable exclusions, and MBL balances.
- **Discharge Clearance Orchestration Hub**: Manages the state machine of the discharge workflow:
  $$\text{MGH Posted} \longrightarrow \text{Pharmacy Reconciled} \longrightarrow \text{Doctor PF Signed} \longrightarrow \text{HMO LOA Approved} \longrightarrow \text{Payment Settled} \longrightarrow \text{QR Pass Issued}$$

### 3. Patient Engagement & Payment Delivery Tier
- **MedCore Patient Clarify (PWA)**: Lightweight frontend served via server-side rendering (SSR) and reactive web frameworks. Designed for instant loading on mobile browsers over 3G/4G/5G connections without app store installation.
- **Payment Rails Hub**: Directly connects to local Philippine payment aggregators, providing webhook-verified settlement via QR Ph, GCash, Maya, and credit/debit cards.
- **Digital Promissory Note Engine**: Generates cryptographically verifiable, legally compliant promissory notes under RA 9439 for unpaid balances.

---

## 3. Security, Privacy & Data Compliance Architecture

[FACT] Because MedCore handles Protected Health Information (PHI) and Sensitive Personal Information (SPI) under the **Philippine Data Privacy Act of 2012 (RA 10173)** and National Privacy Commission (NPC) mandates, the platform enforces strict security guardrails:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     THREE-TIER SECURITY ARCHITECTURE                    │
├──────────────────────────┬──────────────────────────────────────────────┤
│ Security Tier            │ Technical Implementation                     │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Transport Security       │ TLS 1.3 enforced across all public endpoints;│
│                          │ Mutual TLS (mTLS) for hospital edge tunnels. │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Data-at-Rest Encryption  │ AES-256 field-level encryption for sensitive │
│                          │ PHI (Patient names, PINs, ICD-10 diagnoses). │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Data Segregation & RBAC  │ Strict logical separation between clinical   │
│                          │ data and financial billing ledgers; multi-   │
│                          │ tenant tenant-ID row-level security (RLS).   │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Audit & Compliance       │ Immutable, cryptographically hashed audit    │
│                          │ trail of every transaction and ledger edit.  │
└──────────────────────────┴──────────────────────────────────────────────┘
```

---

## 4. Frontend Application Architecture & UI Operating Principles

[DECISION] The MedCore operational dashboard (`medcore-dashboard`) is structured as a mission-critical financial cockpit for hospital billing officers, HMO liaison desks, and nursing clearance staff:

### 1. View Architecture & Route Taxonomy
The application coordinates 7 distinct operational routes:
- **`COMMAND_CENTER`**: Two-screen executive overview with high-density priority blocker strip, real-time trapped revenue KPI, and dual operational pipelines (Payer Coverage & Unresolved Billing Exceptions).
- **`DISCHARGE_CLEARANCE`**: Master-detail clearance workstation featuring the 6-stage discharge state machine, real-time SLA breach countdowns, itemized chargemaster audit, and digital gate pass authorization.
- **`ENCOUNTERS_LEDGER`**: Pre-admission intake pipeline and tripartite master running bill ledger.
- **`COVERAGE_APPROVALS`**: Multi-payer LOA coordination desk supporting 8 commercial HMO gateways and PhilHealth PEC verification.
- **`DISPUTES_EXCEPTIONS`**: Contested charge triage desk and statutory RA 9439 promissory note register.
- **`CLAIMS_ESOA`**: PhilHealth eClaims pre-flight audit worklist and dynamic XML payload generator.
- **`RCM_ANALYTICS`**: CFO-grade denial analytics, HMO turnaround time metrics, and revenue recovery telemetry.

### 2. Viewport Containment & Scrolling Rules
- **Zero Page-Level Vertical Spills**: Every primary view container is strictly constrained to the viewport (`h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] overflow-hidden flex flex-col pb-3 sm:pb-4`).
- **Independent Card Scrolling**: Scrollable sub-containers use `overflow-y-auto` paired with `overscroll-contain`. When an operator scrolls to the boundary of a card or table, the scroll event never bubbles or chains to the underlying dashboard.
- **Elimination of Nested Scrollbars**: Workstation side panels (e.g. Additional Data pane) are sized dynamically to fit within available space without internal scrollbars.

### 3. In-Situ Search & Docked Pagination
- **No Global Search**: Universal search was decommissioned to eliminate context switching. Search bars are embedded in-situ within their respective operational tables.
- **Deterministic Docked Pagination**: High-volume tables display fixed row counts (e.g. 11 rows in Pipelines/Disputes, 8 in Claims, 12 in Coverage Approvals) with docked `Previous / Next` navigation bars pinned to table footers.
- **Full-Dataset Querying**: In-situ search filters operate against the full dataset (250 encounters), automatically resetting pagination to page 1 upon query changes.

### 4. Enterprise Table Standard (Strict Left-Alignment)
- **Strict Universal Left Alignment (`text-left`)**: Every `<th>` and `<td>` across all dashboard tables is strictly left-aligned, including currency amounts, dates, quantities, codes, and action containers (`justify-start`). This eliminates ragged vertical scanlines and minimizes cognitive load for billing operators.

### 5. Responsive Master-Detail Sizing
- In `ActiveDischargeRadar`, viewports `>= 1024px` (`lg`) render the split-pane master-detail HIMS workstation (patient queue on left, clearance console on right).
- Viewports `< 1024px` automatically activate a responsive segmented pane switcher (`QUEUE` | `DETAIL`) with a "← Back to Patient Queue" navigation button, preventing column squishing and maintaining high readability.
