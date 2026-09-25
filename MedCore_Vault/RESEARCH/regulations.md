# RESEARCH/regulations.md — Philippine Healthcare Statutory & Regulatory Compendium

> **Epistemic Status**: Codified Legal & Regulatory Standards Registry  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/RESEARCH/`)  
> **Cross-References**: [ONTOLOGY.md](../ONTOLOGY.md), [DOMAIN/philhealth.md](../DOMAIN/philhealth.md), [DOMAIN/patient_financial_responsibility.md](../DOMAIN/patient_financial_responsibility.md), [REQUIREMENTS/non_functional.md](../REQUIREMENTS/non_functional.md)

---

## 1. Overview of Statutory Governance

[FACT] The operation of hospital billing, multi-payer reconciliation, and patient financial engagement in the Philippines is governed by a strict matrix of national laws, presidential decrees, executive orders, revenue regulations, and administrative circulars. Software operating in this space must maintain absolute compliance with these statutes.

---

## 2. Enacted National Statutes

### 1. Republic Act No. 9994 (Expanded Senior Citizens Act of 2010)
- [FACT] **Statutory Privileges**: Grants Filipino citizens aged 60 years and older:
  - **12% Value-Added Tax (VAT) Exemption** on the sale of goods and services.
  - **20% Statutory Discount** on medical services, diagnostic and laboratory fees, professional fees of attending physicians, and purchases of prescription medicines.
- **Sequential Calculation Mandate**: In accordance with BIR Revenue Regulations No. 7-2010, the 12% VAT must be removed first from the VAT-inclusive price, and the 20% discount is applied against the VAT-free net base.
- **MedCore Implementation**: Embedded as Stage 1 & 2 in the statutory deduction engine.

### 2. Republic Act No. 10754 (Expanding Benefits of Persons with Disability)
- [FACT] **Statutory Privileges**: Grants qualified Persons with Disability (PWD) holding valid DSWD/LGU identification cards the identical benefits accorded to senior citizens:
  - **12% VAT Exemption** + **20% Statutory Discount** on medical goods, physician fees, and hospitalization expenses.
- **Non-Cumulation Rule**: Under Section 32, a patient who is both a Senior Citizen and a PWD cannot claim dual discounts; the hospital must apply whichever single privilege the patient elects.

### 3. Republic Act No. 11223 (Universal Health Care Act of 2019)
- [FACT] **Statutory Scope**: Guarantees equitable access to quality healthcare for all Filipino citizens and mandates:
  - Automatic enrollment of all citizens in the National Health Insurance Program (PhilHealth).
  - Transition toward integrated health systems and standardized electronic health information pipelines.
  - Expansion of the **No Balance Billing (NBB)** policy for basic/ward accommodations.
  - Mandated progression toward prospective case-mix payment models (Diagnosis-Related Groups [DRG]).

### 4. Republic Act No. 9439 (Anti-Hospital Detention Law of 2007)
- [FACT] **Prohibition**: Expressly makes it unlawful for any hospital or medical clinic to detain, hold, or prevent the physical departure of a patient who has recovered or died due to nonpayment of hospital bills or medical expenses.
- **Promissory Note Right**: Medically cleared patients admitted to basic or ward rooms are statutorily entitled to depart upon executing a valid promissory note secured by a co-maker, mortgage, or guarantee.
- **Criminal Penalties**: Violations carry fines of up to ₱100,000 and imprisonment of up to 6 months for responsible hospital officers.
- **MedCore Implementation**: Powers the automated **Digital Promissory Note Engine**, generating legally binding, traceable digital installment agreements.

### 5. Republic Act No. 10932 (Anti-Hospital Deposit Law of 2017)
- [FACT] **Prohibition**: Severely penalizes demanding, soliciting, or requiring deposits or advance payments as a condition for emergency treatment or obstetric care.
- **Penalties**: Fines up to ₱1,000,000 and imprisonment of up to 4 to 6 years for hospital directors and staff.
- **MedCore Guardrail**: Stage 1 (GUIDE) pre-admission summaries are strictly classified as non-binding financial estimates, ensuring they are never construed as advance deposit demands.

### 6. Republic Act No. 11765 (Financial Products and Services Consumer Protection Act of 2022)
- [FACT] **Statutory Scope**: Regulates financial service providers, including HMOs and insurance companies under Insurance Commission oversight.
- **Consumer Rights**: Enforces fair treatment, transparent pricing disclosures, and mandatory internal dispute resolution mechanisms.
- **MedCore Value**: MedCore's itemized, plain-language statements protect HMOs and hospitals from regulatory fines and consumer protection enforcement.

### 7. Republic Act No. 10173 (Data Privacy Act of 2012)
- [FACT] **Statutory Scope**: Enforced by the National Privacy Commission (NPC), governing the processing of Sensitive Personal Information (SPI), including medical and health data.
- **Key Mandates**:
  - Express patient consent for multi-payer data sharing.
  - Strict role-based access control (RBAC) separating clinical medical records from financial billing ledgers.
  - Mandatory end-to-end data encryption (AES-256 for data at rest; TLS 1.3 for data in transit).
  - Mandatory data breach notification within 72 hours.

---

## 3. Executive Orders & Administrative Circulars

### 1. Executive Order No. 192 (Series of 2015)
- [FACT] Transferred regulatory jurisdiction and supervision of Health Maintenance Organizations (HMOs) from the Department of Health (DOH) to the **Insurance Commission (IC)**.
- Established solvency requirements, standardized HMO reporting, and authorized the IC to arbitrate consumer complaints.

### 2. PhilHealth Circular No. 2019-0002
- [FACT] Mandated the electronic submission of **Claim Form 4 (CF4)**—the standardized clinical summary containing vital signs, physical exam notes, daily course in the ward, and medication administration records—for all All Case Rates claims.

### 3. PhilHealth Circular No. 2023-0026 & eClaims 3.0
- [FACT] Mandated the electronic submission of the **Statement of Account (eSOA) in XML schema format**. Permanently discontinued scanned PDF/image SOAs. Enforced strict mathematical validation against Claim Form 2.

### 4. PhilHealth Single Period of Confinement (SPC) Suspension
- [FACT] PhilHealth suspended the contentious Single Period of Confinement rule effective **October 1, 2024**, allowing claims for repeated confinements within a 90-day window.
- [DECISION] Maintained within MedCore as a toggleable policy flag.
