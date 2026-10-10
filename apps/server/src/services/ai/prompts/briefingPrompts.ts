import { z } from 'zod';

export const ExecutiveBriefingResponseSchema = z.object({
  generatedAt: z.string().describe('ISO timestamp of generation.'),
  briefingMarkdown: z.string().describe('Executive-grade 3-minute briefing formatted in structured markdown.'),
  metricsSummary: z.object({
    activeInpatients: z.number().int(),
    averageDischargeTatMinutes: z.number(),
    slaTargetMinutes: z.number().default(45),
    reclaimedBedHoursLast24h: z.number(),
    trappedCapitalPesos: z.number(),
    criticalDepartmentBottleneck: z.string()
  }),
  topRecommendations: z.array(
    z.object({
      priority: z.number().int().min(1).max(3),
      department: z.string(),
      actionText: z.string(),
      financialImpactPesos: z.number()
    })
  )
});

export type ExecutiveBriefingResponse = z.infer<typeof ExecutiveBriefingResponseSchema>;

export const BRIEFING_SYSTEM_PROMPT = `You are the MedCore Executive RCM Intelligence Director and Hospital Operations Strategist.

YOUR MISSION:
Synthesize real-time inpatient census data, discharge stage dwell-time telemetry, Days in Accounts Receivable (DAR), PhilHealth claim processing velocity, and HMO approval latencies into a high-impact, 3-minute C-Suite Briefing for the Hospital Chief Executive Officer, Chief Financial Officer, and Chief Operating Officer.

DISCHARGE BOTTLENECK TAXONOMY & SLA CEILINGS:
1. Stage 1: DOCTOR_PF_PENDING (Target SLA: <= 40 minutes)
   - Bottleneck Cause: Attending physicians completing clinical charts or finalizing professional fee statements.
2. Stage 2: PHARMACY_RTS_AUDIT (Target SLA: <= 25 minutes)
   - Bottleneck Cause: Floor pharmacy reconciling unused IV medications, antibiotics, and surgical packs returned from nursing stations.
3. Stage 3: HMO_FINAL_LOA (Target SLA: <= 45 minutes)
   - Bottleneck Cause: External private payors delaying final approval codes, disputing line items, or manual portal adjustments.
4. Stage 4: PENDING_SETTLEMENT (Target SLA: <= 15 minutes)
   - Bottleneck Cause: Guarantors queuing at central cashiers or negotiating promissory note terms.
5. Overall Discharge TAT Ceiling: 45 to 60 minutes from May Go Home (MGH) declaration to CLEARED_GATE_PASS release.

FINANCIAL IMPACT LOGIC:
- Reclaimed Bed-Hours = Each hour compressed from discharge clearance translates into earlier bed availability for emergency room admissions, directly reducing ER boarders and boosting daily inpatient bed velocity.
- Trapped Capital = High-balance accounts stuck at HMO_FINAL_LOA or PENDING_SETTLEMENT where billing finalization has not occurred, inflating DAR.

EXECUTIVE TONE & STRUCTURE:
- Direct, decisive, metrics-focused executive prose.
- Highlights root cause, operational friction points, and specific department owners.
- Delivers Top 3 Actionable Interventions with concrete financial and operational returns.

OUTPUT FORMAT:
Generate valid JSON matching ExecutiveBriefingResponseSchema.`;

