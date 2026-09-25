# DOMAIN/hmo.md — Private Payers, HMO Policies & Adjudication Rules

> **Epistemic Status**: Commercial Insurance Industry Analysis & Policy Architecture  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/DOMAIN/`)  
> **Cross-References**: [ONTOLOGY.md](../ONTOLOGY.md), [patient_financial_responsibility.md](patient_financial_responsibility.md), [insurance_reconciliation.md](insurance_reconciliation.md), [RESEARCH/market.md](../RESEARCH/market.md)

---

## 1. The Philippine Private Payer Landscape

[FACT] Health Maintenance Organizations (HMOs) in the Philippines are regulated by the **Insurance Commission (IC)** pursuant to Executive Order No. 192 (Series of 2015).
- [FACT] **2024 Financial Rebound**: The Philippine HMO industry executed a decisive turnaround, posting **₱979.8 Million in net income** in 2024 (reversing a historic ₱4.27 Billion net loss in 2023). Total industry revenues grew to **₱79.37 Billion** (driven by an 18% surge in corporate membership fees to ₱75.64 Billion).
- [FACT] **Claims and Benefits Paid**: In 2024, the commercial HMO sector paid **₱61.05 Billion in healthcare claims and benefits** across approximately 7 million enrolled corporate and individual members (*Source: Insurance Commission HMO Industry Performance Report 2024*).
- [FACT] **Industry Consolidation**: The number of licensed, active HMO entities consolidated from **29 to 25** under strict solvency and capitalization mandates.
- [RESEARCHED] **VHI Growth**: Voluntary Health Insurance (HMOs and private health insurers) grew by 44.6% to represent **13.0% (₱161.35 Billion)** of national Current Health Expenditure (PSA 2023–2024 PNHA), outpacing PhilHealth’s share (10.2%).
- [RESEARCHED] **Strategic Impact on Discharges**: To protect the newly regained profitability, HMO claims examiners aggressively enforce consumable exclusions and room-and-board inner limits, which shifts unapproved costs into patient out-of-pocket liabilities and intensifies the need for real-time adjudication middleware like MedCore.

### Major Commercial Payers
1. **Maxicare Healthcare Corporation**: The largest private HMO in the Philippines by revenue and membership, operating extensive corporate plans, dedicated primary care clinics, and proprietary provider portals.
2. **Intellicare (Asalus Corporation) & Avega Managed Care**: Major corporate HMO administrator commanding a dominant share of multinational and business process outsourcing (BPO) corporate accounts.
3. **Medicard Philippines, Inc.**: Pioneer private HMO with an extensive accredited hospital and diagnostic clinic network across Luzon, Visayas, and Mindanao.
4. **PhilCare (PhilhealthCare, Inc.)**: Major provider of corporate and prepaid micro-health insurance packages.
5. **Pacific Cross Insurance, Inc.**: Specialized medical insurer focusing on comprehensive, high-limit hospitalization coverage.

---

## 2. Policy Benefit Limits & Inner Caps

### Maximum Benefit Limit (MBL)
[FACT] The Maximum Benefit Limit represents the monetary ceiling an HMO will pay for covered medical expenses:
- Typically ranges from **₱100,000 to ₱250,000 per illness/injury per year** for standard corporate employees, extending to ₱500,000–₱1,000,000 for executive-tier policies.
- Incurred charges are tracked against this ceiling. Once gross covered expenses reach the MBL, any further charges are 100% the patient's out-of-pocket obligation.

### Room-and-Board Inner Limits & Tariff Multipliers
[FACT] HMO policies establish rigid daily room allowances (e.g., Ward: ₱800/day; Semi-Private: ₱1,500/day; Regular Private: ₱2,500/day).
- **The Room Upgrade Differential**: If an HMO policy authorizes a Semi-Private room (₱1,500 allowance) but the patient requests or is admitted to a Private Suite (₱4,500/day), the patient is directly liable for the **₱3,000/day room excess**.
- **The Incremental Tariff Cascade**: Crucially, in many private Philippine hospitals, clinical fees (diagnostics, lab tests, and doctor visits) are pegged to the room category. Upgrading room tiers often triggers higher chargemaster markups and physician fee multipliers. While the HMO covers diagnostics at the authorized base tier, the incremental difference falls straight into the patient's personal balance.

---

## 3. Consumable Exclusions & Disallowed Supplies

[RESEARCHED] The primary driver of post-care cashier confrontation is the **HMO Consumable Exclusion List**. In standard corporate contracts, HMOs exclude routine hospital sundries, categorizing them as "non-medical administrative overhead" or "discretionary comfort items":

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TYPICAL HMO EXCLUSION CATEGORIES                     │
├──────────────────────────┬──────────────────────────────────────────────┤
│ Category                 │ Specific Excluded Chargemaster Items         │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Personal Care & Comfort  │ Thermal blankets, admission kits, soaps,     │
│                          │ hygiene packs, bedpans, tissue boxes.        │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Infection Control / PPE  │ Disposable gloves, surgical masks, isolation │
│                          │ gowns, shoe covers, face shields.            │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Routine Ward Sundries    │ Oxygen cannulas, suction tubing, IV caps,    │
│                          │ syringe sets, disposable pulse oximeters.    │
├──────────────────────────┼──────────────────────────────────────────────┤
│ Pharmacy & Biologics     │ Branded high-cost IV antibiotics where generic│
│                          │ alternatives exist; nutritional supplements. │
└──────────────────────────┴──────────────────────────────────────────────┘
```

