import { observeAiCache, currentAiCacheOutcome } from '../services/ai/aiResultCache';
import { CORA_LANGUAGE_IDS } from '../../../shared/coraLanguage';
import { AiInferenceError } from '../services/ai/geminiClient';
import { encounterAccessCondition } from '../utils/encounterAccess';
import { encounters } from '../db/schema';
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, requireRole } from '../middleware/auth';
import { apiError } from '../middleware/error';
import { coraService } from '../services/ai/coraService';
import { claimsForensicService } from '../services/ai/claimsForensicService';
import { hmoAppealService } from '../services/ai/hmoAppealService';
import { executiveBriefingService } from '../services/ai/executiveBriefingService';
import { ocrService } from '../services/ai/ocrService';
import { db } from '../db';
import { aiAuditLogs } from '../db/schema';
import { getClientIp } from '../utils/clientIp';

const aiApp = new Hono();
aiApp.use('*', (c, next) => observeAiCache(outcome => c.header('X-AI-Cache', outcome), next));
// Gemini calls cost real money, so each caller gets AI_LIMITER's budget (10 per 60 s on Workers).
// The binding is absent in the Node standalone server, where no limit applies.
type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };
aiApp.use('*', async (c, next) => {
  const limiter = (c.env as any)?.AI_LIMITER as RateLimiter | undefined;
  if (!limiter || c.req.method !== 'POST') return next();
  const user = c.get('user');
  const key = user ? `user:${user.id}` : `ip:${getClientIp(c)}`;
  const { success } = await limiter.limit({ key });
  if (!success) return apiError(c, 429, 'AI_RATE_LIMITED', 'Too many AI requests. Please wait a minute and try again.');
  return next();
});
const STAFF_AI_ROLES = ['BILLING_SPECIALIST', 'CLAIMS_ENCODER', 'HMO_COORDINATOR', 'HOSPITAL_CFO', 'ATTENDING_PHYSICIAN'];
function inferenceError(c: any, err: unknown, code: string, message: string) {
  if (err instanceof AiInferenceError) {
    // Keep operational diagnostics useful without logging prompts, patient data, or provider response bodies.
    console.warn('[AI generation unavailable]', { operation: code, errorCode: err.code, status: err.status });
    return apiError(c, err.status as any, err.code, err.message);
  }
  return apiError(c, 500, code, message);
}

import { getAiConfig } from '../config/aiConfig';

const isValidUuid = (val?: string): string | undefined => {
  if (typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
    return val;
  }
  return undefined;
};

// Helper to safely write audit log without throwing
async function recordAiAudit(data: {
  facilityId?: string;
  encounterId?: string;
  userId?: string;
  module: string;
  action: string;
  modelUsed?: string;
  latencyMs?: number;
  rthRiskScore?: string;
  status: string;
  errorMessage?: string;
  env?: Record<string, any>;
}) {
  try {
    if (db && typeof db.insert === 'function') {
      const config = getAiConfig(data.env);
      await db.insert(aiAuditLogs).values({
        facilityId: isValidUuid(data.facilityId),
        encounterId: isValidUuid(data.encounterId),
        userId: isValidUuid(data.userId),
        module: data.module,
        action: data.action,
        modelUsed: data.modelUsed || config.geminiModel,
        latencyMs: data.latencyMs,
        rthRiskScore: data.rthRiskScore,
        status: data.status,
        errorMessage: data.errorMessage,
        phiScrubbed: true,
        responseSummary: currentAiCacheOutcome() ? `AI cache: ${currentAiCacheOutcome()}` : undefined
      });
    }
  } catch (err) {
    // Non-blocking telemetry
    console.warn('[recordAiAudit] Telemetry audit insert skipped:', (err as any)?.name || 'Error');
  }
}

// ----------------------------------------------------------------------
// 1. Cora Patient Concierge Chat
// ----------------------------------------------------------------------
const coraChatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(2000),
  conversation: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) }).strict()).max(8).optional().default([]),
  language: z.enum(CORA_LANGUAGE_IDS).optional().default('fil'),
  mode: z.enum(['GENERAL', 'WHY_DO_I_OWE', 'DISCHARGE_STATUS', 'PROMISSORY_ASSISTANCE', 'DISPUTE_DRAFT']).optional().default('GENERAL'),
  encounterId: z.string().max(100).optional()
}).refine(body => body.conversation.reduce((n, t) => n + t.content.length, 0) <= 8000, 'Conversation is too long.');

