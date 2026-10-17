import { minutesBetween } from '@medcore/domain';
import { and, eq, isNull } from 'drizzle-orm';
import type { DbOrTx } from '../../db/client';
import { encounters, ledgers } from '../../db/schema';
import type { AiConfig } from '../../env';
import { AI_CACHE_TTL, cachedAiResult } from './aiResultCache';
import { geminiClient } from './geminiClient';
import {
  BRIEFING_SYSTEM_PROMPT,
  buildExecutiveBriefingPrompt,
  type ExecutiveBriefingResponse,
  ExecutiveBriefingResponseSchema,
} from './prompts/briefingPrompts';
import { jsonResponseSchema, parseAiResponse, validateAiResult } from './structuredResponse';

export interface GenerateExecutiveBriefingOptions {
  db: DbOrTx;
  facilityId: string;
  forceRefresh?: boolean;
  userId?: string;
  aiConfig?: AiConfig;
}

export class ExecutiveBriefingService {
  async generateBriefing(options: GenerateExecutiveBriefingOptions): Promise<ExecutiveBriefingResponse> {
    const { db, facilityId, forceRefresh, aiConfig } = options;
    const now = new Date();

    const rows = await db
      .select({ encounter: encounters, ledger: ledgers })
      .from(encounters)
      .leftJoin(ledgers, eq(ledgers.encounterId, encounters.id))
      .where(and(eq(encounters.facilityId, facilityId), isNull(encounters.voidedAt)));

    const activeInpatients = rows.filter((r) => r.encounter.stage !== 'CLEARED');
    const today = now.toISOString().slice(0, 10);
    const dischargesToday = rows.filter(
      (r) => r.encounter.stage === 'CLEARED' && r.encounter.clearedAt?.toISOString().slice(0, 10) === today,
    ).length;

    const dwellStageMap: Record<string, { totalMins: number; count: number }> = {
      DOCTOR_PF_PENDING: { totalMins: 0, count: 0 },
      PHARMACY_RTS_AUDIT: { totalMins: 0, count: 0 },
      HMO_FINAL_LOA: { totalMins: 0, count: 0 },
      PENDING_SETTLEMENT: { totalMins: 0, count: 0 },
    };

    let totalElapsedMins = 0;
    let mghCount = 0;
    for (const { encounter: enc } of activeInpatients) {
      const elapsed = enc.mghOrderedAt
        ? minutesBetween(enc.mghOrderedAt, now)
        : minutesBetween(enc.stageEnteredAt, now);
      if (enc.mghOrderedAt) {
        totalElapsedMins += elapsed;
        mghCount += 1;
      }
      if (dwellStageMap[enc.stage]) {
        dwellStageMap[enc.stage]!.totalMins += elapsed;
        dwellStageMap[enc.stage]!.count += 1;
      }
    }

    const avgTat = mghCount > 0 ? totalElapsedMins / mghCount : 0;

    const dwellTimes: Record<string, number> = {
      DOCTOR_PF_PENDING:
        dwellStageMap.DOCTOR_PF_PENDING!.count > 0
          ? Math.round(dwellStageMap.DOCTOR_PF_PENDING!.totalMins / dwellStageMap.DOCTOR_PF_PENDING!.count)
          : 0,
      PHARMACY_RTS_AUDIT:
        dwellStageMap.PHARMACY_RTS_AUDIT!.count > 0
          ? Math.round(dwellStageMap.PHARMACY_RTS_AUDIT!.totalMins / dwellStageMap.PHARMACY_RTS_AUDIT!.count)
          : 0,
      HMO_FINAL_LOA:
        dwellStageMap.HMO_FINAL_LOA!.count > 0
          ? Math.round(dwellStageMap.HMO_FINAL_LOA!.totalMins / dwellStageMap.HMO_FINAL_LOA!.count)
          : 0,
      PENDING_SETTLEMENT:
        dwellStageMap.PENDING_SETTLEMENT!.count > 0
          ? Math.round(dwellStageMap.PENDING_SETTLEMENT!.totalMins / dwellStageMap.PENDING_SETTLEMENT!.count)
          : 0,
    };

    let trappedRevenueCents = 0;
    for (const { encounter: enc, ledger } of activeInpatients) {
      if (enc.stage === 'HMO_FINAL_LOA' || enc.stage === 'PENDING_SETTLEMENT') {
        trappedRevenueCents += ledger?.balanceCents ?? 0;
      }
    }
    const trappedRevenue = trappedRevenueCents / 100;

    const telemetryMetrics = {
      activeInpatients: activeInpatients.length,
      dischargesToday,
      avgTatMinutes: avgTat,
      dwellTimes,
      philhealthDarDays: null,
      hmoDarDays: null,
      trappedRevenue,
      reclaimedBedHours: null,
    };

    const prompt = buildExecutiveBriefingPrompt(telemetryMetrics);

    return cachedAiResult({
      module: 'executive-briefing',
      scope: { facilityId, userId: options.userId },
      input: {
        prompt,
        system: BRIEFING_SYSTEM_PROMPT,
        schema: jsonResponseSchema(ExecutiveBriefingResponseSchema),
        today,
      },
      ttlMs: AI_CACHE_TTL.briefing,
      aiConfig,
      forceRefresh,
      validate: validateAiResult(ExecutiveBriefingResponseSchema.required({ modelUsed: true })),
      generate: async () => {
        const response = await geminiClient.generate({
          systemInstruction: BRIEFING_SYSTEM_PROMPT,
          prompt,
          responseMimeType: 'application/json',
          responseJsonSchema: jsonResponseSchema(ExecutiveBriefingResponseSchema),
          temperature: 0.2,
          aiConfig,
        });

        const briefing = parseAiResponse(response, ExecutiveBriefingResponseSchema);
        briefing.modelUsed = response.modelUsed;
        briefing.generatedAt = new Date().toISOString();
        Object.assign(briefing.metricsSummary, {
          activeInpatients: activeInpatients.length,
          averageDischargeTatMinutes: avgTat,
          slaTargetMinutes: 45,
          trappedCapitalPesos: trappedRevenue,
          reclaimedBedHoursLast24h: null,
        });
        return { ...briefing, modelUsed: response.modelUsed };
      },
    });
  }
}

export const executiveBriefingService = new ExecutiveBriefingService();