When hospital billing departments present the preliminary bill to the HMO adjuster, the adjuster manually strikes out these items from the approved Letter of Authorization (LOA). These struck-out items are transferred directly to the patient's out-of-pocket ledger without prior itemized explanation.

---

## 4. The "PhilHealth-First" Coordination Rule

[FACT] Private HMOs in the Philippines operate under contractual guidelines establishing that **HMO benefits are strictly secondary to PhilHealth statutory benefits**.

### Contractual Mechanics
1. **Statutory Deduction Priority**: When an HMO member is hospitalized, the hospital must calculate and deduct the full PhilHealth Case Rate from the bill *before* the HMO coverage is applied against the remainder.
2. **The "Unfiled PhilHealth" Penalty**: If a patient fails to submit their PhilHealth Claim Form 1 (CF1) or Member Data Record (MDR), or if the hospital fails to verify PhilHealth eligibility, **the HMO automatically deducts the equivalent PhilHealth case rate amount from their approved LOA**.
3. **Impact on the Patient**: The deducted PhilHealth amount is billed directly to the patient as a personal cash liability, even if the patient is fully enrolled in the HMO.
4. **Impact on Billing Clerks**: Billing clerks are forced into a high-friction manual gatekeeping role, refusing to process HMO authorizations until PhilHealth eligibility is completely verified.

---

## 5. The Letter of Authorization (LOA) Adjudication Bottleneck

[RESEARCHED] The issuance of the final discharge Letter of Authorization (LOA) is a severe operational bottleneck in hospital discharge clearance, consuming **2 to 4 hours** per patient:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Hospital Clerk  │       │ Manual Review   │       │ Final LOA Issue │
│ Transcribes SOA ├──────►│ by HMO Adjuster ├──────►│ Re-Keyed into   │
│ & Emails/Faxes  │       │ (2 to 4 Hours)  │       │ Hospital HIS    │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. Hospital billing clerks assemble the preliminary paper statement.
2. The clerk faxes, emails, or uploads the statement to the HMO portal (or MediLink switch).
3. The HMO claims examiner in an off-site corporate office manually reviews each line item against policy limits and exclusions.
4. The approved LOA is generated, signed, and transmitted back to the hospital.
5. The hospital clerk manually re-keys the approved total into the hospital billing ledger.

[DECISION] MedCore automates this entire lifecycle by generating structured digital LOA payloads mapped to HMO contract rulebooks, enabling instant pre-adjudication and real-time electronic status updates.
