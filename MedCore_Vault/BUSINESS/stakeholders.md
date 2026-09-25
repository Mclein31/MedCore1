# BUSINESS/stakeholders.md — Multi-Stakeholder Incentive Alignment

> **Epistemic Status**: Ecosystem Stakeholder Dynamics & Incentive Mapping  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/BUSINESS/`)  
> **Cross-References**: [business_model.md](business_model.md), [revenue_model.md](revenue_model.md), [competitive_landscape.md](competitive_landscape.md)

---

## 1. The Multi-Stakeholder Tension Field

[DECISION] Healthcare in the Philippines is structurally adversarial. Hospitals, state insurers, commercial HMOs, independent doctors, and patients routinely operate with conflicting economic motives:

```
                      THE HEALTHCARE FINANCIAL CONFLICT MATRIX

           HOSPITALS                                         HMOs / PAYERS
   (Maximize revenue per bed;                       (Minimize claims loss ratio;
    pass consumables to patient)                     disallow hospital sundries)
             │                                                  │
             └───────────────────────► █ ◄──────────────────────┘
                                       █
                                 THE INPATIENT
                               (Caught in middle;
                             bears unannounced OOP)
                                       █
             ┌───────────────────────► █ ◄──────────────────────┐
             │                                                  │
    ATTENDING DOCTORS                                     PHILHEALTH
 (Maximize professional fee;                       (Enforce statutory ceilings;
 resist insurance fee caps)                        reject non-compliant eSOAs)
```

MedCore resolves these structural conflicts by aligning financial incentives around transparency, automated verification, and clean claims.

---

## 2. Comprehensive Stakeholder Alignment Analysis

### 1. Private Tertiary & Secondary Hospitals
- **Primary Economic Goal**: Maximize bed turnover velocity, maintain operating margins, accelerate cash collections, and minimize Days in Accounts Receivable (DAR).
- **Current Frustrations**: Trapped in ₱4B–₱10B PhilHealth backlogs; 4–8 hour discharge bed-blocks; 3%–7% bad-debt write-offs from uncollected promissory notes under RA 9439; staff overtime costs.
- **MedCore Alignment**:
  - Reclaims 300+ bed-hours daily for higher-margin admissions.
  - Drops PhilHealth RTH claim denials from 15–20% to <2%.
  - Lifts out-of-pocket cash collections by 25–40% at discharge.
  - Cuts billing clerical labor overhead by 40%.

### 2. Philippine Health Insurance Corporation (PhilHealth)
- **Primary Statutory Goal**: Ensure equitable Universal Health Care coverage, enforce compliance with All Case Rates / DRG packages, enforce No Balance Billing (NBB) for vulnerable citizens, and eliminate fraudulent or clerical billing errors.
- **Current Frustrations**: Inundated by millions of non-standardized eSOA submissions; high clerical re-work overhead reviewing deficient CF4 clinical abstracts; public and legislative scrutiny over payment delays.
- **MedCore Alignment**:
  - Pre-flight compliance scrubber guarantees 100% schema conformity with Circular 2023-0026 and eClaims 3.0.
  - Pre-validates ICD-10 diagnostic and RVS procedure pairings between CF2, CF4, and eSOA XML before filing.
  - Automatically enforces statutory First vs. Second Case Rate percentage splits.

### 3. Commercial Payers & Private HMOs (Maxicare, Intellicare, Medicard, PhilCare)
- **Primary Economic Goal**: Control claims medical loss ratios (MLR), eliminate hospital chargemaster inflation, enforce corporate policy Maximum Benefit Limits (MBL), and reduce member churn.
- **Current Frustrations**: Managing massive call centers to handle hospital LOA requests; arguing over disallowed PPE and consumable sundries; 33.8% increase in formal consumer disputes at the Insurance Commission (under RA 11765).
- **MedCore Alignment**:
  - Strictly enforces the statutory "PhilHealth-First" rule, preventing improper cost-shifting onto the private insurer.
  - Replaces manual phone/fax LOA queues with automated electronic LOA adjudication.
  - Provides pre-cleansed chargemaster feeds mapped to payer exclusion lists, eliminating post-care billing disputes.

### 4. Attending Independent Physicians & Specialists
- **Primary Professional Goal**: Protect clinical autonomy, bill fair professional fees, ensure prompt hospital fee disbursement, and avoid administrative paperwork.
- **Current Frustrations**: Lost paper PF slips; repeated phone calls from billing clerks questioning their fees; delayed payment disbursements from the cashier.
- **MedCore Alignment**:
  - Lightweight mobile PF portal allows 1-click electronic fee confirmation from the doctor's smartphone.
  - Transparent visibility into patient HMO fee caps enables doctors to accept accredited rates or agree on excess PF transparently upfront.
  - Accelerated discharge settlement leads directly to faster PF disbursements into doctor bank accounts.

### 5. Inpatient / Patient Family (Guarantor)
- **Primary Consumer Goal**: Transparent pricing, zero discharge delays, plain-language explanations of insurance coverage, and flexible digital payment options.
- **Current Frustrations**: Trapped in hospital rooms for 4 to 8 hours post-clearance; cryptic dot-matrix paper bills; surprise ₱25,000+ bills for disallowed supplies and excess doctor fees; high-friction cashier queues.
- **MedCore Alignment**:
  - Mobile web running bill accessible in real time throughout the hospital stay.
  - Plain-language translation of cryptic codes and exclusion reasons.
  - Discharge clearance executed in under 30 minutes.
  - 1-click digital checkout via QR Ph, GCash, Maya, and structured digital promissory installments.

### 6. Regulatory Bodies (Insurance Commission, DOH, National Privacy Commission)
- **Primary Regulatory Mandate**: Enforce consumer protection (RA 11765), protect patient rights against illegal detention (RA 9439), prevent illegal deposit demands (RA 10932), and safeguard personal health information (RA 10173).
- **MedCore Alignment**:
  - Transparent digital statements and automated digital promissory notes ensure full statutory compliance across all regulatory bodies.
  - Enterprise AES-256 field-level encryption and strict role-based access control (RBAC) satisfy NPC circulars.