export const BRIEFING_FEW_SHOT_EXAMPLES = [
  {
    input: {
      activeInpatients: 184,
      dischargesToday: 28,
      avgTatMinutes: 114,
      dwellTimes: {
        DOCTOR_PF_PENDING: 32,
        PHARMACY_RTS_AUDIT: 88,
        HMO_FINAL_LOA: 42,
        PENDING_SETTLEMENT: 18
      },
      philhealthDarDays: 44.2,
      hmoDarDays: 58.7,
      trappedRevenue: 4850000.00,
      reclaimedBedHours: 64.5
    },
    output: {
      generatedAt: "2026-10-10T08:00:00.000Z",
      briefingMarkdown: `## ☀️ MedCore Executive RCM Briefing
**Target Audience**: Hospital Executive Committee (CEO / CFO / COO)
**Reporting Period**: Last 24 Hours | **Active Census**: 184 Inpatients

---

### 1. Executive Summary & Discharge Velocity
Overall discharge turnaround time is currently averaging **114 minutes**, exceeding the hospital's **45-minute operational target by +69 minutes**.

- **Primary Bottleneck**: **Inpatient Pharmacy (RTS Audit)** is responsible for **77% of all discharge delays**, averaging an unprecedented **88 minutes per patient** across 28 discharged cases.
- **Operational Drag**: ER inpatient boarding has surged to 12 patients in the holding area due to delayed bed turnarounds.
- **Bright Spot**: Parallelized multi-payer settlement unblocked **64.5 reclaimed bed-hours** over the last 24 hours.

---

### 2. Departmental Dwell Time Telemetry
| Discharge Stage | Current Dwell | Benchmark SLA | Variance | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Doctor PF Sign-Off** | 32 mins | 40 mins | -8 mins | 🟢 Within SLA |
| **Pharmacy RTS Audit** | **88 mins** | **25 mins** | **+63 mins** | 🔴 CRITICAL BREACH |
| **HMO Final LOA Code** | 42 mins | 45 mins | -3 mins | 🟡 At Risk |
| **Cashier / Settlement** | 18 mins | 15 mins | +3 mins | 🟡 Minor Variance |

---

### 3. Financial Exposure & Trapped Capital
- **Trapped Revenue**: **₱4,850,000.00** across 16 pending discharge dossiers awaiting pharmacy clearance.
- **Payor Aging**: HMO DAR has drifted to **58.7 days** (driven by Maxicare and Intellicare delayed e-LOA portals), while PhilHealth claims remain stabilized at **44.2 days**.

---

### 4. Top 3 Strategic Interventions
1. **Deploy Dedicated Pharmacy RTS Runner (Pharmacy Services)**:
   - Mandate dedicated pharmacy floor runners on 3rd and 5th floors between 09:00 and 13:00 to pick up unused meds immediately upon MGH tag.
   - *Estimated Impact*: Compresses TAT by 45 minutes; unlocks 14 ER bed admissions.
2. **Institute Digital Promissory Notes for Balances > ₱25k (Billing/Admitting)**:
   - Route patients with remaining out-of-pocket balances to the MedCore mobile 0% promissory note workflow under RA 9439.
   - *Estimated Impact*: ₱1.2M in immediate unblocked discharges; eliminates cashier queues.
3. **Escalate 48-Hour HMO Portal Delays (Managed Care)**:
   - Trigger automated MedCore batch appeals for 9 high-balance accounts with delayed LOA codes.
   - *Estimated Impact*: Recovers ₱2.4M in trapped receivables; compresses HMO DAR by 4.5 days.`,
      metricsSummary: {
        activeInpatients: 184,
        averageDischargeTatMinutes: 114,
        slaTargetMinutes: 45,
        reclaimedBedHoursLast24h: 64.5,
        trappedCapitalPesos: 4850000.00,
        criticalDepartmentBottleneck: "PHARMACY_RTS_AUDIT"
      },
      topRecommendations: [
        {
          priority: 1,
          department: "Pharmacy Services",
          actionText: "Deploy dedicated morning RTS runners to expedite medication returns.",
          financialImpactPesos: 1850000.00
        },
        {
          priority: 2,
          department: "Patient Billing",
          actionText: "Activate in-app RA 9439 zero-interest promissory note workflows to bypass cashier queues.",
          financialImpactPesos: 1200000.00
        },
        {
          priority: 3,
          department: "Managed Care Office",
          actionText: "Auto-batch 48-hour HMO LOA escalations to recover trapped receivables.",
          financialImpactPesos: 2400000.00
        }
      ]
    }
  }
];

export function buildExecutiveBriefingPrompt(metrics: {
  activeInpatients: number;
  dischargesToday: number;
  avgTatMinutes: number;
  dwellTimes: Record<string, number>;
  philhealthDarDays: number;
  hmoDarDays: number;
  trappedRevenue: number;
  reclaimedBedHours: number;
}): string {
  return `Synthesize the following 24-hour hospital RCM metrics into an executive C-suite briefing:

=== OPERATIONAL TELEMETRY ===
Active Inpatients: ${metrics.activeInpatients}
Discharges Cleared Today: ${metrics.dischargesToday}
Average Discharge Turnaround Time: ${metrics.avgTatMinutes.toFixed(1)} minutes (Benchmark SLA: 45 min)

=== STAGE DWELL TIMES (MINUTES) ===
- DOCTOR_PF_PENDING: ${metrics.dwellTimes.DOCTOR_PF_PENDING ?? 0}m
- PHARMACY_RTS_AUDIT: ${metrics.dwellTimes.PHARMACY_RTS_AUDIT ?? 0}m
- HMO_FINAL_LOA: ${metrics.dwellTimes.HMO_FINAL_LOA ?? 0}m
- PENDING_SETTLEMENT: ${metrics.dwellTimes.PENDING_SETTLEMENT ?? 0}m

=== FINANCIAL AGING & CAPITAL EXPOSURE ===
PhilHealth Days in AR: ${metrics.philhealthDarDays.toFixed(1)} days
HMO Days in AR: ${metrics.hmoDarDays.toFixed(1)} days
Trapped Capital Awaiting Discharge Finalization: ₱${metrics.trappedRevenue.toFixed(2)}
Reclaimed Inpatient Bed-Hours: ${metrics.reclaimedBedHours.toFixed(1)} hours

Generate a concise, impactful 3-minute executive briefing JSON adhering to ExecutiveBriefingResponseSchema.`;
}
