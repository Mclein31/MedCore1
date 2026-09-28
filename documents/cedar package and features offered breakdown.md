# Cedar Healthcare (Cedar Cares, Inc.): Packaging, Commercialization & Feature Breakdown

**Analyst**: Senior Healthcare Technology Market Researcher & Competitive Intelligence Analyst  
**Subject**: Cedar Cares, Inc.  
**Domain**: Enterprise Patient Financial Engagement & Revenue Cycle Technology  
**Valuation / Scale**: $3.2B Valuation (Series D, 2021); ~$102M Est. Revenue (2023); 400K+ AI-assisted calls (2026)  
**Primary Integration Partners**: Epic Systems (MyChart / App Orchard), Stripe (Payments), Twilio (Voice / IVR)  

---

## 1. Executive Summary

Cedar (Cedar Cares, Inc.) is the leading US enterprise patient financial engagement platform. Founded in 2016 by Florian Otto (CEO) and Arel Lidow, the company has raised over $350M in venture capital from Tiger Global, Andreessen Horowitz, Thrive Capital, and Founders Fund, and acquired payer-integration platform **OODA Health** for $425M in May 2021.

### Key Commercialization Findings:
1. **No Public Subscription Tiers**: Cedar **does not publicly disclose standardized pricing or subscription tiers** (e.g., "Basic / Pro / Enterprise"). All pricing is custom-quoted via enterprise sales and RFP processes.
2. **Hybrid SaaS + Contingency Model**:
   * **Base SaaS Subscription**: Recurring monthly/annual license fees tied to health system size, patient encounter volume, and EHR integrations.
   * **Outcome-Based / Collections Fee**: Contracts for its flagship product (*Cedar Pay*) frequently incorporate a contingency fee reported between **1.0% and 4.0% of total patient collections**.
3. **Zero Patient Fees**: Cedar does not charge convenience or transaction fees to patients. Payment processing is absorbed or paid by the provider system.
4. **GPO Distribution**: Enterprise purchasing is accelerated via a national group purchasing agreement with **Premier, Inc.**, offering pre-negotiated terms across ~4,400 US hospitals.

---

## 2. Product Architecture & Ecosystem

Cedar’s platform spans the entire patient care continuum, underpinned by an intelligence and agentic AI foundation:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE CEDAR PRODUCT ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                               PATIENT JOURNEY                               │
│    PRE-VISIT               INTRA-CARE / ADMISSION              POST-VISIT   │
│  ┌───────────┐           ┌────────────────────────┐          ┌────────────┐ │
│  │ Cedar Pre │ ────────> │     Point of Care      │ ───────> │ Cedar Pay  │ │
│  └───────────┘           └────────────────────────┘          └────────────┘ │
│        │                                                            │       │
│        ▼                                                            ▼       │
│  ┌───────────┐                                               ┌────────────┐ │
│  │Cedar Cover│ <═══════════════════════════════════════════> │CedarSupport│ │
│  └───────────┘        (Medicaid / Coverage Safety Net)       └────────────┘ │
├────────┴────────────────────────────────────────────────────────────┴───────┤
│                     AUTONOMOUS AGENT & VOICE LAYER                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ KORA PLATFORM (Agentic AI Voice, Outbound Dialing, Two-Way SMS Dialog)│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                      DATA SCIENCE & INTELLIGENCE CORE                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CEDAR INTELLIGENCE (80+ Attribute Profiler, Bill Navigator, Copilot)  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                    EXTERNAL INFRASTRUCTURE & PARTNERS                       │
│  • EHRs: Epic MyChart (App Orchard/FHIR), Oracle Health/Cerner, athenaOne   │
│  • Payments: Stripe Infrastructure (Connect, Link, Terminal, Apple Pay, ACH)│
│  • Telephony: Twilio (ConversationRelay, Voice API, IVR)                    │
│  • Payers: Real-Time Commercial EOB Ingestion (ex-OODA Health Engine)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Product Capabilities & Modules

