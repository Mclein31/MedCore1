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
- **Consequences**: If PhilHealth reinstates the rule or regional offices perform retrospective audits, MedCore can re-enable SPC checks instantly with zero code changes or deployment downtime.

---

## 6. ADR-006: Standalone Statutory Promissory Note Guarantee Workflow (RA 9439) with Zero-Balance Fallback

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: Under Republic Act No. 9439 (Anti-Hospital Detention Law), hospitals cannot detain non-paying patients who execute a valid promissory note. When staff launch the promissory note modal from the general Disputes & Exceptions desk without a pre-selected patient, or when the currently focused encounter is already settled (₱0.00 due), earlier builds dead-ended at a terminal "Zero Outstanding Balance" dialog.
- **Decision**:
  1. If `openPromissoryModal()` is called without an encounter ID or on a settled patient, automatically pre-select the first inpatient encounter with an active positive balance (`waterfall.netPatientDue > 0`).
  2. If opened on an encounter with ₱0 balance, render an interactive patient picker dropdown listing all eligible inpatients with outstanding balances, rather than a terminal "Close" modal.
  3. Include an in-situ encounter switcher inside the general promissory note form, allowing hospital billing officers to issue promissory undertakings across patients without closing and reopening the modal.
- **Consequences**: Zero dead-ends for hospital credit and collection staff; full adherence to RA 9439 statutory guarantees with 0% interest financing plans (3, 6, 12 months).

---

## 7. ADR-007: Supervisory Courtesy Waiver & Natural-Language Bill Transparency (Why Do I Owe This?)

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: Philippine private hospital discharges frequently experience friction over contested charges (e.g. sundry supply kits, unconsumed IV sets, room upgrades). Supervisors often grant courtesy goodwill waivers to accelerate discharge clearances. If waivers are not reflected in real-time or explainers show conflicting amounts, patients dispute the final bill.
- **Decision**:
  1. Provide a supervisory "Waive Balance" action that marks items as `SUPERVISORY_WAIVED` and disputes as `SUPERVISOR_WAIVED`.
  2. The natural-language "Why Do I Owe This?" drawer dynamically recognizes waived items: displays a green statutory waiver notice banner, explicitly deducts "Less: Supervisory Goodwill Waiver" in the calculation cascade, sets net patient responsibility to ₱0.00, and displays a disabled `✓ Waived by Supervisor` status badge.
  3. Supervisory waivers immediately update the financial waterfall and decrement attention badges across the sidebar and Kanban boards.
- **Consequences**: Transparent patient-facing adjudication; immediate clearance acceleration under statutory discharge protocols.

---

## 8. ADR-008: AI-Driven Platform Architecture via Google AI Studio Free Tier & Backend Proxy

- **Status**: Confirmed & Codified (`[DECISION]`)
- **Context**: MedCore / AQROMED is branded as an "AI-driven platform" for the PGC Digital Innovation Challenge, but prior implementations relied exclusively on deterministic rule engines, static charge explainers, and manual dispute workflows. To fulfill the platform's vision without operational expenditure or API token exhaustion during development and judging, an AI integration architecture is required.
- **Decision**:
  1. **Google AI Studio Free Tier Adoption**: Deploy `gemini-2.5-flash` on the free tier (15 RPM, 1,000,000 TPM, 1,500 RPD, 1M+ context window, $0.00 cost) as the primary LLM engine. Pro models (`gemini-1.5-pro`) are prohibited on free tier due to restrictive throttles (2 RPM, 50 RPD).
  2. **Dedicated Backend API Proxy (`apps/server`)**: Enforce a strict architectural boundary where frontend clients (mobile app, web dashboard) never query Google AI APIs directly. All AI traffic is mediated by server endpoints under `/api/v1/ai/*`.
  3. **Privacy by Design & PHI Anonymization (RA 10173)**: Before transmitting prompt context to Google AI Studio, the backend strips all identifying patient data (full names, contact info, raw PhilHealth PINs, MRNs). Only clinical classifications (ICD-10 codes, CF4 status), anonymized encounter IDs, and itemized financial numbers are forwarded.
  4. **Mobile AI Implementation**: Implement "Cora", an interactive patient billing and discharge concierge chatbot in plain English/Taglish/Ilocano that provides dynamic statutory waterfall explanations, real-time discharge milestone interpretation, RA 9439 promissory note counseling, and one-tap charge dispute initiation.
  5. **Dashboard AI Implementation**: Implement clinical claims forensic pre-flight scrubbing (PhilHealth RTH prediction against CF4/ICD-10 data in `ClaimsEsoaPage.tsx`), HMO medical necessity appeal drafting in `ApprovalsDisputesPage.tsx`, and executive bottleneck briefings in `CommandCenterPage.tsx`.
- **Consequences**: Immediate justification of the "AI-driven platform" mandate; zero API expenses; complete data privacy compliance under Republic Act No. 10173; zero token leakage or API key exposure in client bundles.

