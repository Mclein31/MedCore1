# DECISIONS/product_decisions.md — Confirmed Product Scope & Architectural Decisions

> **Epistemic Status**: Architectural Decision Record (ADR) Log — Product Scope  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/DECISIONS/`)  
> **Cross-References**: [PROJECT.md](../PROJECT.md), [PRODUCT/product_model.md](../PRODUCT/product_model.md), [PRODUCT/workflows.md](../PRODUCT/workflows.md)

---

## 1. ADR-001: Dedicated Middleware vs. Full HIS/EMR Replacement

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: Philippine private hospitals have heavily invested in legacy Hospital Information Systems (BizBox, Comlogik, SAP) for bed management, pharmacy dispensing, clinical charting, and accounting. A "rip-and-replace" approach requires tens of millions of pesos in capital expenditure, 12 to 24 months of deployment, and high clinical resistance.
- **Decision**: MedCore will **NEVER** attempt to replace the hospital HIS or clinical EMR. MedCore operates strictly as the specialized **Financial Intelligence & Multi-Payer Reconciliation Middleware Layer** sitting on top of existing hospital systems via read-replicas, HL7/FHIR feeds, and XML export listeners.
- **Consequences**: Fast 30-to-60 day hospital pilot deployments; non-threatening executive sales pitch to hospital CFOs; zero clinical disruption for doctors and nurses.

---

## 2. ADR-002: Mobile Web / PWA Delivery vs. Native App Store Requirement

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: Hospitalized patients and their family guarantors are in a high-stress, temporary environment. Forcing patients to navigate the Apple App Store or Google Play Store, download a 100MB application, create an account, and verify email while in a hospital bed creates insurmountable friction and 80%+ drop-off.
- **Decision**: The consumer-facing platform (**MedCore Patient Clarify**) will be delivered strictly as a **zero-install Mobile Web / Progressive Web App (PWA)** accessible via SMS/WhatsApp magic links authenticated by one-time password (OTP) sent to the patient's registered mobile number.
- **Consequences**: Near-100% patient engagement; instant loading over 3G/4G/5G hospital Wi-Fi; zero app store submission gatekeepers.

---

## 3. ADR-003: Core Operating Loop Nomenclature Standard

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: Historical exploratory notes referenced a `Guide → Verify → Reward → Report → Improve` cycle. However, the product strategy established `GUIDE → VERIFY → RECONCILE → APPROVE → IMPROVE`.
- **Decision**: Adopt **`GUIDE → VERIFY → RECONCILE → APPROVE → IMPROVE`** as the canonical 5-stage closed loop. Map settlement incentives into Stage 4 (`APPROVE`) and executive telemetry into Stage 5 (`IMPROVE`).
- **Consequences**: Strict semantic alignment across engineering, documentation, and product management.

---

## 4. ADR-004: Pre-Admission Orientation vs. Anti-Deposit Law (RA 10932)

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: Republic Act No. 10932 severely penalizes demanding deposits or advance payments as a condition for emergency treatment or obstetric care. If Stage 1 (GUIDE) pre-admission estimates are perceived as deposit solicitations, hospitals face criminal liability.
- **Decision**: MedCore explicitly decouples financial estimation from clinical admission clearance. The Stage 1 output is legally structured as a **"Non-Binding Pre-Admission Cost & Benefit Orientation"** provided for patient planning, containing explicit statutory disclaimers under RA 10932.
- **Consequences**: Total immunity from RA 10932 infractions; transparent patient financial counseling without gatekeeping care.

---

## 5. ADR-005: Single Period of Confinement (SPC) Architecture

- **Status**: Confirmed & Codified (`[FACT: Suspended Oct 1, 2024; DECISION: Configurable Toggle]`)
- **Context**: PhilHealth suspended the 90-day Single Period of Confinement rule on October 1, 2024. However, regulatory directives in Philippine healthcare can shift rapidly upon executive leadership turnover, and historical audit queries still examine past claims.
- **Decision**: Retain the complete PhilHealth 90-day SPC rule calculation engine within `MedCore ClaimReady`, but place its enforcement behind a dynamic system configuration toggle (`ENABLE_PHILHEALTH_SPC_FILTER = FALSE`).
- **Consequences**: If PhilHealth reinstates the rule or regional offices perform retrospective audits, MedCore can re-enable SPC checks instantly with zero code changes or deployment downtime.
