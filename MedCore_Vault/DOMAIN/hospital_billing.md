# DOMAIN/hospital_billing.md — Hospital Chargemasters & Departmental Billing Silos

> **Epistemic Status**: Hospital Operations & Financial Systems Analysis  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/DOMAIN/`)  
> **Cross-References**: [ONTOLOGY.md](../ONTOLOGY.md), [insurance_reconciliation.md](insurance_reconciliation.md), [SYSTEM/integrations.md](../SYSTEM/integrations.md)

---

## 1. The Structure of Philippine Hospital Chargemasters

[FACT] A private hospital chargemaster (Hospital Price Index) is an internal dictionary containing thousands of billable line items, services, diagnostic procedures, consumable supplies, and room tiers. In Philippine tertiary private medical centers (e.g., St. Luke's Medical Center, The Medical City, Asian Hospital, Makati Medical Center), chargemaster pricing is structured across multiple clinical and operational categories:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HOSPITAL CHARGEMASTER CATEGORIES                     │
├──────────────────────────┬──────────────────────────────────────────────┤
│ Category                 │ Operational Characteristics                  │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Daily Accommodation      │ Ward, Semi-Private, Regular Private, Suite,  │
│                          │ Intensive Care Unit (ICU), Telemetry, NICU.  │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Inpatient Pharmacy       │ IV fluids, oral medications, specialized     │
│                          │ biologics, chemotherapy, antibiotics.        │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Central Supply (CSR)     │ Catheters, surgical packs, PPE kits, tubing, │
│                          │ dressing sets, syringes, bandages, cannulas. │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Laboratory & Pathology   │ Hematology, clinical microscopy, blood bank, │
│                          │ immunology, cultures, surgical biopsies.     │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Medical Imaging          │ X-ray, CT scans, MRI, Ultrasound, 2D Echo.   │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Operating Room / Anesth  │ Operating room time tariffs, surgical trays, │
│                          │ anesthesia supplies, post-anesthesia care.   │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Professional Fees (PF)   │ Admitting physician, co-managing specialists,│
│                          │ surgeons, anesthesiologists, on-call doctors.│
└──────────────────────────┴──────────────────────────────────────────────┘
```

---

## 2. Departmental Billing Silos & Reconciliation Latency

[RESEARCHED] In typical Philippine private hospitals running legacy Hospital Information Systems (BizBox, Comlogik, Medsys), billing does not happen in a centralized, synchronized pipeline. Instead, charges are generated within distinct departmental silos and remain unfinalized until after clinical discharge:

### Inpatient Pharmacy & Return-to-Stock Bottlenecks
- When medications are ordered for a patient, charges are posted to the hospital ledger upon dispensing from the central inpatient pharmacy.
- However, when a patient is clinically discharged, unopened IV vials, unused oral tablets, and refrigerated ampoules must be physically gathered by floor nurses and sent back to the pharmacy for credit ("Return-to-Stock" or RTS).
- Reconciling returned medications routinely takes **1 to 2 hours** post-discharge, during which the billing department cannot finalize the Statement of Account.

### Central Supply Room (CSR) Kit Breakdowns
- Operating rooms and intensive care units frequently pull pre-packaged supply kits (e.g., "Major Surgery Kit" or "CVC Insertion Pack").
- Unused components must be manually audited by ward nurses, who fill out paper credit slips to subtract unused items from the gross ledger.

### Diagnostic & Laboratory Posting Delays
- Emergency and bedside diagnostic charges (e.g., portable X-rays, stat blood gases) are sometimes entered hours after execution due to clerical batching at the end of nursing shifts.

---

## 3. The Independent Doctor Professional Fee (PF) Relay

[RESEARCHED] In the Philippine private hospital model, the vast majority of attending physicians, surgeons, and specialists are not hospital employees; they are independent practitioners who utilize hospital facilities under hospital privileges. This governance creates a major billing bottleneck:

```
                   THE MANUAL DOCTOR PF RETRIEVAL CHASE

   ┌────────────────────┐       ┌────────────────────┐       ┌────────────────────┐
   │ Attending Doctor   │       │ Ward Nurse / Runner│       │ Billing Clerk      │
   │ Writes "May Go     ├──────►│ Chases Doctor for  ├──────►│ Encodes Billed PF  │
   │ Home" (MGH) Order  │       │ Physical PF Slip   │       │ into HIS Ledger    │
   └────────────────────┘       └────────────────────┘       └────────────────────┘
                                        ▲
                                        │ (Consumes 1 to 3 Hours)
```

1. **Physical Paper Slips**: Attending doctors physically write their professional fee on a tri-copy paper slip, noting whether the patient is cash, Senior/PWD, or HMO-covered.
2. **The "Runner" Relay**: When a patient is cleared to go home, ward nurses or hospital messengers ("runners") must locate the attending doctor, resident, or clinic secretary to obtain the signed slip. In cases where multiple specialists co-manage a patient (e.g., Cardiologist, Pulmonologist, Nephrologist, Surgeon), obtaining 3 or 4 separate physical slips consumes **1 to 3 hours**.
3. **Absence of Rate Agreements**: Doctors frequently bill their standard private clinic rates without checking the patient’s HMO fee schedule, creating surprise "Excess PF" variances that explode at the cashier desk.

---

## 4. The "May Go Home" (MGH) Crisis

[FACT] The clinical order "May Go Home" (MGH) represents the exact inflection point where medical care ends and administrative friction begins:
- The patient and their family believe that because the doctor declared them medically cured or stable, they are free to leave immediately.
- In reality, MGH initiates a **4 to 8+ hour administrative queue**:
  $$\text{MGH Written} \longrightarrow \text{Nurse Chart Processing} \longrightarrow \text{Pharmacy RTS} \longrightarrow \text{Doctor PF Retrieval} \longrightarrow \text{PhilHealth Encoding} \longrightarrow \text{HMO LOA Queue} \longrightarrow \text{Cashier}$$
- The patient remains confined to their hospital bed throughout this ordeal, unable to surrender the room. Incoming patients waiting in the Emergency Department or surgical recovery units cannot be admitted because beds remain blocked by medically discharged patients awaiting billing clearance.

[DECISION] MedCore transforms this serial, paper-bound relay into an asynchronous, real-time digital pipeline where charges are continuously reconciled throughout the stay, allowing discharge clearance to execute in **under 45 minutes** (targeting **<30 minutes**).