aiApp.post('/cora/chat', zValidator('json', coraChatSchema), async (c) => {
  const body = c.req.valid('json');
  const user = c.get('user');
  const startTime = Date.now();

  if (!user) return apiError(c, 401, 'UNAUTHORIZED', 'Authentication required.');
  if (user.role !== 'PATIENT_GUARANTOR' && !user.mobileDemoAdmin) return apiError(c, 403, 'FORBIDDEN', 'Cora is available to patients and authorized mobile presentation accounts.');
  if (!body.encounterId) return apiError(c, 400, 'ENCOUNTER_REQUIRED', 'Select a patient encounter before asking Cora about billing.');
  const [accessible] = await db.select({ id: encounters.id }).from(encounters).where(await encounterAccessCondition(user, body.encounterId)).limit(1);
  if (!accessible) return apiError(c, 404, 'ENCOUNTER_NOT_FOUND', 'The selected encounter was not found.');

  try {
    const result = await coraService.chat({
      message: body.message,
      conversation: body.conversation,
      language: body.language,
      mode: body.mode,
      encounterId: body.encounterId,
      facilityId: user?.facilityId,
      userId: user?.id,
      env: c.env as any
    });

    await recordAiAudit({
      facilityId: user?.facilityId,
      encounterId: body.encounterId,
      userId: user?.id,
      module: 'CORA',
      action: 'PATIENT_CONCIERGE_CHAT',
      modelUsed: result.modelUsed,
      latencyMs: Date.now() - startTime,
      status: 'SUCCESS',
      env: c.env as any
    });

    return c.json(result);
  } catch (err: any) {
    console.error('[Cora Chat Error]', err.name);
    await recordAiAudit({
      facilityId: user?.facilityId,
      encounterId: body.encounterId,
      userId: user?.id,
      module: 'CORA',
      action: 'PATIENT_CONCIERGE_CHAT',
      latencyMs: Date.now() - startTime,
      status: 'ERROR',
      errorMessage: err.message,
      env: c.env as any
    });
    return inferenceError(c, err, 'AI_INFERENCE_ERROR', 'Cora could not complete this request. Please retry.');
  }
});

// ----------------------------------------------------------------------
// 2. Clinical Claims Forensic Scrubber (Pre-Flight Audit)
// ----------------------------------------------------------------------
const scrubberSchema = z.object({
  encounterId: z.string().min(1, 'Encounter ID is required').max(100),
  forceEscalation: z.boolean().optional().default(false)
});

aiApp.post(
  '/claims/preflight-scrub',
  requireAuth,
  requireRole(STAFF_AI_ROLES),
  zValidator('json', scrubberSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const startTime = Date.now();

    try {
      const result = await claimsForensicService.runPreflightAudit({
        encounterId: body.encounterId,
        facilityId: user.facilityId,
        forceEscalation: body.forceEscalation,
        userId: user.id,
        env: c.env as any
      });

      await recordAiAudit({
        facilityId: user.facilityId,
        encounterId: body.encounterId,
        userId: user.id,
        module: 'CLAIMS_SCRUBBER',
        action: 'PREFLIGHT_AUDIT',
        modelUsed: result.modelUsed || (body.forceEscalation ? getAiConfig(c.env as any).geminiBackupModel : getAiConfig(c.env as any).geminiModel),
        rthRiskScore: result.rthRiskScore.toFixed(4),
        latencyMs: Date.now() - startTime,
        status: 'SUCCESS',
        env: c.env as any
      });

      return c.json(result);
    } catch (err: any) {
      console.error('[Claims Forensic Scrubber Error]', err.name);
      return inferenceError(c, err, 'SCRUBBER_AUDIT_ERROR', 'Claims pre-flight audit could not be completed.');
    }
  }
);

// ----------------------------------------------------------------------
// 3. Automated HMO Medical Necessity Appeal Drafter
// ----------------------------------------------------------------------
const hmoAppealSchema = z.object({
  encounterId: z.string().min(1, 'Encounter ID is required').max(100),
  deniedItemDescription: z.string().max(1000).optional(),
  deniedItem: z.string().max(300).optional(),
  deniedAmount: z.number().finite().nonnegative().optional().default(0),
  hmoProviderName: z.string().max(200).optional(),
  hmoId: z.string().max(100).optional(),
  forceRefresh: z.boolean().optional().default(false),
  justificationNotes: z.string().max(4000).optional()
});

