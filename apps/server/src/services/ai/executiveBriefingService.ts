import { jsonResponseSchema, parseAiResponse } from './structuredResponse';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { encounters } from '../../db/schema';
import { geminiClient } from './geminiClient';
import {
  ExecutiveBriefingResponse,
  ExecutiveBriefingResponseSchema,
  BRIEFING_SYSTEM_PROMPT,
  buildExecutiveBriefingPrompt
} from './prompts/briefingPrompts';
import { moneyCents } from '../statutoryWaterfall';

export interface GenerateExecutiveBriefingOptions {
  facilityId?: string;
  forceRefresh?: boolean;
  env?: Record<string, any>;
}

interface CachedBriefing {
  data: ExecutiveBriefingResponse;
  timestamp: number;
}

const briefingCache = new Map<string, CachedBriefing>();
const BRIEFING_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class ExecutiveBriefingService {
  async generateBriefing(options: GenerateExecutiveBriefingOptions = {}): Promise<ExecutiveBriefingResponse> {
    const { facilityId, forceRefresh } = options;
    const cacheKey = facilityId || 'default';

    if (!forceRefresh) {
      const cached = briefingCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < BRIEFING_TTL_MS) {
        return cached.data;
      }
    }

    let allEncountersQuery = db.select().from(encounters);
    const allEncounters = facilityId
      ? await allEncountersQuery.where(eq(encounters.facilityId, facilityId))
      : await allEncountersQuery;

    const activeInpatients = allEncounters.filter((e) => e.stage !== 'CLEARED_GATE_PASS');
    const today = new Date().toISOString().slice(0, 10);
    const dischargesToday = allEncounters.filter(e => e.stage === 'CLEARED_GATE_PASS' && e.updatedAt?.toISOString().slice(0, 10) === today).length;

    // Dwell times per stage
    const dwellStageMap: Record<string, { totalMins: number; count: number }> = {
      DOCTOR_PF_PENDING: { totalMins: 0, count: 0 },
      PHARMACY_RTS_AUDIT: { totalMins: 0, count: 0 },
      HMO_FINAL_LOA: { totalMins: 0, count: 0 },
      PENDING_SETTLEMENT: { totalMins: 0, count: 0 }
    };

    let totalElapsedMins = 0;
    for (const enc of activeInpatients) {
      const elapsed = enc.elapsedMinutes || 0;
      totalElapsedMins += elapsed;
      if (dwellStageMap[enc.stage]) {
        dwellStageMap[enc.stage].totalMins += elapsed;
        dwellStageMap[enc.stage].count += 1;
      }
    }

    const avgTat = activeInpatients.length > 0 ? totalElapsedMins / activeInpatients.length : 0;

    const dwellTimes: Record<string, number> = {
      DOCTOR_PF_PENDING: dwellStageMap.DOCTOR_PF_PENDING.count > 0 ? Math.round(dwellStageMap.DOCTOR_PF_PENDING.totalMins / dwellStageMap.DOCTOR_PF_PENDING.count) : 0,
      PHARMACY_RTS_AUDIT: dwellStageMap.PHARMACY_RTS_AUDIT.count > 0 ? Math.round(dwellStageMap.PHARMACY_RTS_AUDIT.totalMins / dwellStageMap.PHARMACY_RTS_AUDIT.count) : 0,
      HMO_FINAL_LOA: dwellStageMap.HMO_FINAL_LOA.count > 0 ? Math.round(dwellStageMap.HMO_FINAL_LOA.totalMins / dwellStageMap.HMO_FINAL_LOA.count) : 0,
      PENDING_SETTLEMENT: dwellStageMap.PENDING_SETTLEMENT.count > 0 ? Math.round(dwellStageMap.PENDING_SETTLEMENT.totalMins / dwellStageMap.PENDING_SETTLEMENT.count) : 0
    };

    // Calculate Trapped Revenue
    let trappedRevenueCents = 0;
    for (const enc of activeInpatients) {
      if (enc.stage === 'HMO_FINAL_LOA' || enc.stage === 'PENDING_SETTLEMENT') {
        trappedRevenueCents += moneyCents(Number(enc.remainingBalance || 0));
      }
    }
    const trappedRevenue = trappedRevenueCents / 100;

    const philhealthDarDays = null;
    const hmoDarDays = null;
    const reclaimedBedHours = null;

    const telemetryMetrics = {
      activeInpatients: activeInpatients.length,
      dischargesToday: dischargesToday,
      avgTatMinutes: avgTat,
      dwellTimes,
      philhealthDarDays,
      hmoDarDays,
      trappedRevenue,
      reclaimedBedHours
    };

    // Construct prompt
    const prompt = buildExecutiveBriefingPrompt(telemetryMetrics);

    const response = await geminiClient.generate({
      systemInstruction: BRIEFING_SYSTEM_PROMPT,
      prompt,
      responseMimeType: 'application/json',
      responseJsonSchema: jsonResponseSchema(ExecutiveBriefingResponseSchema),
      temperature: 0.2,
      env: options.env
    });

    const briefing = parseAiResponse(response, ExecutiveBriefingResponseSchema);
    briefing.modelUsed = response.modelUsed;
    briefing.generatedAt = new Date().toISOString();
    Object.assign(briefing.metricsSummary, {
      activeInpatients: activeInpatients.length,
      averageDischargeTatMinutes: avgTat,
      slaTargetMinutes: 45,
      trappedCapitalPesos: trappedRevenue,
      reclaimedBedHoursLast24h: null
    });
    briefingCache.set(cacheKey, { data: briefing, timestamp: Date.now() });
    return briefing;
  }
}

export const executiveBriefingService = new ExecutiveBriefingService();
