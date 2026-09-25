# DOMAIN/patient_financial_responsibility.md — Statutory Deduction Cascade & Patient Liability

> **Epistemic Status**: Formally Codified Statutory Algorithm & Mathematical Standard  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/DOMAIN/`)  
> **Cross-References**: [ONTOLOGY.md](../ONTOLOGY.md), [philhealth.md](philhealth.md), [hmo.md](hmo.md), [SYSTEM/architecture.md](../SYSTEM/architecture.md)

---

## 1. Statutory Mandate & Governing Legal Framework

[FACT] In the Philippines, calculating patient financial liability for hospitalization is strictly governed by national statutes, Bureau of Internal Revenue (BIR) Revenue Regulations, and Department of Health (DOH) Administrative Orders. Healthcare institutions are legally prohibited from altering the sequential order of statutory deductions.

The governing statutory authorities are:
- **Republic Act No. 9994** (Expanded Senior Citizens Act of 2010)
- **Republic Act No. 10754** (An Act Expanding the Benefits and Privileges of Persons with Disability [PWD])
- **Republic Act No. 11223** (Universal Health Care Act of 2019)
- **BIR Revenue Regulations No. 7-2010 & No. 5-2017** (Tax Treatment of Senior Citizen & PWD Sales)
- **PhilHealth Circulars on All Case Rates (ACR) & No Balance Billing (NBB)**

---

## 2. The Canonical Statutory Deduction Waterfall

[FACT] MedCore executes the mathematical deduction sequence strictly according to the following codified algorithm:

$$\text{Net Out-of-Pocket Due} = \left(\left(\text{Gross Charges} - \text{12\% VAT Exemption} - \text{20\% SC/PWD Discount}\right) - \text{PhilHealth ACR/DRG}\right) - \text{HMO Approved LOA}$$

```
                               STATUTORY DEDUCTION CASCADE

     ┌────────────────────────────────────────────────────────────────────────┐
     │                       1. GROSS HOSPITAL CHARGES                        │
     │     (Room & Board + Diagnostics + Pharmacy + Supplies + Doctor PFs)    │
     └───────────────────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │                 2. STATUTORY 12% VAT EXEMPTION (RA 9994/10754)         │
     │         (Deducted from VAT-inclusive taxable goods & services)         │
     └───────────────────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │                 3. STATUTORY 20% DISCOUNT (RA 9994/10754)              │
     │              (Applied directly against the VAT-exempt base)            │
     └───────────────────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │                 4. PHILHEALTH ALL CASE RATE (ACR / DRG)                │
     │      (Deducted from balance; bifurcated between Hospital & PF;         │
     │       enforces 100% 1st Case Rate and 50% 2nd Case Rate splits)        │
     └───────────────────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │                 5. COMMERCIAL HMO / PRIVATE INSURANCE (LOA)            │
     │      (Applied against remaining balance up to Maximum Benefit Limit;   │
     │       enforces inner limits and subtracts non-covered sundries)        │
     └───────────────────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │                 6. NET PATIENT OUT-OF-POCKET BALANCE (OOP)             │
     │      (Residual liability settled via QR Ph, GCash, Maya, cards, or     │
     │       structured digital promissory notes under RA 9439)               │
     └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Mathematical Derivation

### Step 1: Gross Charges Aggregation ($G$)
$$G = \text{Hospital Facility Charges } (G_{\text{HCI}}) + \text{Doctor Professional Fees } (G_{\text{PF}})$$

### Step 2: VAT Exemption (RA 9994 / RA 10754)
[FACT] If the patient is a verified Senior Citizen or PWD, qualifying goods and services billed with 12% Value-Added Tax must first be stripped of the VAT component:
$$\text{Base}_{\text{VAT-Exempt}} = \frac{G_{\text{Taxable}}}{1.12}$$
*(Note: Most hospital room and medical services in licensed non-profit hospitals are inherently VAT-exempt under Section 109 of the NIRC, but commercial pharmacy, retail supplies, and independent doctor professional fees are VAT-registered and require explicit formulaic VAT removal).*

### Step 3: Statutory 20% Discount
[FACT] The 20% statutory discount is applied directly against the VAT-exempt base:
$$\text{Discount}_{\text{SC/PWD}} = \text{Base}_{\text{VAT-Exempt}} \times 0.20$$
$$\text{Net}_{\text{Statutory}} = \text{Base}_{\text{VAT-Exempt}} - \text{Discount}_{\text{SC/PWD}} = \text{Base}_{\text{VAT-Exempt}} \times 0.80$$

### Step 4: PhilHealth All Case Rate (ACR) Deduction
[FACT] PhilHealth All Case Rates are statutory social benefits and must be deducted **after** statutory senior/PWD discounts are applied:
- The PhilHealth benefit is partitioned into Hospital Charges ($B_{\text{PH-HCI}}$) and Professional Fees ($B_{\text{PH-PF}}$).
- For multi-morbidities:
  $$\text{Benefit}_{\text{Total}} = \text{Benefit}_{\text{1st Case Rate}} + \left(0.50 \times \text{Benefit}_{\text{2nd Case Rate}}\right)$$
