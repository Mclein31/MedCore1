# SYSTEM/data_model.md — Relational Schemas & Data Dictionaries

> **Epistemic Status**: Database Architecture & Physical Data Schema Standard  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/SYSTEM/`)  
> **Cross-References**: [entities.md](entities.md), [architecture.md](architecture.md), [integrations.md](integrations.md)

---

## 1. Relational Database Schema (PostgreSQL 16+)

[DECISION] MedCore utilizes PostgreSQL with row-level security (RLS), JSONB indexing, and field-level encryption for protected health information (PHI):

```sql
-- Enable cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types
CREATE TYPE encounter_status AS ENUM ('ADMITTED', 'MGH_DECLARED', 'RECONCILING', 'PENDING_PAYMENT', 'CLEARED', 'DEPARTED');
CREATE TYPE discount_type AS ENUM ('SENIOR_CITIZEN_RA9994', 'PWD_RA10754', 'NONE');
CREATE TYPE charge_category AS ENUM ('ROOM_BOARD', 'PHARMACY', 'CENTRAL_SUPPLY', 'LABORATORY', 'IMAGING', 'OPERATING_ROOM', 'PROFESSIONAL_FEE');
CREATE TYPE claim_status AS ENUM ('PENDING_AUDIT', 'READY_FOR_TRANSMISSION', 'TRANSMITTED', 'RTH', 'DENIED', 'PAID');
CREATE TYPE settlement_channel AS ENUM ('QR_PH', 'GCASH', 'MAYA', 'CREDIT_DEBIT_CARD', 'PROMISSORY_NOTE_RA9439', 'CASHIER_OVER_THE_COUNTER');

-- 1. Patients Table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL,
    mrn VARCHAR(64) NOT NULL,
    encrypted_first_name BYTEA NOT NULL,
    encrypted_last_name BYTEA NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(16) NOT NULL,
    mobile_number VARCHAR(32) NOT NULL,
    philhealth_pin BYTEA,
    is_senior_citizen BOOLEAN DEFAULT FALSE,
    senior_citizen_id VARCHAR(64),
    is_pwd BOOLEAN DEFAULT FALSE,
    pwd_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_patient_mrn_hospital UNIQUE (hospital_id, mrn)
);

-- 2. Inpatient Encounters Table
CREATE TABLE encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    encounter_number VARCHAR(64) NOT NULL,
    admission_timestamp TIMESTAMPTZ NOT NULL,
    discharge_timestamp TIMESTAMPTZ,
    mgh_order_timestamp TIMESTAMPTZ,
    room_category VARCHAR(32) NOT NULL,
    daily_room_rate NUMERIC(12, 2) NOT NULL,
    provisional_icd10 VARCHAR(16) NOT NULL,
    final_icd10 VARCHAR(16),
    attending_physician_id UUID NOT NULL,
    status encounter_status DEFAULT 'ADMITTED',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tripartite Reconciled Ledger Table
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    his_item_code VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    category charge_category NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    gross_charge NUMERIC(12, 2) NOT NULL,
    is_vatable BOOLEAN DEFAULT TRUE,
    vat_exemption_reduction NUMERIC(12, 2) DEFAULT 0.00,
    senior_pwd_reduction NUMERIC(12, 2) DEFAULT 0.00,
    philhealth_allocated_share NUMERIC(12, 2) DEFAULT 0.00,
    hmo_approved_share NUMERIC(12, 2) DEFAULT 0.00,
    patient_out_of_pocket_share NUMERIC(12, 2) NOT NULL,
    is_hmo_excluded BOOLEAN DEFAULT FALSE,
    exclusion_reason_code VARCHAR(64),
    plain_language_explainer TEXT,
    posted_at TIMESTAMPTZ NOT NULL,
    reconciled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. PhilHealth Claims & Audit Scrubbing Table
CREATE TABLE philhealth_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL UNIQUE REFERENCES encounters(id) ON DELETE CASCADE,
    primary_icd10 VARCHAR(16) NOT NULL,
    primary_case_rate_amount NUMERIC(12, 2) NOT NULL,
    secondary_icd10 VARCHAR(16),
    secondary_case_rate_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_hospital_share NUMERIC(12, 2) NOT NULL,
    total_physician_share NUMERIC(12, 2) NOT NULL,
    total_case_rate_deduction NUMERIC(12, 2) NOT NULL,
    is_nbb_mandate BOOLEAN DEFAULT FALSE,
    cf4_abstract_verified BOOLEAN DEFAULT FALSE,
    esoa_xml_payload XML,
    pre_flight_rth_score NUMERIC(5, 4) DEFAULT 0.0000,
    submission_status claim_status DEFAULT 'PENDING_AUDIT',
    transmitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Digital Discharge Clearance & Gate Passes
CREATE TABLE discharge_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL UNIQUE REFERENCES encounters(id) ON DELETE CASCADE,
    pass_token VARCHAR(256) NOT NULL UNIQUE,
    settlement_channel settlement_channel NOT NULL,
    total_settled_amount NUMERIC(12, 2) NOT NULL,
    settlement_reference VARCHAR(128) NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    security_verified_at TIMESTAMPTZ,
    verified_by_guard_id UUID
);
```

---

## 2. JSON Schemas for External Payloads

### MedCore Smart Statement JSON Schema
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "MedCoreSmartStatement",
  "type": "object",
  "properties": {
    "encounter_id": { "type": "string", "format": "uuid" },
    "patient_display_name": { "type": "string" },
    "statement_generated_at": { "type": "string", "format": "date-time" },
    "waterfall_summary": {
      "type": "object",
      "properties": {
        "gross_charges": { "type": "number" },
        "statutory_vat_exemption": { "type": "number" },
        "statutory_senior_pwd_discount": { "type": "number" },
        "net_statutory_base": { "type": "number" },
        "philhealth_case_rate_deduction": { "type": "number" },
        "hmo_approved_coverage": { "type": "number" },
        "net_patient_out_of_pocket": { "type": "number" }
      },
      "required": ["gross_charges", "philhealth_case_rate_deduction", "net_patient_out_of_pocket"]
    },
    "patient_obligation_breakdown": {
      "type": "object",
      "properties": {
        "room_differential_total": { "type": "number" },
        "excluded_consumables_total": { "type": "number" },
        "excess_doctor_fee_total": { "type": "number" }
      }
    }
  },
  "required": ["encounter_id", "waterfall_summary"]
}
```