aiApp.post(
  '/hmo/generate-appeal',
  requireAuth,
  requireRole(STAFF_AI_ROLES),
  zValidator('json', hmoAppealSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const startTime = Date.now();

    const deniedDescription = body.deniedItemDescription || body.deniedItem || '';
    if (!deniedDescription.trim() || body.deniedAmount <= 0) return apiError(c, 400, 'INVALID_DISPUTE', 'A denied item description and positive amount are required.');

    try {
      const result = await hmoAppealService.generateAppeal({
        encounterId: body.encounterId,
        deniedItemDescription: deniedDescription,
        deniedAmount: body.deniedAmount,
        hmoProviderName: body.hmoProviderName || body.hmoId,
        justificationNotes: body.justificationNotes,
        forceRefresh: body.forceRefresh,
        facilityId: user.facilityId,
        userId: user.id,
        env: c.env as any
      });

      await recordAiAudit({
        facilityId: user.facilityId,
        encounterId: body.encounterId,
        userId: user.id,
        module: 'HMO_APPEAL',
        action: 'GENERATE_APPEAL_LETTER',
        modelUsed: result.modelUsed,
        latencyMs: Date.now() - startTime,
        status: 'SUCCESS',
        env: c.env as any
      });

      return c.json(result);
    } catch (err: any) {
      console.error('[HMO Appeal Drafter Error]', err.name);
      return inferenceError(c, err, 'HMO_APPEAL_ERROR', 'HMO reconsideration letter generation failed.');
    }
  }
);

// ----------------------------------------------------------------------
// 4. Executive RCM Telemetry Briefing Generator
// ----------------------------------------------------------------------
aiApp.post(
  '/executive/briefing',
  requireAuth,
  requireRole(STAFF_AI_ROLES),
  async (c) => {
    const user = c.get('user');
    const startTime = Date.now();
    const body = await c.req.json().catch(() => ({})) as { forceRefresh?: boolean };

    try {
      const result = await executiveBriefingService.generateBriefing({
        facilityId: user.facilityId,
        forceRefresh: body?.forceRefresh === true,
        userId: user.id,
        env: c.env as any
      });

      await recordAiAudit({
        facilityId: user.facilityId,
        userId: user.id,
        module: 'EXECUTIVE_BRIEFING',
        action: 'SYNTHESIZE_TELEMETRY',
        modelUsed: result.modelUsed,
        latencyMs: Date.now() - startTime,
        status: 'SUCCESS',
        env: c.env as any
      });

      return c.json(result);
    } catch (err: any) {
      console.error('[Executive Briefing Error]', err.name);
      return inferenceError(c, err, 'BRIEFING_ERROR', 'Executive telemetry briefing generation failed.');
    }
  }
);

// ----------------------------------------------------------------------
// 5. Multimodal Government ID & Benefit Card Scanner (OCR)
// ----------------------------------------------------------------------
const ocrSchema = z.object({
  // About 6 MB of base64, roughly a 4.5 MB image.
  imageBase64: z.string().min(1, 'Image base64 data is required').max(6 * 1024 * 1024, 'Image is too large. Use a photo under 4.5 MB.'),
  cardCategory: z.string().max(50).optional()
});

aiApp.post('/ocr/extract-card', zValidator('json', ocrSchema), async (c) => {
  const body = c.req.valid('json');
  const user = c.get('user');
  const startTime = Date.now();

  try {
    const result = await ocrService.extractCard({
      imageBase64: body.imageBase64,
      facilityId: user?.facilityId,
      cardCategory: body.cardCategory,
      userId: user?.id,
      env: c.env as any
    });

    await recordAiAudit({
      facilityId: user?.facilityId,
      userId: user?.id,
      module: 'OCR',
      action: 'EXTRACT_BENEFIT_CARD',
      modelUsed: result.modelUsed,
      latencyMs: Date.now() - startTime,
      status: 'SUCCESS',
      env: c.env as any
    });

    return c.json(result);
  } catch (err: any) {
    console.error('[Card OCR Error]', err.name);
    return inferenceError(c, err, 'OCR_ERROR', 'Optical character recognition failed on card credential.');
  }
});

export default aiApp;
