# SYSTEM/entities.md — Domain Entities & Semantic Data Models

> **Epistemic Status**: Formal Domain Entity Specification & Bounded Contexts  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/SYSTEM/`)  
> **Cross-References**: [architecture.md](architecture.md), [data_model.md](data_model.md), [ONTOLOGY.md](../ONTOLOGY.md)

---

## 1. Domain Entity Relationship Diagram

[DECISION] The core MedCore domain model is organized into eight primary entities spanning clinical encounters, statutory deductions, insurance authorizations, and the unified tripartite ledger:

```
┌─────────────────┐       ┌─────────────────┐       ┌───────────────────┐
│     Patient     │──────►│    Encounter    │──────►│    LedgerEntry    │
└─────────────────┘       └────────┬────────┘       └─────────┬─────────┘
                                   │                          │
        ┌──────────────────────────┼───────────────┐          │
        ▼                          ▼               ▼          ▼
┌───────────────┐         ┌────────────────┐ ┌──────────┐ ┌─────────────┐
│StatutoryDiscnt│         │ PhilHealthClaim│ │ HmoAuth  │ │Chargemaster │
└───────────────┘         └────────────────┘ └──────────┘ │    Item     │
                                   │                      └─────────────┘
                                   ▼
                          ┌────────────────┐
                          │ DischargePass  │
                          └────────────────┘
