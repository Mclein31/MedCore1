# BUSINESS/business_model.md — The 4-Pillar Hybrid Revenue Architecture

> **Epistemic Status**: Commercial Architecture & Monetization Specification  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/BUSINESS/`)  
> **Cross-References**: [revenue_model.md](revenue_model.md), [stakeholders.md](stakeholders.md), [competitive_landscape.md](competitive_landscape.md), [RESEARCH/cedar_model.md](../RESEARCH/cedar_model.md)

---

## 1. Commercial Philosophy & Market Adaptation

[DECISION] In the United States, patient engagement platforms like Cedar monetize primarily through a combination of enterprise subscriptions and contingency take-rates (historically 1% to 4%) on patient out-of-pocket collections. In the Philippines, attempting to charge a 3% to 4% margin cut on gross patient payments would provoke immediate rejection from hospital Chief Financial Officers, because Philippine private hospitals operate on tight operating margins (often 6% to 12%) and carry heavy uncompensated charity/ward care burdens.

Furthermore, whereas Cedar engages patients weeks after care, the primary financial crisis in the Philippines occurs **intra-care and at discharge**—the urgent operational challenge of reconciling hospital chargemasters, PhilHealth All Case Rates, and private HMO LOAs to get the patient cleared to leave the room.

To align with this economic reality, MedCore deploys a **Hybrid Enterprise SaaS + Operational Value-Based Model**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                MEDCORE REVENUE ARCHITECTURE                            │
├───────────────────────────────────┬────────────────────────────────────────────────────┤
│ Revenue Stream                    │ Mechanism & Pricing Structure                      │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ 1. Core Enterprise SaaS Platform  │ Monthly recurring subscription tiered by hospital  │
│    (Predictable Base)             │ licensed bed capacity & annual patient volume.     │
│                                   │ • 100–199 Beds: ₱150,000 – ₱250,000 / month        │
│                                   │ • 200–499 Beds: ₱300,000 – ₱500,000 / month        │
│                                   │ • 500+ Beds / Groups: Custom Enterprise Contract   │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ 2. Per-Discharge Clearance Fee    │ Flat operational fee per fully reconciled and      │
│    (Volume-Linked Utility)        │ cleared discharge clearance.                       │
│                                   │ • ₱45 – ₱85 per cleared inpatient discharge        │
│                                   │ • Replaces hours of manual administrative overtime │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ 3. Digital Settlement Processing  │ Integrated payment convenience fee (1.2% – 2.5%)   │
│    (Cedar-Inspired Payment Rail)  │ on out-of-pocket transactions settled through      │
│                                   │ MedCore Patient Clarify (shared with gateways).    │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ 4. ClaimReady Denial Recovery     │ Optional outcome-based contingency fee (5%–8%)     │
│    (Value-Share Module)           │ on recovered or prevented PhilHealth RTH claims   │
│                                   │ above the hospital's historical baseline.          │
└───────────────────────────────────┴────────────────────────────────────────────────────┘
```

---

## 2. Detailed Breakdown of the Four Revenue Streams

### Stream 1: Core Enterprise SaaS Subscription (Predictable Base)
- **Target Customer**: Hospital enterprise (paid annually or monthly).
- **Scope of Coverage**: Unlocks the core MedCore platform:
  - HIS Integration Adapter (BizBox / Comlogik read-replica sync)
  - MedCore Reconcile & Ledger (tripartite statutory waterfall engine)
  - MedCore Flow & Verify (intake checking and room-tier limit evaluator)
  - Administrative billing and cashier consoles
  - System maintenance, security compliance (RA 10173), and regulatory table updates
- **Pricing Tiers**:
  - **Tier 1 (Community / Secondary Hospitals: 100–199 Beds)**: ₱150,000 to ₱250,000 / month.
  - **Tier 2 (Large Tertiary Private Hospitals: 200–499 Beds)**: ₱300,000 to ₱500,000 / month.
  - **Tier 3 (Flagship Academic Medical Centers / Hospital Groups: 500+ Beds)**: Custom enterprise pricing (e.g., ₱600,000 to ₱1,200,000+ / month for network-wide deployment).

### Stream 2: Per-Discharge Clearance Fee (Volume-Linked Utility)
- **Mechanism**: A recurring transactional fee charged for every completed, verified, and cleared inpatient discharge.
- **Pricing**: **₱45 to ₱85 per cleared discharge**.
- **Value Exchange**: Replaces 4 to 8 hours of manual clerical labor, telephone coordination, physical runner trips, and paper ledger reconciliation with an automated digital workflow completed in under 45 minutes. A 250-bed hospital with 1,000 monthly discharges pays ₱45,000 to ₱85,000 monthly, easily offset by hundreds of thousands of pesos in reclaimed administrative overtime and recovered bed-hours.

### Stream 3: Digital Settlement Processing Spread (Payment Rail)
- **Mechanism**: Integrated convenience / transaction interchange fee on out-of-pocket balances settled digitally through the **MedCore Patient Clarify** mobile web portal.
- [ASSUMPTION] **Pricing Spread**: **1.2% to 2.5% variable band** depending on the specific payment rail:
  - Direct QR Ph / Bank Rails: 1.2% to 1.5%
  - Mobile E-Wallets (GCash, Maya): 1.5% to 2.0%
  - Credit / Debit Cards (Visa, Mastercard): 2.0% to 2.5%
  - Medical BNPL / Installment financing: Partner referral margin (2.0% to 3.5%)
- **Margin Structure**: MedCore splits processing margins with underlying merchant aggregators (e.g., PayMongo, Maya Business, Xendit), netting a sustainable 0.4% to 0.8% net revenue take on all digital patient cash flows.

### Stream 4: ClaimReady Denial Recovery (Outcome-Based Value-Share)
- **Mechanism**: An optional, purely performance-based gainsharing fee applied to incremental revenues recovered through automated pre-flight PhilHealth auditing.
- **Pricing**: **5% to 8% contingency fee** on claims successfully paid that would have otherwise been forfeited or returned to hospital (RTH) based on the hospital’s audited historical baseline.
- **Executive Appeal**: CFOs eagerly adopt this module because it carries zero downside risk—MedCore only earns if trapped PhilHealth receivables are unlocked into realized cash flow.

---

## 3. Why This Model Works for Philippine Hospital CFOs

[DECISION] Hospital CFOs evaluate software investments through strict balance sheet and cash flow metrics. MedCore’s pricing structure succeeds where generic software fails:

1. **Self-Funding Operational ROI**: The reclaimed bed-hours alone generate millions of pesos in daily incremental room, surgical, and diagnostic revenue, paying for the monthly SaaS fee many times over.
2. **Predictable Budgeting**: Hospital leadership retains total control over software expenditure through predictable SaaS tiers, while variable fees scale strictly in tandem with hospital occupancy and actual discharge throughput.
3. **Alignment with Cash Realization**: By monetizing digital payment flow and denial recovery, MedCore's commercial success is directly tied to the hospital’s cash realization and patient satisfaction.
