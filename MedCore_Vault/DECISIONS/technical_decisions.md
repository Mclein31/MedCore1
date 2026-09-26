# DECISIONS/technical_decisions.md — Technical Architecture & Engineering Decisions

> **Epistemic Status**: Architectural Decision Record (ADR) Log — Engineering Architecture  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/DECISIONS/`)  
> **Cross-References**: [SYSTEM/architecture.md](../SYSTEM/architecture.md), [SYSTEM/data_model.md](../SYSTEM/data_model.md), [SYSTEM/integrations.md](../SYSTEM/integrations.md)

---

## 1. TDR-001: Relational Core (PostgreSQL) with JSONB Document Flexibility

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: Medical billing demands absolute ACID transaction guarantees to eliminate centavo discrepancies, while multi-payer policy rules and varying hospital chargemaster schemas require high document polymorphism.
- **Decision**: Standardize on **PostgreSQL 16+** as the primary datastore:
  - Strict relational schemas for financial ledgers, patient identifiers, encounters, and audit trails.
  - Native `JSONB` columns for unstructured HMO exclusion rulebooks, raw eSOA XML payloads, and transient insurance response objects.
  - Multi-tenant data segregation enforced via PostgreSQL **Row-Level Security (RLS)** keyed to `hospital_id`.
- **Consequences**: Uncompromised financial auditability paired with flexible schema evolution.

---

## 2. TDR-002: Field-Level AES-256 Encryption for PHI (RA 10173 Compliance)

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: The Philippine Data Privacy Act of 2012 (RA 10173) and National Privacy Commission (NPC) regulations mandate rigorous safeguards for Sensitive Personal Information (SPI). A standard disk-level encryption does not prevent unauthorized database administrators or compromised services from accessing patient health data.
- **Decision**: Implement application-layer **field-level encryption (AES-256-GCM)** for all patient identifying fields (first name, last name, date of birth, PhilHealth PIN, mobile number) and sensitive diagnostic text (ICD-10 clinical descriptions). Encryption keys are managed via a dedicated Hardware Security Module (HSM) / Cloud KMS with automatic annual rotation.
- **Consequences**: Guaranteed compliance with NPC audits; database compromise does not expose plaintext patient health records.

---

## 3. TDR-003: Microservices Separation for Regulatory Policy Engines

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: PhilHealth frequently issues circulars updating case rate amounts, modifying CF4 requirements, or shifting toward Diagnosis-Related Groups (DRG), while commercial HMOs alter their exclusion rulebooks quarterly. Hardcoding these rules into the core ledger service would create high deployment risk and regression bugs.
- **Decision**: Isolate statutory and commercial deduction logic into modular, independently deployable rule microservices:
  - `PhilHealth-Rules-Engine`: Evaluates ACR, DRG weights, and CF4 validations.
  - `HMO-Matrix-Engine`: Evaluates payer-specific exclusion lists, MBL caps, and room multipliers.
  - Rules are stored in versioned JSON rule tables that can be updated via administrative consoles without restarting core application servers.
- **Consequences**: Rapid adaptability to PhilHealth circulars; zero downtime when insurance policies change.

---

## 4. TDR-004: Non-Invasive HIS Integration via Read-Replicas and CDC

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: Hospital Information Systems (BizBox, Comlogik) run on enterprise relational databases (MS SQL Server, Sybase). Directly executing heavy analytical queries or installing intrusive software triggers on production clinical databases risks degrading hospital IT performance and violating vendor warranties.
- **Decision**: MedCore integrates strictly via a dedicated **Database Read-Replica** deployed within the hospital local area network, utilizing **Change Data Capture (CDC)** or transaction log tailing. Data is streamed outward to MedCore Cloud over an encrypted, outbound-only mTLS tunnel.
- **Consequences**: Absolute zero impact on hospital clinical transaction performance; effortless sign-off from hospital IT directors.

---

## 5. TDR-005: Asynchronous Event Bus (Kafka / Redis Streams) for Sub-Second Recalculation

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: In a 300-bed hospital, hundreds of pharmacy dispenses, laboratory postings, and bed charges occur hourly. Recalculating the entire multi-payer deduction waterfall synchronously upon every database write would saturate CPU resources and introduce UI lag.
- **Decision**: Deploy an asynchronous message broker (**Apache Kafka / Redis Streams**) to process chargemaster postings as event streams. Deductions are calculated asynchronously in worker pools, updating the unified ledger and pushing reactive WebSocket updates to the patient's smartphone in under 500 milliseconds.
- **Consequences**: Sub-second UI updates; high scalability during peak morning discharge hours.

---

## 6. TDR-006: In-Situ Contextual Search & Docked Table Pagination (Elimination of Global Search Modal)

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: A global search modal (⌘K) detached user query context from the operational domain, led to cognitive overload, and required jumping across routes to view results. Simultaneously, continuous scroll tables across 250 records led to page stutter and scrollbar traps.
- **Decision**: Decommission the global search modal entirely. Embed **in-situ contextual search bars** directly inside each operational view (Payer Coverage, Exceptions, Disputes, Claims eSOA, Encounters Ledger). Implement **fixed-size docked pagination** (`Previous / Next` navigation controls pinned in table footers, e.g. 11 rows in Pipelines/Disputes, 8 rows in Claims, 12 rows in Coverage Approvals). Search filters operate dynamically against the full underlying dataset and automatically reset page index to 1.
- **Consequences**: Fast, zero-friction discovery without route changes; deterministic page rendering with zero DOM bloat.

---

## 7. TDR-007: Enterprise Universal Left-Alignment & Viewport Height Bounding Standard

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: Standard web tables often alternate between right-aligning numbers and left-aligning text, causing jagged scanlines in dense medical-financial interfaces. Unbounded table containers also cause outer page scroll chaining and double scrollbars.
- **Decision**:
  1. Enforce **strict universal left-alignment (`text-left`)** across every table header (`<th>`) and table cell (`<td>`), including currency amounts, dates, quantities, ICD-10/RVS codes, and action containers (`justify-start`).
  2. Enforce strict **100vh viewport height bounding** (`h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] overflow-hidden`) on all primary view containers.
  3. Enforce **CSS overscroll containment (`overscroll-contain`)** on scrollable table and list containers to prevent scroll propagation to the main dashboard.
- **Consequences**: High-density readability for hospital billing operators; complete elimination of double scrollbars and layout jumping.

---

## 8. TDR-008: Atomic Multi-Layer Waterfall Mutation, Supervisory Dispute Waiver Reconciliation, and Patient Selection Sync

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: Financial state changes (recording payment, supervisory waiver of contested items) were previously desynchronized: settlement advanced stage without zeroing balance, and supervisory dispute waivers did not decrement sidebar/kanban attention badges or update the natural-language breakdown drawer. Cross-patient operations risked mutating the wrong patient if active selection wasn't synchronized before opening action modals.
- **Decision**:
  1. **Atomic Settlement**: `settlePatientBalance()` explicitly zeroes `netPatientDue = 0`, credits `patientPaid`, advances `dischargeStage` to `CLEARED_GATE_PASS`, and syncs `selectedEncounterId`. Command Center "Trapped Revenue" KPI dynamically re-aggregates based on current waterfall state.
  2. **Active Patient Selection Sync**: Every modal trigger (`openDoctorQuickSign`, `openDigitalGatePass`, `openPromissoryModal`, `openDossierDrawer`) and blocker resolution handler must explicitly call `selectEncounter(encounterId)` prior to dispatching actions.
  3. **Dispute State Hierarchy**: Items marked `SUPERVISORY_WAIVED` / `WAIVED` and disputes marked `SUPERVISOR_WAIVED` / `HMO_RECONSIDERED` are strictly excluded from attention badges (`SidebarNav`, `DischargeMissionControl`) and receive explicit ₱0.00 net due in `WhyDoIOweThisDrawer`.
- **Consequences**: 100% financial and regulatory reconciliation across all 250 patient records; zero risk of cross-patient medical or billing order execution.
