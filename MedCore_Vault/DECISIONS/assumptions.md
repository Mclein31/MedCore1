# DECISIONS/assumptions.md — Pilot Assumptions & Empirical Hypotheses Registry

> **Epistemic Status**: Catalog of Unverified Assumptions & Hypotheses Awaiting Pilot Validation  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/DECISIONS/`)  
> **Cross-References**: [PROJECT.md](../PROJECT.md), [product_decisions.md](product_decisions.md), [REQUIREMENTS/mvp_scope.md](../REQUIREMENTS/mvp_scope.md)

---

## 1. Registry of Pilot Assumptions & Hypotheses

[DECISION] To prevent unverified beliefs from contaminating technical and business logic, every operational assumption is logged below with explicit validation criteria to be tested during hospital pilot deployments:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PILOT ASSUMPTIONS & HYPOTHESES MATRIX                           │
├────────┬────────────────────────────────┬──────────────┬───────────────────────────────┤
│ ID     │ Assumption Domain              │ Status       │ Validation Target / Metric    │
├────────┼────────────────────────────────┼──────────────┼───────────────────────────────┤
│ ASM-01 │ Payment Processing Take-Rate   │ [ASSUMPTION] │ 1.2%–2.5% gross payment spread│
│ ASM-02 │ Digital Promissory Recovery    │ [HYPOTHESIS] │ >65% recovery (vs. <20% paper)│
│ ASM-03 │ Point-of-Service Payment Lift  │ [HYPOTHESIS] │ 25%–40% increase at discharge │
│ ASM-04 │ Doctor Mobile PF Turnaround    │ [ASSUMPTION] │ <15 mins average doctor reply │
│ ASM-05 │ HIS Read-Replica Sync Latency  │ [ASSUMPTION] │ <5 seconds CDC event capture  │
│ ASM-06 │ Patient Smartphone Engagement  │ [ASSUMPTION] │ >85% SMS magic link open rate │
└────────┴────────────────────────────────┴──────────────┴───────────────────────────────┘
```

---

## 2. Detailed Assumption Profiles

### ASM-01: Payment Processing Take-Rate & Gateway Margins
- **Epistemic Status**: `[ASSUMPTION]`
- **Statement**: MedCore can sustain a blended **1.2% to 2.5% convenience fee / take-rate** on patient out-of-pocket transactions settled via QR Ph, GCash, Maya, and credit/debit cards, yielding a net 0.4% to 0.8% software margin after paying underlying merchant aggregators (PayMongo, Maya Business, Xendit).
- **Validation Metric**: Formal merchant acquiring agreements executed with Philippine payment processors; zero hospital or patient pushback on convenience fee passing during pilot tests.
- **Contingency Plan**: If hospitals demand absorbing payment costs, adjust the Per-Discharge Clearance Fee upwards (from ₱65 to ₱95) to subsidize payment rail processing.

### ASM-02: Digital Promissory Note Debt Recovery Lift
- **Epistemic Status**: `[HYPOTHESIS]`
- **Statement**: Replacing unsecured paper promissory notes under the Anti-Hospital Detention Law (RA 9439) with authenticated **Digital Promissory Notes** (featuring national ID capture, e-signatures, and automated SMS installment payment reminders via GCash/Maya) will increase debt recovery from **under 20% to over 65%**.
- **Validation Metric**: Track 30, 60, and 90-day repayment recovery rates across 500 consecutive promissory note executions in partner hospitals.
- **Contingency Plan**: If recovery remains below 40%, integrate regulated healthcare micro-lending partners (e.g., Billease, specialized consumer lenders) to purchase or guarantee qualified promissory notes upfront.

### ASM-03: Point-of-Service Digital Payment Conversion Lift
- **Epistemic Status**: `[HYPOTHESIS]`
- **Statement**: Providing patients with real-time bill visibility and mobile checkout during their stay will increase voluntary point-of-service (POS) out-of-pocket settlement by **25% to 40%** at discharge, reducing hospital accounts receivable.
- **Validation Metric**: Measure POS cash/digital collections as a percentage of net patient liability in pilot facilities compared against 12-month pre-MedCore historical controls.
- **Contingency Plan**: Introduce gamified prompt-payment settlement discounts (e.g., 2% prompt settlement courtesy discount authorized by hospital billing).

### ASM-04: Attending Physician Mobile PF Sign-Off Compliance
- **Epistemic Status**: `[ASSUMPTION]`
- **Statement**: Attending independent medical specialists and surgical consultants will adopt a lightweight mobile web screen to confirm their billed professional fees electronically within **15 minutes** of the "May Go Home" order, eliminating physical runner delays.
- **Validation Metric**: >80% of doctor PF sign-offs completed via smartphone within 20 minutes of MGH declaration in the pilot hospital ward.
- **Contingency Plan**: Establish automated fallback escalation: if the doctor does not confirm within 15 minutes, the billing clerk receives an automated prompt to apply the doctor's standard pre-configured default schedule fee or phone their clinic secretary directly.

### ASM-05: HIS Read-Replica Synchronization Latency
- **Epistemic Status**: `[ASSUMPTION]`
- **Statement**: Hospital IT departments will permit read-replica database access or Change Data Capture (CDC) streaming with data synchronization latency of **under 5 seconds** without degrading core HIS transaction performance.
- **Validation Metric**: Benchmark database transaction logs across peak hospital hours (8:00 AM – 12:00 PM) in a 250-bed BizBox environment.
- **Contingency Plan**: If database access is restricted by IT security policies, utilize scheduled flat-file eSOA XML export listeners or HL7 v2 over TCP/IP feeds.

### ASM-06: Patient Smartphone Adoption & Mobile Web Open Rates
- **Epistemic Status**: `[ASSUMPTION]`
- **Statement**: Over **85% of inpatients or family guarantors** in private tertiary and secondary hospitals possess an active smartphone and will successfully open an SMS/WhatsApp magic link to view their live statement.
- **Validation Metric**: Track unique link click-through rates and session duration across 1,000 inpatient admissions.
- **Contingency Plan**: Station tablet kiosks at ward nursing stations or provide bedside billing tablets managed by floor nurses for patients without mobile internet access.
