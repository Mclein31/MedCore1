# REQUIREMENTS/non_functional.md — Non-Functional Requirements & Security Standards

> **Epistemic Status**: Non-Functional System Standards & Regulatory Guardrails  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/REQUIREMENTS/`)  
> **Cross-References**: [SYSTEM/architecture.md](../SYSTEM/architecture.md), [RESEARCH/regulations.md](../RESEARCH/regulations.md), [functional.md](functional.md)

---

## 1. Security & Data Privacy (RA 10173 / NPC Compliance)

[FACT] MedCore processes Sensitive Personal Information (SPI) and Protected Health Information (PHI) governed by the **Philippine Data Privacy Act of 2012 (RA 10173)** and circulars of the National Privacy Commission (NPC):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATA PRIVACY & COMPLIANCE GUARDRAILS                 │
├──────────────────────────┬──────────────────────────────────────────────┤
│ Mandate Area             │ Technical Requirement & Implementation       │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Encryption at Rest       │ AES-256-GCM field-level encryption for all   │
│                          │ patient identifiers, PhilHealth PINs, and    │
│                          │ diagnostic ICD-10 text in PostgreSQL.        │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Encryption in Transit    │ TLS 1.3 enforced across all public endpoints;|
│                          │ Mutual TLS (mTLS) for hospital edge agents.  │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Access Control (RBAC)    │ Strict role-based access control. Medical    │
│                          │ records (CF4 clinical notes) are strictly    │
│                          │ decoupled from financial cashier ledgers.    │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Data Breach Protocol     │ Automated breach detection telemetry with    │
│                          │ mandatory 72-hour reporting to the NPC.      │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Patient Consent          │ Express digital consent recorded at intake   │
│                          │ prior to multi-payer data transmission.      │
└──────────────────────────┴──────────────────────────────────────────────┘
```

---

## 2. Performance, Concurrency & Latency SLAs

[DECISION] Because hospital discharge clearance operates in high-pressure clinical windows, MedCore enforces strict performance benchmarks:

| Performance Dimension | SLA / Benchmark | Engineering Constraint |
| :--- | :--- | :--- |
| **Ledger Recalculation Latency** | **< 500 milliseconds** | Triggered asynchronously upon every order posting via Redis Streams. |
| **PWA Mobile Page Load Time** | **< 1.8 seconds (p95)** | Server-side rendered (SSR), optimized bundle size (<150KB), CDN caching. |
| **API Response Time** | **< 200 milliseconds (p95)** | Core REST endpoints under normal and peak hospital loads. |
| **eSOA XML Bundle Generation** | **< 3.0 seconds** | Pre-compiled XML schema streaming for high-volume claim exports. |
| **Concurrent Discharges** | **100+ concurrent active clearances** | Per hospital cluster without queue degradation or database lockups. |
| **Edge CDC Event Delivery** | **< 5.0 seconds** | From HIS transaction log commit to MedCore cloud ingestion. |

---

## 3. High Availability, Reliability & Disaster Recovery

- [DECISION] **Availability SLA**: The core cloud platform shall maintain **99.9% uptime (three nines)**, excluding scheduled off-peak maintenance windows (1:00 AM – 3:00 AM PHT).
- **Multi-Zone Redundancy**: Core microservices deployed across multiple cloud availability zones (e.g., AWS / Google Cloud Singapore or Jakarta regions with direct low-latency peering into Philippine telecommunication networks).
- **Database Failover & Recovery**:
  - PostgreSQL automated primary-replica failover in **< 30 seconds**.
  - **Recovery Point Objective (RPO)**: $\le 1 \text{ minute}$ of transaction data.
  - **Recovery Time Objective (RTO)**: $\le 15 \text{ minutes}$ for catastrophic region failover.
- **Offline Hospital Edge Resilience**: In the event of a hospital internet outage, the local MedCore agent queues CDC charge events locally on encrypted disk storage and replays them safely upon network restoration without data loss.

---

## 4. Auditability, Integrity & Tamper Resistance

- [FACT] **Immutable Financial Audit Log**: Every modification to a patient ledger entry, discount application, doctor PF adjustment, or insurance deduction must generate an immutable, write-once audit log record containing:
  - Unique transaction UUID
  - Timestamp in Philippine Standard Time (PST / UTC+8)
  - Actor User ID / System Agent ID
  - Pre-modification state vs. Post-modification state
  - Cryptographic HMAC-SHA256 hash of the transaction payload
- **Anti-Fraud Guardrails**: Any manual ledger override by a hospital billing clerk exceeding ₱1,000 must require dual supervisor electronic sign-off.
