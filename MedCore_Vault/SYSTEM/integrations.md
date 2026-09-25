# SYSTEM/integrations.md — Technical Integration Specifications & Adapters

> **Epistemic Status**: Systems Integration Standards & Interface Specifications  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/SYSTEM/`)  
> **Cross-References**: [architecture.md](architecture.md), [data_model.md](data_model.md), [REQUIREMENTS/non_functional.md](../REQUIREMENTS/non_functional.md)

---

## 1. Overview of the Integration Middle

[DECISION] MedCore connects to three major external ecosystem interfaces without requiring legacy hospital systems to be replaced:
1. **Hospital Information Systems (HIS / ERP)**: Legacy on-premise relational databases (BizBox, Comlogik, Medsys).
2. **PhilHealth National Gateway**: Government eClaims 3.0 secure transmission switch.
3. **Commercial HMO Gateways**: B2B transaction switches (MediLink) and standalone payer APIs.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MEDCORE INTEGRATION ARCHITECTURE                     │
├──────────────────────────┬──────────────────────┬───────────────────────┤
│ Integration Target       │ Integration Protocol │ Data Payload Standard │
├──────────────────────────┼──────────────────────┼───────────────────────┤
│ Hospital HIS (BizBox)    │ Read-Replica CDC /   │ SQL Schema / HL7 v2   │
│                          │ File Export Listener │ (ADT^A08, DFT^P03)    │
├──────────────────────────┼──────────────────────┼───────────────────────┤
│ PhilHealth eClaims 3.0   │ Secure SOAP / REST   │ XML Schema            │
│ Gateway                  │ with Mutual TLS      │ (Circular 2023-0026)  │
├──────────────────────────┼──────────────────────┼───────────────────────┤
│ HMO Switch (MediLink)    │ HTTPS REST / Webhook │ JSON Payloads         │
│                          │ & EDI 278/270 Adapter│ (eLOA Specification)  │
├──────────────────────────┼──────────────────────┼───────────────────────┤
│ Payment Gateways         │ Webhook Callbacks    │ QR Ph Interoperable / │
│ (GCash, Maya, PayMongo)  │ (HMAC Signature)     │ ISO 8583 / EMVCo      │
└──────────────────────────┴──────────────────────┴───────────────────────┘
```

---

## 2. Hospital Information System (HIS) Integration Adapters

### BizBox Integration Specification (MS SQL Server / Sybase)
[DECISION] Because BizBox commands the majority of private hospital installations in the Philippines, MedCore deploys a lightweight, non-invasive integration adapter:
- **Architecture**: Deployed on a secure dedicated virtual machine within the hospital intranet with read-only access to a **BizBox Database Read-Replica**.
- **Change Data Capture (CDC)**: Utilizes SQL Server Change Tracking or CDC to poll table modifications every 5 seconds without placing lock contention on operational clinical tables:
  - `BillingLedgerHeader`: Tracks admission status, room changes, and MGH orders.
  - `BillingLedgerDetails`: Ingests real-time line-item charge postings (medications, supplies, diagnostic tests).
  - `DoctorPFTable`: Listens for attending physician fee slip postings.
- **Bi-Directional Re-Posting**: When a patient balance is settled or a digital discharge pass is generated, the MedCore agent writes back to the BizBox `PaymentReceiptJournal` or `ClearanceStatus` table via an approved stored procedure, updating the internal hospital ledger.

---

## 3. PhilHealth eClaims 3.0 XML Pipeline

[FACT] Compliant with **PhilHealth Circular No. 2023-0026** and eClaims 3.0 technical requirements:

### Transport Security & Authentication
- **Protocol**: HTTPS over TLS 1.3 with client-side **Mutual TLS (mTLS)** using a PhilHealth-issued accredited digital certificate.
- **Credentials**: Facility Accreditation Number (PAN/HCI Code) and cryptographic security token refreshed every 24 hours.

### eSOA XML Schema Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<eSOA version="3.0" pHospitalCode="H99999999" pEncounterNo="ENC-2026-00912">
  <PatientInfo pPhilHealthPIN="12-345678901-2" pLastName="Dela Cruz" pFirstName="Juan"/>
  <BillingSummary>
    <TotalGrossCharges pAmount="120000.00"/>
    <StatutoryDiscounts pVATExemption="5357.14" pSeniorPWDDiscount="21857.14"/>
    <PhilHealthDeductions pPrimaryCaseRate="15000.00" pPrimaryICD10="J18.9" pHospitalShare="10500.00" pDoctorShare="4500.00"/>
    <HMODeductions pApprovedLOA="57585.72" pHMOProvider="MAXICARE" pLOARef="MAX-2026-9921"/>
    <NetPatientDue pAmount="20200.00"/>
  </BillingSummary>
  <ItemizedDetails>
    <Item pCode="PNDF-1029" pCategory="PHARMACY" pQty="10" pUnitPrice="450.00" pGross="4500.00" pDisallowed="false"/>
    <Item pCode="CSR-SUCT-01" pCategory="CENTRAL_SUPPLY" pQty="2" pUnitPrice="225.00" pGross="450.00" pDisallowed="true" pExclusionReason="HMO_WARD_SUNDRY"/>
  </ItemizedDetails>
</eSOA>
```

---

## 4. Commercial HMO Switch & Webhook Adapters

### MediLink PayLink Switch Adapter
- **Protocol**: Webhook / HTTPS REST API.
- **Outbound LOA Request Payload**: When an inpatient admission or discharge order is declared, MedCore dispatches a structured pre-cleansed charge summary to the HMO gateway:
  ```json
  {
    "hmo_code": "MAXICARE",
    "member_id": "1102938475",
    "hospital_id": "HCI-00129",
    "admission_date": "2026-09-22T08:00:00Z",
    "discharge_order_date": "2026-09-25T10:30:00Z",
    "diagnosis_icd10": "J18.9",
    "billed_charges": {
      "gross_hospital_charges": 85000.00,
      "gross_doctor_pf": 35000.00,
      "statutory_sc_pwd_discount": 27214.28,
      "philhealth_case_rate_deduction": 15000.00,
      "eligible_hmo_balance": 77785.72
    },
    "itemized_exclusions": [
      {
        "item_code": "CSR-SUCT-01",
        "description": "Suction Catheter",
        "amount": 450.00,
        "category": "DISALLOWED_SUNDRY"
      }
    ]
  }
  ```
- **Inbound Approved LOA Callback**: Ingests approved authorization codes, approved monetary ceilings, and itemized disallowance reasons directly into the running ledger in real time.
