# PRODUCT/vision.md — MedCore 5-Year Strategic Vision

> **Epistemic Status**: Strategic Roadmap & Long-Term Platform Vision  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/PRODUCT/`)  
> **Cross-References**: [PROJECT.md](../PROJECT.md), [problems.md](problems.md), [product_model.md](product_model.md), [BUSINESS/business_model.md](../BUSINESS/business_model.md)

---

## 1. Executive Horizon Overview

[DECISION] MedCore is designed not merely as a hospital billing accelerator, but as the foundational financial infrastructure for Philippine healthcare. While initial deployment attacks the single most acute operational failure in the hospital—the **4 to 8+ hour discharge clearance bottleneck**—the platform's architecture creates network effects that evolve toward an integrated payer-provider clearinghouse and ultimately a nationwide healthcare wallet for every Filipino citizen.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE ROADMAP HORIZON                                    │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│    PHASE 1: MONTHS 0–18  │    PHASE 2: MONTHS 18–36    │     PHASE 3: MONTHS 36–60     │
│   The Hospital Clearance │   Payer-Provider Network    │ The Unified Healthcare Wallet │
│           Wedge          │        Integration          │         for Filipinos         │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • Focus: Discharge delay │ • Focus: Direct API pipes   │ • Focus: National patient app │
│   and billing clarity.   │   with top 5 HMOs.          │ • Unified medical wallet.     │
│ • Secure top 25 private  │ • Automated real-time LOA   │ • PhilHealth + HMO balance    │
│   tertiary hospitals.    │   adjudication.             │   monitoring in real time.    │
│ • Cut discharge times    │ • Shared payer-provider     │ • Built-in healthcare credit  │
│   to under 45 mins.      │   clearinghouse.            │   and installment underwriting│
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 2. Phase 1 (Months 0–18): The Hospital Discharge Clearance Wedge

[DECISION] **Strategic Focus**: Penetrate private tertiary and secondary hospitals by solving the discharge bottleneck, reducing PhilHealth claim rejections, and accelerating patient cash settlement.

### Key Milestones & Objectives
1. **Target Footprint**: Deploy MedCore across **20 to 30 leading private tertiary hospitals** in Metro Manila, Calabarzon, and Metro Cebu (e.g., target hospital networks such as Metro Pacific Health, The Medical City Network, St. Luke's Medical Center, Mount Grace Hospitals, and Allied Care Experts Group).
2. **Operational SLA Verification**:
   - [DECISION] Cut inpatient discharge clearance times from **4–8+ hours to <45 minutes** (primary SLA) and **<30 minutes** (target).
   - [DECISION] Slash initial PhilHealth Return-to-Hospital (RTH) rates from **15–20% down to <2%**.
   - [DECISION] Lift digital out-of-pocket point-of-service collections by **25% to 40%** at discharge.
3. **Core Integrations**:
   - Implement bi-directional read-replica database adapters and XML export listeners for leading Philippine Hospital Information Systems (**BizBox**, **Comlogik**, **Medsys**).
   - Establish compliant eClaims 3.0 XML transmission pipelines conforming to PhilHealth Circular 2023-0026.
   - Launch the **MedCore Patient Clarify** mobile web/PWA interface for real-time running bills and 1-click GCash/Maya/QR Ph checkout.

---

## 3. Phase 2 (Months 18–36): Payer-Provider Network Integration

[DECISION] **Strategic Focus**: Transition from a hospital-centric middleware to a two-sided automated clearinghouse between private hospitals and commercial HMOs/insurers.

### Key Milestones & Objectives
1. **Payer Consortium Integration**:
   - Partner with the **Top 5 Philippine HMOs** (Maxicare, Intellicare/Avega, Medicard, PhilCare, Pacific Cross) to replace manual portal logins, email attachments, and phone liaison queues with automated REST/webhook API pipes.
   - Establish real-time electronic Letter of Authorization (eLOA) adjudication, where HMO policy engines receive pre-cleansed hospital chargemaster line items and return approved benefit caps within seconds.
2. **Neutral Arbiter Positioning**:
   - Act as the trusted data clearinghouse mediating between hospital chargemaster price lists and HMO consumable exclusion rulebooks.
   - Standardize medical supplies and procedural consumables, drastically reducing post-discharge claim audits, retroactive chargebacks, and legal disputes.
3. **Network Expansion**:
   - Expand beyond inpatient tertiary hospitals into high-volume ambulatory surgical centers, multi-specialty diagnostic clinics (e.g., Healthway, Hi-Precision), and secondary hospital groups across Visayas and Mindanao.

---

## 4. Phase 3 (Months 36–60): The Unified Healthcare Financial Identity

[DECISION] **Strategic Focus**: Evolve the consumer-facing interface into the ubiquitous **MedCore Health Account**—the definitive healthcare financial identity and digital wallet for Filipino patients and families.

### Key Milestones & Objectives
1. **Consolidated Patient Health Wallet**:
   - Deliver a single mobile application where any Filipino can view their verified PhilHealth membership status, real-time contribution compliance, remaining HMO Maximum Benefit Limit (MBL) balances across multiple policies, and lifetime itemized medical billing history.
   - Eliminate physical insurance card swiping and paper receipts across all network providers.
2. **Embedded Healthcare Micro-Financing & Underwriting**:
   - [HYPOTHESIS] By capturing granular longitudinal clinical and billing data, MedCore can partner with digital banks and fintech lenders to underwrite instant, zero-interest or low-interest medical installment lines directly inside the app, solving the 42.7% household out-of-pocket crisis at the moment of care.
   - Replace unsecured, legally fraught paper promissory notes (under RA 9439) with digitally executed, legally compliant micro-installment loans.
3. **Macro Impact**:
   - MedCore becomes the definitive transactional nervous system underpinning modern, transparent, and dignified healthcare delivery in the Philippines.
