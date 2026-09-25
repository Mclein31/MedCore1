# RESEARCH/cedar_model.md — Cedar Architectural Analysis & Philippine Adaptation

> **Epistemic Status**: Global Reference Architecture Evaluation & Localization Strategy  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/RESEARCH/`)  
> **Cross-References**: [PROJECT.md](../PROJECT.md), [competitors.md](competitors.md), [BUSINESS/business_model.md](../BUSINESS/business_model.md)

---

## 1. Cedar Healthcare Corporate & Architectural Profile

[RESEARCHED] Founded in 2016 by Florian Otto and Arel Lidow, **Cedar Healthcare** is the preeminent US enterprise patient financial engagement platform. In 2021, Cedar achieved a **$3.2 Billion valuation** following a $200 Million Series D financing. In May 2021, Cedar completed the landmark **$425 Million acquisition of OODA Health**, uniting provider-facing revenue cycle billing with real-time commercial health plan (payer) claim integration to pioneer a two-sided healthcare financial network.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       THE CEDAR PRODUCT ARCHITECTURE                    │
├──────────────────────────────┬──────────────────────────────────────────┤
│          PRE-VISIT           │                POST-VISIT                │
├──────────────────────────────┼──────────────────────────────────────────┤
│ Cedar Pre / Cedar Cover      │ Cedar Pay                                │
│ • Digital pre-registration   │ • Unified digital billing                │
│ • Real-time eligibility      │ • Payer EOB + Provider bill alignment    │
│ • Upfront out-of-pocket est. │ • Personalized payment plans             │
│ • Insurance card capture     │ • Digital payment settlement             │
├──────────────────────────────┴──────────────────────────────────────────┤
│                       CROSS-PLATFORM INTELLIGENCE                       │
├─────────────────────────────────────────────────────────────────────────┤
│ Cedar Intelligence & Kora (Launched 2024)                               │
│ • Machine learning propensity-to-pay engine                             │
│ • Behavioral cadence optimization (SMS/Email channel routing)           │
│ • Autonomous AI voice and chat agents for dispute resolution            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Verified Economic Value Creation (US Case Studies)
- **Collection Rate Lift**: Health systems deploying Cedar (e.g., Novant Health, ChristianaCare) report a **30% to 35% increase in patient payments** within 6 to 12 months.
- **Cost-to-Collect Reduction**: Eliminates paper statement printing, postage, and manual call-center inquiries by **40% to 55%**.
- **Speed to Settlement**: Accelerates average payment turnaround from **45+ days down to under 14 days**, drastically reducing Days in Accounts Receivable (DAR).
- **Consumer Satisfaction (CSAT)**: Achieves **88% to 92% patient satisfaction** regarding the financial experience, compared to a US healthcare industry baseline of ~20%.

---

## 2. The Cedar Adaptation Boundary: Why US Models Fail in the Philippines

[DECISION] A direct copy of Cedar's product model and commercial structure cannot succeed in the Philippines due to fundamental structural, statutory, and economic differences:

```
┌───────────────────────────────────┬───────────────────────────────────┐
│     UNITED STATES (CEDAR MODEL)   │   PHILIPPINES (MEDCORE REALITY)   │
├───────────────────────────────────┼───────────────────────────────────┤
│ Post-Visit Financial Crisis:      │ Intra-Care & Discharge Crisis:    │
│ Patients leave the hospital freely│ Patients cannot physically leave  │
│ and receive paper bills 30–90     │ their room without billing        │
│ days later; Cedar focuses on      │ clearance; MedCore resolves the   │
│ digital post-care collections.    │ 4–8 hour discharge bottleneck.    │
├───────────────────────────────────┼───────────────────────────────────┤
│ High Margin Tolerance:            │ Thin Operating Margins:           │
│ US hospitals can absorb 1%–4%     │ Philippine private hospitals have │
│ take-rates on patient collections │ tight margins and reject paying a │
│ due to high markup structures.    │ 3%–4% cut on gross collections.   │
├───────────────────────────────────┼───────────────────────────────────┤
│ ANSI X12 EDI Standards:           │ Statutory Deduction Cascade:      │
│ Governed by X12 837/835 HIPAA     │ Strictly governed by RA 9994/     │
│ transactions, copays, deductibles,│ 10754 VAT/SC discounts, PhilHealth│
│ and co-insurance percentages.     │ ACR/DRG packages, and HMO MBLs.   │
├───────────────────────────────────┼───────────────────────────────────┤
│ Credit Bureau Infrastructure:     │ Unbanked / Cash & Wallet Economy: │
│ Experian/Equifax credit scoring   │ Under-penetrated credit cards;    │
│ drives propensity-to-pay models.  │ 80M+ Filipinos on GCash, Maya,   │
│                                   │ and QR Ph; no centralized credit. │
└───────────────────────────────────┴───────────────────────────────────┘
```

---

## 3. Architectural Translation: How MedCore Adapts Cedar

[DECISION] MedCore synthesizes Cedar's consumer UX brilliance with the statutory and operational realities of the Philippine healthcare system:

| Cedar Component | US Implementation | MedCore Adaptation for the Philippines |
| :--- | :--- | :--- |
| **Cedar Pay** | Post-care statement combining hospital bill and insurance EOB. | **MedCore Patient Clarify**: Real-time running bill delivered during the hospital stay; resolves statutory deductions before discharge. |
| **Cedar Pre / Cover** | Pre-service eligibility check and commercial deductible calculation. | **MedCore Flow & Verify**: Validates PhilHealth Member Data Records (MDR), checks 90-day SPC history, and audits HMO room allowances. |
| **Payment Rails** | ACH bank transfer, HSA/FSA debit cards, Apple Pay, Stripe. | **Philippine Digital Rails**: Seamless integration with **QR Ph**, **GCash**, **Maya**, bank debit, and medical installment lines. |
| **Installment Engine** | Recourse medical loans via US consumer fintechs. | **Digital Promissory Engine (RA 9439)**: Structured digital repayment agreements complying with the Anti-Detention Law, recovering uncollected debt. |
| **Cedar Intelligence** | FICO/credit-based propensity-to-pay scoring. | **Socio-Economic & Room-Tier Scoring**: ML models calibrating financial assistance and installment offers based on room tier and diagnostic presentation. |
| **Revenue Model** | 1% to 4% contingency fee on collections. | **Hybrid Model**: Predictable bed-tiered SaaS subscription + ₱45–₱85 per cleared discharge + 1.2%–2.5% payment rail processing spread. |