$$\text{Balance}_{\text{Post-PhilHealth}} = \max\left(0, \text{Net}_{\text{Statutory}} - \text{Benefit}_{\text{PhilHealth}}\right)$$

### Step 5: Commercial HMO Adjudication
[FACT] Under standard HMO provider agreements and the "PhilHealth-First" doctrine, the HMO covers the remaining balance up to the member's Maximum Benefit Limit (MBL), minus inner limit differentials and non-covered consumable sundries:
$$\text{HMO Covered Amount} = \min\left(\text{MBL}_{\text{Remaining}}, \text{Balance}_{\text{Post-PhilHealth}} - \text{Exclusions} - \text{Room Differentials}\right)$$

### Step 6: Net Patient Out-of-Pocket Liability ($OOP$)
$$OOP = \text{Balance}_{\text{Post-PhilHealth}} - \text{HMO Covered Amount} + \text{Exclusions} + \text{Room Differentials} + \text{Excess PF}$$

---

## 4. Concrete Worked Inpatient Example

To illustrate the mathematical cascade in operation, consider a representative 4-day inpatient confinement:
- **Patient**: Senior Citizen (RA 9994 verified), admitted to a private tertiary hospital.
- **Diagnosis**: Moderate Pneumonia (ICD-10: J18.9; PhilHealth Case Rate: ₱15,000 $\rightarrow$ ₱10,500 HCI / ₱4,500 PF).
- **HMO Policy**: Corporate HMO with ₱150,000 MBL; room allowance ₱1,500/day.
- **Confinement Details**: Patient admitted to Regular Private room at ₱3,000/day (₱1,500/day room differential).
- **Gross Charges**:
  - Hospital Charges (Facility, Pharmacy, Lab, CSR): ₱85,000 (VAT-inclusive where applicable: ₱15,000 taxable pharmacy/sundries).
  - Doctor Professional Fee: ₱35,000 (VAT-registered consultant).
  - Non-Covered HMO Consumables (PPE kits, suction catheter, thermal blanket): ₱4,200.
  - HMO Doctor Fee Schedule Ceiling: ₱25,000 (Specialist billed ₱35,000 $\rightarrow$ ₱10,000 Excess PF).

### Waterfall Calculation Execution

```
┌─────────────────────────────────────────────────────────────┬──────────────┐
│ Calculation Step                                            │ Amount (₱)   │
├─────────────────────────────────────────────────────────────┼──────────────┤
│ Gross Billed Charges (Hospital ₱85,000 + Doctor ₱35,000)    │ ₱120,000.00  │
│ 12% VAT Exemption (on taxable pharmacy & consultant PF)     │ - ₱5,357.14  │
│ 20% Senior Citizen Statutory Discount (RA 9994)             │ - ₱21,857.14 │
│ ─────────────────────────────────────────────────────────── │ ──────────── │
│ Net Statutory Base                                          │ ₱92,785.72   │
│ PhilHealth Case Rate Deduction (Moderate Pneumonia)         │ - ₱15,000.00 │
│ ─────────────────────────────────────────────────────────── │ ──────────── │
│ Balance Subject to HMO Coverage                             │ ₱77,785.72   │
│ Less: HMO Non-Covered Consumables                           │ - ₱4,200.00  │
│ Less: Room Rate Differential (₱1,500/day × 4 days)          │ - ₱6,000.00  │
│ Less: Doctor Excess Professional Fee                        │ - ₱10,000.00 │
│ ─────────────────────────────────────────────────────────── │ ──────────── │
│ Approved HMO Letter of Authorization (LOA) Coverage         │ ₱57,585.72   │
│ ═══════════════════════════════════════════════════════════ │ ════════════ │
│ NET PATIENT OUT-OF-POCKET RESPONSIBILITY                    │              │
│ • Room Differential (4 days @ ₱1,500/day)                   │ ₱6,000.00    │
│ • Non-Covered Consumable Sundries                           │ ₱4,200.00    │
│ • Excess Doctor Professional Fee                            │ ₱10,000.00   │
│ ─────────────────────────────────────────────────────────── │ ──────────── │
│ TOTAL DUE AT CASHIER / DIGITAL CHECKOUT                     │ ₱20,200.00   │
└─────────────────────────────────────────────────────────────┴──────────────┘
```

[DECISION] In MedCore Patient Clarify, this breakdown is rendered with itemized transparency so the patient sees exactly why they owe ₱20,200 (₱6k room tier upgrade + ₱4.2k excluded consumables + ₱10k doctor fee excess) instead of receiving a cryptic lump-sum bill shock.
