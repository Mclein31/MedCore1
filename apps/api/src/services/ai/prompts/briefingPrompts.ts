import { z } from 'zod';

export const ExecutiveBriefingResponseSchema = z.object({
  modelUsed: z.string().optional(),
  generatedAt: z.string().describe('ISO timestamp of generation.'),
  briefingMarkdown: z
    .string()
    .describe('Executive-grade 3-minute briefing formatted in structured markdown.'),
  metricsSummary: z.object({
    activeInpatients: z.number().int(),
    averageDischargeTatMinutes: z.number(),
    slaTargetMinutes: z.number().default(45),
    reclaimedBedHoursLast24h: z.number().nullable(),
    trappedCapitalPesos: z.number(),
    criticalDepartmentBottleneck: z.string(),
  }),
  topRecommendations: z.array(
    z.object({
      priority: z.number().int().min(1).max(3),
      department: z.string(),
      actionText: z.string(),
      financialImpactPesos: z.number(),
    }),
  ),
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

export function buildExecutiveBriefingPrompt(metrics: {
  activeInpatients: number;
  dischargesToday: number;
  avgTatMinutes: number;
  dwellTimes: Record<string, number>;
  philhealthDarDays: number | null;
  hmoDarDays: number | null;
  trappedRevenue: number;
  reclaimedBedHours: number | null;
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
PhilHealth Days in AR: ${metrics.philhealthDarDays === null ? 'Not measured' : metrics.philhealthDarDays.toFixed(1) + ' days'}
HMO Days in AR: ${metrics.hmoDarDays === null ? 'Not measured' : metrics.hmoDarDays.toFixed(1) + ' days'}
Trapped Capital Awaiting Discharge Finalization: ₱${metrics.trappedRevenue.toFixed(2)}
Reclaimed Inpatient Bed-Hours: ${metrics.reclaimedBedHours === null ? 'Not measured' : metrics.reclaimedBedHours.toFixed(1) + ' hours'}

Do not invent values for unmeasured metrics. Use null for reclaimedBedHoursLast24h. Generate a concise, impactful 3-minute executive briefing JSON adhering to ExecutiveBriefingResponseSchema.`;
}