### 3.1. Cedar Pay (Flagship Billing & Payment Engine)
* **Target Customers**: Enterprise health systems, hospital networks, large multispecialty medical groups.
* **Core Capabilities**:
  * **Digital Statement Delivery**: Replaces paper bills with mobile-responsive billing summaries sent via SMS and email.
  * **Plain-Language Itemization**: Explains charges clearly, eliminating confusing hospital chargemaster jargon.
  * **Single Consolidated Bill**: Unifies hospital facility fees and attending physician fees into one statement.
  * **Payment Flexibility**: One-click checkout via **Stripe Link**, Apple Pay, Google Pay, credit/debit cards, and bank ACH.
  * **HSA / FSA Support**: Dedicated workflows allowing patients to utilize pre-tax healthcare savings accounts.
  * **Adaptable Payment Plans**: Automated installment authoring with provider-defined guardrails (minimum payment thresholds, maximum durations), automated recurring payments (Auto-Pay), and digital promise-to-pay commitments.
  * **Machine Learning Discounts**: Dynamically surfaces prompt-pay courtesy discounts calibrated to a patient's capacity to pay.

### 3.2. Cedar Pre (Pre-Service Financial Clearance & Intake)
* **Target Customers**: Acute-care hospitals, ambulatory surgery centers, outpatient clinics.
* **Core Capabilities**:
  * **Digital Check-In**: Pre-registration completed on the patient's smartphone prior to arrival.
  * **Insurance Card Capture**: Optical character recognition (OCR) and photo capture of insurance cards.
  * **Pre-Service Cost Estimates**: Transparent out-of-pocket estimates generated before care (partnered with Waystar's estimation engine).
  * **Upfront Copay Collection**: Digital collection of copays and deposits prior to clinical encounters.
  * **Appointment Reminders**: Automated SMS/email reminders engineered to reduce clinic no-show rates.

### 3.3. Cedar Cover (Coverage Discovery & Financial Aid Safety Net)
* **Target Customers**: Safety-net hospitals, academic medical centers, health systems with high uninsured/underinsured populations.
* **Core Capabilities**:
  * **Coverage Discovery**: Algorithmic identification of active third-party commercial insurance or Medicaid coverage that patients omitted during registration.
  * **Medicaid & ACA Enrollment**: Self-service screening and digital enrollment for Medicaid and ACA Marketplace plans (partnered with **Fortuna Health**).
  * **Proactive Medicaid Renewals**: Automated engagement tracking redetermination dates to prevent coverage churn.
  * **Denials Resolution**: Direct digital workflows helping patients resolve Coordination of Benefits (COB) denials with insurers.
  * **Medication Assistance**: Identifies and links eligible patients to pharmaceutical financial assistance programs.

### 3.4. Cedar Support (Hybrid Contact Center & Early-Out Services)
* **Target Customers**: Health systems facing administrative staffing shortages, clinician staffing groups.
* **Core Capabilities**:
  * **Agent Copilot**: Real-time staff desktop application surfacing patient interaction history, previous payments, insurance status, and recommended resolution steps.
  * **Hybrid Escalation**: Automates routine billing inquiries while seamlessly transferring complex disputes to live representatives.
  * **Interactive Voice Response (IVR)**: Phone payment automation built using Twilio Voice API and Stripe Pay Connector.

### 3.5. Cedar Intelligence (Underlying AI & Personalization Core)
* **Target Customers**: Built-in foundational layer across all Cedar solutions.
* **Core Capabilities**:
  * **80+ Attribute Profiler**: Analyzes patient demographics, bill magnitude, clinical visit context, past payment velocity, communication responsiveness, and sentiment.
  * **Bill Navigator**: Generative AI feature providing conversational explanations of complex medical bills directly within the patient UI (e.g., answering *"Why is this visit higher than my previous one?"*).
  * **Channel & Cadence Optimization**: Predicts whether a patient responds best to SMS, email, or paper, and determines the optimal time of day to send notices.

### 3.6. Kora Platform (Agentic AI Voice & Messaging)
* **Target Customers**: High-volume health systems, emergency medicine staffing groups, hospitalist networks.
* **Core Capabilities**:
  * **Autonomous Inbound Voice (Kora Voice)**: AI voice agent built on **Twilio's ConversationRelay** capable of handling natural, conversational patient billing calls with real-time speech recognition and interruption handling.
  * **Account Authentication**: Verifies patient identity securely over the phone.
  * **Charge Explanation & Dispute Handling**: Conversational explanations of balances, deductibles, and insurance adjustments.
  * **Payment Execution**: Collects credit card and ACH payments autonomously during telephone calls.
  * **Kora Outbound**: Proactively calls patients eligible for payment resolution at algorithmically optimized times.
  * **Two-Way Conversational SMS**: AI-managed text messaging answering billing questions and coordinating payment plans.

---

## 4. Package & Feature Matrix

*Cedar does not offer standardized tiers. The matrix below defines how capabilities are structured across Cedar’s modular products:*

| Product / Module | Pricing Structure | Target Customer | Core Features | Advanced Capabilities | AI / ML Features | Payment Capabilities | Coverage Features | Support Capabilities |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cedar Pay** | Enterprise Custom (Base SaaS + 1%–4% Collections Fee) | Health Systems, Hospital Networks, Medical Groups | Digital statements via SMS/Email; Itemized bill breakdowns | Unified billing (hospital + physician); Epic MyChart SSO | ML prompt-pay discounts; Predictive send-time optimization | Credit/Debit, ACH, Apple Pay, Stripe Link, payment plans, auto-pay | Commercial EOB ingestion and alignment | Self-service dispute and inquiry logging |
| **Cedar Pre** | Enterprise Module / GPO Bundle | Acute Hospitals, Ambulatory Surgery Centers | Pre-registration forms; Mobile insurance card photo capture | Direct EHR check-in sync; Clinical pre-intake questionnaires | No-show risk scoring algorithms | Pre-service copay and deposit collection | Real-time insurance eligibility checks; Out-of-pocket estimator | Automated appointment confirmation and nudges |
| **Cedar Cover** | Enterprise Add-On (SaaS + Contingency on Converted Aid) | Safety-Net Hospitals, Academic Medical Centers | Digital financial assistance application; Affordability portal | Multi-state Medicaid matching; Workflow handoffs to staff | Coverage discovery algorithms (hidden insurance identification) | Sets affordable residual payment balances | Self-service Medicaid/ACA enrollment; COB denial appeals | Live chat and phone assistance with certified counselors |
| **Cedar Support** | Enterprise Add-On / Contact Center Service Fee | Health Systems with staffing shortages, Clinician Groups | Unified agent desktop; Patient communication history tracking | Full outsourced "early out" customer support services | **Agent Copilot** (surfaces real-time account context and recommendations) | Secure phone payments via IVR (Twilio + Stripe Connector) | Staff escalation for unverified insurance | Dedicated human call center agents; Omnichannel voice/SMS/email |
| **Cedar Intelligence** | Platform Foundation (Included across all deployments) | All Cedar Enterprise Customers | Centralized patient data model; Continuous telemetry ingestion | Cross-platform behavioral optimization; Propensity-to-pay profiling | **Bill Navigator** (generative bill explainer); Analyzes 80+ patient attributes | Dynamic payment plan duration matching | Intelligent routing to financial aid based on capacity to pay | Sentiment analysis on incoming communications |
| **Kora Platform** | Enterprise AI Upgrade / Usage-Based per Resolution | Large Health Systems, High-Volume Emergency Groups | Inbound AI voice call handling; Two-way conversational SMS | Automated patient identity authentication; Insurance detail capture via voice | **Agentic Voice Agent** (Twilio ConversationRelay); Natural speech synthesis | Collects phone payments via autonomous AI dialogue | Captures and updates new insurance policy numbers over the phone | Autonomous tier-1 billing inquiry resolution; Warm handoff to human agents |

---

## 5. Customer Segments & Deployment Profiles

1. **Large Enterprise Health Systems & Academic Medical Centers**:
   * *Examples*: Novant Health (15 hospitals), ChristianaCare (1,000+ beds), Yale New Haven Health, Sanford Health (47 hospitals), Hartford HealthCare.
   * *Deployment*: Full Platform (Cedar Pre + Cedar Pay + Cedar Cover + Kora). Deep bidirectional integration into **Epic MyChart** via single sign-on (SSO).
   * *Primary Objective*: Unify complex hospital and doctor fees into a single bill; lower cost-to-collect; satisfy federal price transparency mandates.
2. **Large Independent Medical Groups & Ambulatory Networks**:
   * *Examples*: Summit Health (VillageMD, 2,800+ providers), Westmed Medical Group, Crystal Run Healthcare.
   * *Deployment*: Cedar Pre + Cedar Pay.
   * *Primary Objective*: Accelerate check-in throughput, automate upfront copay capture, and reduce patient bad debt.
3. **Multispecialty Clinician Staffing & Emergency Medicine Groups**:
   * *Examples*: ApolloMD (emergency, anesthesia, hospitalist staffing across 100+ facilities).
   * *Deployment*: Cedar Pay + Kora Platform (Kora Voice & Outbound).
   * *Primary Objective*: Resolve patient confusion over separate physician bills ("two-bill confusion"); automate inbound billing call spikes; achieve 40%+ collection rate lifts.

---

## 6. Business Model & Commercialization Analysis

### Epistemic Categorization:

#### [VERIFIED] (Directly Documented by Cedar / Official Sources):
* **Custom Enterprise B2B Contracts**: Cedar does not offer public list pricing or self-serve tiers.
* **Zero Patient Transaction Fees**: Cedar never charges convenience or card processing surcharges to patients.
* **GPO Procurement Channel**: Cedar holds a national group purchasing agreement with **Premier, Inc.** for pre-negotiated health system deployment.
* **Core Technology Dependencies**: Core payments run on **Stripe Infrastructure**; voice and telephony run on **Twilio**.

#### [REPORTED] (Documented by Credible Third Parties & Executive Statements):
* **Collections Contingency Fee**: Cedar Pay contracts frequently include a performance fee reported between **1.0% and 4.0% of total patient collections**.
* **Dual-Component Pricing**: Contracts combine a recurring base SaaS license fee (per bed, facility, or encounter) with performance-based collection incentives.
* **Documented ROI**: Clients report a **30% to 35% increase in patient payments** and a **40%+ reduction in time to payment resolution**.
* **Annual Scale**: 2023 estimated revenue was reported at ~$102M (Contrary Research).

#### [INFERRED] (Analyst Deduction based on Market Architecture):
* **Implementation Fees**: Enterprise EHR integrations with Epic/Cerner carry substantial upfront onboarding fees ($100K–$500K+ depending on scope).
* **Payment Processing Margins**: Cedar likely captures a net merchant processing spread on card/ACH volume processed via Stripe Connect.
* **Kora Usage Tiers**: Kora Platform is likely monetized through monthly call-volume bands or per-resolved-interaction fees benchmarked against the cost of human call center labor.
* **Coverage Conversion Fees**: Cedar Cover likely charges a contingency fee on uncompensated care converted into retroactive Medicaid or commercial reimbursement.

---

## 7. MedCore Strategic Benchmarking Insights

While Cedar is an outstanding design benchmark for consumer-grade financial UX, **a direct copy of Cedar's commercial and operational model would fail in the Philippines.**

### Comparative Reality: Cedar (US) vs. MedCore (Philippines)

| Dimension | Cedar (United States) | MedCore (Philippines) |
| :--- | :--- | :--- |
| **Financial Crisis Point** | **Post-Visit (30–90 days post-care)**. Patients leave freely; bills are mailed months later. | **Pre-Discharge Confinement**. Patients cannot leave without billing clearance; 4–8 hour discharge bottleneck. |
| **Adjudication Architecture** | ANSI X12 837/835 EDI transactions, high deductibles, copays, HSA/FSA. | Strict Statutory Deduction Cascade: $\text{VAT} \rightarrow \text{SC/PWD} \rightarrow \text{PhilHealth} \rightarrow \text{HMO} \rightarrow \text{Net Due}$. |
| **Credit Infrastructure** | Centralized credit scoring (FICO/Experian) drives propensity-to-pay models. | Unbanked / Mobile Wallet Economy (GCash, Maya, QR Ph); RA 9439 statutory promissory notes. |
| **Commercialization Feasibility**| 1%–4% contingency take-rate on gross collections accepted by US providers. | Thin hospital margins; gross % cuts rejected. Requires predictable SaaS + per-cleared-discharge fee. |

### Strategic Lessons for MedCore:

1. **Adopt Cedar’s "Plain-Language Bill Explainer"**: MedCore’s **"Why Do I Owe This?" Drawer** directly mirrors Cedar’s *Bill Navigator*, explaining charges in plain language and detailing why room differentials or doctor excess fees are excluded from PhilHealth/HMO coverage.
2. **Replicate Payer-Provider Bill Unification**: Cedar spent $425M acquiring OODA Health to align bills with insurer EOBs. MedCore is designed from Day 1 as this unified middleware, synchronizing PhilHealth All Case Rates (ACR) and HMO eLOAs with hospital chargemasters.
3. **Deploy Zero-Install Mobile Access**: Like Cedar, MedCore must avoid native app downloads. The **Patient Clarify PWA** must trigger instantly via SMS magic links sent directly to the patient’s smartphone.
4. **Shift Focus from Post-Care Collections to Intra-Care Discharge Clearance**: While Cedar monetizes 30-day post-care receivables, MedCore’s primary value proposition is compressing the **4–8 hour hospital discharge clearance to < 45 minutes**, unlocking massive bed-turnover capacity for hospital CFOs.
5. **Implement a Viable Philippine Pricing Model**: Instead of Cedar’s 1%–4% gross collections fee, MedCore should deploy:
   * *Bed-Tiered SaaS Subscription* (e.g., 100-bed, 250-bed tiers).
   * *Per-Cleared-Discharge Fee* (₱45 to ₱85 per cleared digital gate pass).
   * *Payment Processing Spread* (1.2% to 2.2% spread on GCash/Maya/QR Ph checkout).

---

## 8. Verified Sources & Citations

1. **Contrary Research**: *Cedar Business Breakdown & Founding Story* (Published March 20, 2025) — https://research.contrary.com/reports/cedar
2. **Cedar Official Website**: *Platform & Solutions Overview* (Accessed September 2026) — https://www.cedar.com/platform/
3. **PRNewswire / Cedar**: *Cedar Unveils Kora, an AI Voice Agent to Help Drive Empathy and Efficiency in Patient Billing* (Published April 29, 2025) — [https://www.prnewswire.com/news-releases/cedar-unveils-kora-an-ai-voice-agent...](https://www.prnewswire.com/news-releases/cedar-unveils-kora-an-ai-voice-agent-to-help-drive-empathy-and-efficiency-in-patient-billing-302441113.html)
4. **Fierce Healthcare**: *Cedar Launches Kora Platform to Expand Agentic AI Capabilities in Healthcare* (Published August 2026) — https://www.fiercehealthcare.com/ai-and-machine-learning/cedar-launches-kora-platform
5. **AlleyWatch**: *Florian Otto on Cedar’s Series A and Aligned Incentives Business Model* (Published Dec 2017) — https://alleywatch.com/2017/12/cedar-medical-billing-patients-florian-otto/
6. **Stripe Case Studies**: *Cedar Partners with Stripe for Modern Patient Payments* (Accessed 2025) — https://stripe.com/customers/cedar
7. **Newswire**: *Cedar Awarded Group Purchasing Agreement with Premier, Inc.* (Published Nov 2022) — https://www.newswire.com/news/cedar-awarded-group-purchasing-agreement-with-premier-inc-21873722
8. **KLAS Research**: *Patient Financial Engagement Performance Report* (2023–2024) — https://klasresearch.com/report/patient-financial-engagement-2023/3062
9. **Cedar Official Case Study**: *ApolloMD Improves Collections and Patient Satisfaction with Cedar* (2025) — https://www.cedar.com/case-studies/apollomd/
10. **Cedar Patient FAQ**: *Patient Payment Terms and Processing Policies* (Accessed 2026) — https://www.cedar.com/patient-faq/
