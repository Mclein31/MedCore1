# SYSTEM/workflows.md — Technical Sequence Diagrams & Execution Workflows

> **Epistemic Status**: Systems Engineering Workflows & Sequence Specifications  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/SYSTEM/`)  
> **Cross-References**: [architecture.md](architecture.md), [entities.md](entities.md), [PRODUCT/workflows.md](../PRODUCT/workflows.md)

---

## 1. Sequence 1: Pre-Admission Estimation & Room Category Validation

[DECISION] This sequence executes during patient registration and intake (Stage 1: GUIDE), providing upfront financial orientation and preventing room-tier differential surprises:

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient / Guarantor
    actor Admitting as Hospital Admitting Officer
    participant Flow as MedCore Flow & Verify
    participant Engine as Statutory Rules Engine
    participant HIS as Hospital HIS (BizBox)
    participant HMO as HMO Gateway / MediLink

    Admitting->>Flow: Initiate Pre-Admission Intake (MRN, PIN, HMO ID, Room Tier)
    Flow->>HIS: Query Historical Cost for Provisional Diagnosis & Admitting Doctor
    HIS-->>Flow: Return Historical Chargemaster Distribution (P50 / P80 Bounds)
    Flow->>HMO: Query Policy Inner Limits (Room Allowance, MBL Remaining)
    HMO-->>Flow: Room Allowance: ₱1,500/day | MBL: ₱150,000
    Flow->>Engine: Calculate Projected Cascade (Room Excess, Senior/PWD, PhilHealth ACR)
    Engine-->>Flow: Return Estimated Out-of-Pocket Range (Base vs. Upgraded Tier)
    Flow-->>Admitting: Display Room Tariff & Cost Advisory Screen
    Flow->>Patient: Dispatch SMS/WhatsApp Link to Digital Financial Summary
    Patient->>Flow: Acknowledge Room Tier & Financial Trajectory
    Flow->>HIS: Post Verified Financial Consent Flag
```

---

## 2. Sequence 2: Live Order Reconciliation & Running Balance Updates

[DECISION] This asynchronous event-driven workflow executes continuously whenever a departmental charge or medication order is posted during hospitalization (Stage 3: RECONCILE):

```mermaid
sequenceDiagram
    autonumber
    participant Pharmacy as Pharmacy / LIS / CSR
    participant Edge as MedCore Edge CDC Listener
    participant Queue as Event Message Bus (Kafka/Redis)
    participant Reconcile as MedCore Reconcile & Ledger
    participant PayerDB as Payer Exclusion Rules Matrix
    participant Portal as MedCore Patient Clarify (PWA)

    Pharmacy->>Edge: Post Chargemaster Order (Medication / Consumable / Diagnostic)
    Edge->>Queue: Publish `chargemaster.item.posted` Event
    Queue->>Reconcile: Consume Order Event
    Reconcile->>PayerDB: Evaluate Item against Payer Exclusion Rulebook
    alt Item is Covered
        PayerDB-->>Reconcile: Policy Status: COVERED (Charge credited against HMO MBL)
    else Item is Disallowed Sundry
        PayerDB-->>Reconcile: Policy Status: EXCLUDED (Flag reason: HMO_WARD_SUNDRY)
    end
    Reconcile->>Reconcile: Execute Statutory Deduction Waterfall Cascade
    Reconcile->>Reconcile: Update Inpatient Running Balance & LedgerEntry
    Reconcile->>Portal: Push Real-Time WebSocket Ledger Update
    Portal-->>Portal: Render Plain-Language Breakdown to Patient Smartphone
```

---

## 3. Sequence 3: Discharge Clearance Coordination Workflow

[DECISION] This is the core operational sequence that collapses the discharge clearance process from **4 to 8+ hours down to under 45 minutes** (targeting **<30 minutes**):

```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Attending Specialist
    participant HIS as Hospital HIS / EMR
    participant Hub as Discharge Orchestration Hub
    participant DocPortal as Doctor PF Mobile Portal
    participant Pharm as Inpatient Pharmacy
    participant HMO as HMO Gateway / Adjuster
    participant Scrubber as ClaimReady Pre-Flight Auditor
    actor Patient as Patient / Guarantor
    actor Cashier as Hospital Cashier / Gate Security

    Doctor->>HIS: Enter Clinical "May Go Home" (MGH) Order
    HIS->>Hub: Webhook Event: `patient.mgh_declared` (Timestamp T0)
    par Parallel Sub-Process A: Doctor Professional Fee Confirmation
        Hub->>DocPortal: Push Urgent Notification to Doctor Smartphone
        Doctor->>DocPortal: Confirm Billed PF (Accept Schedule Rate or Set Excess)
        DocPortal->>Hub: Doctor PF Signed & Confirmed Electronically
    and Parallel Sub-Process B: Pharmacy & Supply Closeout
        Hub->>Pharm: Signal RTS Closeout for Ward Bed
        Pharm->>Hub: Confirm No Pending Unused Medication Returns
    end
    Hub->>HMO: Transmit Pre-Cleansed Electronic Discharge LOA Payload
    HMO-->>Hub: Return Final Approved LOA Reference Code
    Hub->>Scrubber: Assemble eSOA XML + CF2 + CF4 Data Bundle
    Scrubber->>Scrubber: Pre-Flight Compliance Audit (ICD-10 vs. CF4 cross-check)
    Scrubber-->>Hub: Claim Audit Score: 0.99 (CLEAN CLAIM APPROVED)
    Hub->>Patient: Dispatch Final MedCore Smart Statement via SMS/PWA
    Patient->>Hub: Select Payment Option (1-Click QR Ph / GCash / Maya)
    Hub->>Hub: Validate Payment Settlement via Merchant Webhook
    Hub->>Patient: Issue Signed Cryptographic Digital Discharge Pass (QR Code)
    Patient->>Cashier: Present QR Code Discharge Pass at Exit / Gate Security
    Cashier->>Hub: Scan QR Pass (Status: CLEARED TO DEPART)
    Hub->>HIS: Write Final Settled Ledger & Close Bed Encounters (Elapsed: < 30 Mins)
```