```

---

## 2. Formal Entity Definitions & Attributes

### 1. Patient (`Patient`)
- **Definition**: The individual receiving clinical medical care at the hospital facility.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `mrn`: String (Medical Record Number assigned by hospital HIS)
  - `first_name`: Encrypted String (AES-256)
  - `last_name`: Encrypted String (AES-256)
  - `date_of_birth`: Date
  - `gender`: Enum (`MALE`, `FEMALE`)
  - `mobile_number`: String (E.164 format for SMS magic links)
  - `email`: String (Optional)
  - `philhealth_pin`: Encrypted String (PhilHealth Identification Number)
  - `is_senior_citizen`: Boolean (RA 9994 indicator)
  - `senior_citizen_id`: String (OSCA ID)
  - `is_pwd`: Boolean (RA 10754 indicator)
  - `pwd_id`: String (DSWD / City Hall PWD ID)
  - `created_at`: Timestamp

### 2. Encounter (`Encounter`)
- **Definition**: A distinct inpatient hospitalization episode from initial admission to final physical departure.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `patient_id`: UUID (Foreign Key $\rightarrow$ `Patient`)
  - `encounter_number`: String (Hospital HIS encounter/admission code)
  - `admission_date`: Timestamp
  - `discharge_date`: Timestamp (Nullable until discharged)
  - `attending_physician_id`: UUID
  - `room_category`: Enum (`WARD`, `SEMI_PRIVATE`, `REGULAR_PRIVATE`, `SUITE`, `ICU`)
  - `room_daily_rate`: Decimal (PHP)
  - `provisional_icd10`: String (Admitting diagnosis)
  - `final_icd10`: String (Discharge diagnosis)
  - `mgh_order_timestamp`: Timestamp (Clinical "May Go Home" clearance time)
  - `status`: Enum (`ADMITTED`, `MGH_DECLARED`, `RECONCILING`, `PENDING_PAYMENT`, `CLEARED`, `DEPARTED`)

### 3. ChargemasterItem (`ChargemasterItem`)
- **Definition**: An individual billable item, clinical service, medication, or diagnostic order posted to the patient's hospital ledger.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `encounter_id`: UUID (Foreign Key $\rightarrow$ `Encounter`)
  - `his_item_code`: String (Hospital warehouse SKU or procedure code)
  - `description`: String (Clinical/chargemaster description)
  - `category`: Enum (`ROOM_BOARD`, `PHARMACY`, `CENTRAL_SUPPLY`, `LABORATORY`, `IMAGING`, `OPERATING_ROOM`, `PROFESSIONAL_FEE`)
  - `quantity`: Integer
  - `unit_price`: Decimal (Gross chargemaster rate in PHP)
  - `gross_amount`: Decimal (Quantity $\times$ Unit Price)
  - `is_vatable`: Boolean (Subject to 12% Value-Added Tax)
  - `posted_timestamp`: Timestamp
  - `status`: Enum (`ORDERED`, `DISPENSED`, `RETURNED_TO_STOCK`, `FINALIZED`)

### 4. StatutoryDiscount (`StatutoryDiscount`)
- **Definition**: Evaluated tax exemption and statutory discount records calculated pursuant to RA 9994 or RA 10754.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `encounter_id`: UUID (Foreign Key $\rightarrow$ `Encounter`)
  - `discount_type`: Enum (`SENIOR_CITIZEN_RA9994`, `PWD_RA10754`, `NONE`)
  - `vat_exemption_amount`: Decimal (12% VAT deducted from vatable items)
  - `statutory_discount_amount`: Decimal (20% discount on VAT-exempt base)
  - `beneficiary_id_captured`: String
  - `verified_by_user_id`: UUID

### 5. PhilHealthClaim (`PhilHealthClaim`)
- **Definition**: The complete state social health insurance package assembled for submission under eClaims 3.0.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `encounter_id`: UUID (Foreign Key $\rightarrow$ `Encounter`)
  - `primary_icd10`: String
  - `primary_case_rate_amount`: Decimal (100% reimbursement ceiling)
  - `secondary_icd10`: String (Optional)
  - `secondary_case_rate_amount`: Decimal (50% reimbursement ceiling)
  - `total_hospital_benefit`: Decimal (Allocated to HCI)
  - `total_professional_benefit`: Decimal (Allocated to PF)
  - `total_philhealth_deduction`: Decimal (Total case rate benefit)
  - `is_nbb_eligible`: Boolean (No Balance Billing mandate)
  - `cf4_clinical_abstract_status`: Enum (`DRAFT`, `VALIDATED`, `DEFICIENT`)
  - `esoa_xml_payload`: Text (Standardized XML schema payload)
  - `pre_flight_audit_score`: Decimal (0.00 to 1.00; risk of RTH)
  - `submission_status`: Enum (`PENDING_AUDIT`, `READY_FOR_TRANSMISSION`, `TRANSMITTED`, `RTH`, `DENIED`, `PAID`)

### 6. HmoAuthorization (`HmoAuthorization`)
- **Definition**: The commercial insurance policy pre-authorization and approved Letter of Authorization (LOA).
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `encounter_id`: UUID (Foreign Key $\rightarrow$ `Encounter`)
  - `hmo_provider_id`: String (e.g., `MAXICARE`, `INTELLICARE`, `MEDICARD`, `PHILCARE`)
  - `member_id`: String
  - `policy_mbl`: Decimal (Maximum Benefit Limit)
  - `remaining_mbl_at_admission`: Decimal
  - `daily_room_allowance`: Decimal (Room & board inner limit)
  - `loa_reference_number`: String (Assigned by HMO switch/portal)
  - `approved_coverage_amount`: Decimal (Net covered amount)
  - `disallowed_exclusions_amount`: Decimal (Sum of excluded sundries)
  - `room_differential_penalty`: Decimal (Room upgrade excess)
  - `excess_doctor_fee_amount`: Decimal (Doctor fee above schedule)
  - `status`: Enum (`REQUESTED`, `PRE_AUTHORIZED`, `UNDER_REVIEW`, `FINAL_APPROVED`, `DECLINED`)

### 7. LedgerEntry (`LedgerEntry`)
- **Definition**: The central tripartite reconciled financial record representing the final explainable attribution for every billed line item.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `encounter_id`: UUID (Foreign Key $\rightarrow$ `Encounter`)
  - `chargemaster_item_id`: UUID (Foreign Key $\rightarrow$ `ChargemasterItem`)
  - `gross_charge`: Decimal
  - `vat_exempt_reduction`: Decimal
  - `senior_pwd_reduction`: Decimal
  - `philhealth_share`: Decimal
  - `hmo_share`: Decimal
  - `patient_out_of_pocket_share`: Decimal
  - `exclusion_reason_code`: String (e.g., `HMO_SUNDRY_EXCLUSION`, `ROOM_TARIFF_UPGRADE`, `EXCESS_PF`)
  - `plain_language_explainer`: String (User-friendly explanation for the patient)

### 8. DischargePass (`DischargePass`)
- **Definition**: The cryptographically verifiable electronic clearance document authorizing departure.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `encounter_id`: UUID (Foreign Key $\rightarrow$ `Encounter`)
  - `pass_qr_code`: String (Signed JWT payload)
  - `total_settled_amount`: Decimal
  - `settlement_method`: Enum (`DIGITAL_WALLET`, `CREDIT_CARD`, `CASH_AT_CASHIER`, `PROMISSORY_NOTE_RA9439`)
  - `promissory_note_id`: UUID (Optional; link to digital promissory note)
  - `issued_at`: Timestamp
  - `gate_security_verified_at`: Timestamp (Nullable until exit)
