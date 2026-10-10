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

const aiApp = new Hono();

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
}) {
  try {
    if (db && typeof db.insert === 'function') {
      const config = getAiConfig();
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
        phiScrubbed: true
      });
    }
  } catch (err) {
    // Non-blocking telemetry
    console.warn('[recordAiAudit] Telemetry audit insert skipped:', (err as any)?.message || err);
  }
}

// ----------------------------------------------------------------------
// 1. Cora Patient Concierge Chat
// ----------------------------------------------------------------------
const coraChatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  language: z.enum(['en', 'fil', 'ilo']).optional().default('fil'),
  mode: z.enum(['GENERAL', 'WHY_DO_I_OWE', 'DISCHARGE_STATUS', 'PROMISSORY_ASSISTANCE', 'DISPUTE_DRAFT']).optional().default('GENERAL'),
  encounterId: z.string().optional()
});

aiApp.post('/cora/chat', zValidator('json', coraChatSchema), async (c) => {
  const body = c.req.valid('json');
  const user = c.get('user');
  const startTime = Date.now();

  try {
    const result = await coraService.chat({
      message: body.message,
      language: body.language,
      mode: body.mode,
      encounterId: body.encounterId,
      facilityId: user?.facilityId
    });

    await recordAiAudit({
      facilityId: user?.facilityId,
      encounterId: body.encounterId,
      userId: user?.id,
      module: 'CORA',
      action: 'PATIENT_CONCIERGE_CHAT',
      latencyMs: Date.now() - startTime,
      status: 'SUCCESS'
    });

    return c.json(result);
  } catch (err: any) {
    console.error('[Cora Chat Error]', err);
    await recordAiAudit({
      facilityId: user?.facilityId,
      encounterId: body.encounterId,
      userId: user?.id,
      module: 'CORA',
      action: 'PATIENT_CONCIERGE_CHAT',
      latencyMs: Date.now() - startTime,
      status: 'ERROR',
      errorMessage: err.message
    });
    return apiError(c, 500, 'AI_INFERENCE_ERROR', 'Cora is currently unavailable. Please ask ward nursing for immediate assistance.');
  }
});

// ----------------------------------------------------------------------
// 2. Clinical Claims Forensic Scrubber (Pre-Flight Audit)
// ----------------------------------------------------------------------
const scrubberSchema = z.object({
  encounterId: z.string().min(1, 'Encounter ID is required'),
  forceEscalation: z.boolean().optional().default(false)
});

aiApp.post(
  '/claims/preflight-scrub',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'CLAIMS_ENCODER', 'HOSPITAL_CFO', 'HMO_COORDINATOR']),
  zValidator('json', scrubberSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const startTime = Date.now();

    try {
      const result = await claimsForensicService.runPreflightAudit({
        encounterId: body.encounterId,
        facilityId: user.facilityId,
        forceEscalation: body.forceEscalation
      });

      await recordAiAudit({
        facilityId: user.facilityId,
        encounterId: body.encounterId,
        userId: user.id,
        module: 'CLAIMS_SCRUBBER',
        action: 'PREFLIGHT_AUDIT',
        modelUsed: body.forceEscalation ? getAiConfig().geminiProModel : undefined,
        rthRiskScore: result.rthRiskScore.toFixed(4),
        latencyMs: Date.now() - startTime,
        status: 'SUCCESS'
      });

      return c.json(result);
    } catch (err: any) {
      console.error('[Claims Forensic Scrubber Error]', err);
      return apiError(c, 500, 'SCRUBBER_AUDIT_ERROR', err.message || 'Claims pre-flight audit could not be completed.');
    }
  }
);

// ----------------------------------------------------------------------
// 3. Automated HMO Medical Necessity Appeal Drafter
// ----------------------------------------------------------------------
const hmoAppealSchema = z.object({
  encounterId: z.string().min(1, 'Encounter ID is required'),
  deniedItemDescription: z.string().optional(),
  deniedItem: z.string().optional(),
  deniedAmount: z.number().optional().default(0),
  hmoProviderName: z.string().optional(),
  hmoId: z.string().optional(),
  justificationNotes: z.string().optional()
});

aiApp.post(
  '/hmo/generate-appeal',
  requireAuth,
  requireRole(['BILLING_SPECIALIST', 'HMO_COORDINATOR', 'HOSPITAL_CFO']),
  zValidator('json', hmoAppealSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const startTime = Date.now();

    const deniedDescription = body.deniedItemDescription || body.deniedItem || 'Surgical Consumables & Sterile Packs';

    try {
      const result = await hmoAppealService.generateAppeal({
        encounterId: body.encounterId,
        deniedItemDescription: deniedDescription,
        deniedAmount: body.deniedAmount,
        hmoProviderName: body.hmoProviderName || body.hmoId,
        justificationNotes: body.justificationNotes,
        facilityId: user.facilityId
      });

      await recordAiAudit({
        facilityId: user.facilityId,
        encounterId: body.encounterId,
        userId: user.id,
        module: 'HMO_APPEAL',
        action: 'GENERATE_APPEAL_LETTER',

        latencyMs: Date.now() - startTime,
        status: 'SUCCESS'
      });

      return c.json(result);
    } catch (err: any) {
      console.error('[HMO Appeal Drafter Error]', err);
      return apiError(c, 500, 'HMO_APPEAL_ERROR', err.message || 'HMO reconsideration letter generation failed.');
    }
  }
);

// ----------------------------------------------------------------------
// 4. Executive RCM Telemetry Briefing Generator
// ----------------------------------------------------------------------
aiApp.post(
  '/executive/briefing',
  requireAuth,
  requireRole(['HOSPITAL_CFO', 'BILLING_SPECIALIST', 'HMO_COORDINATOR']),
  async (c) => {
    const user = c.get('user');
    const startTime = Date.now();

    try {
      const result = await executiveBriefingService.generateBriefing({
        facilityId: user.facilityId
      });

      await recordAiAudit({
        facilityId: user.facilityId,
        userId: user.id,
        module: 'EXECUTIVE_BRIEFING',
        action: 'SYNTHESIZE_TELEMETRY',

        latencyMs: Date.now() - startTime,
        status: 'SUCCESS'
      });

      return c.json(result);
    } catch (err: any) {
      console.error('[Executive Briefing Error]', err);
      return apiError(c, 500, 'BRIEFING_ERROR', err.message || 'Executive telemetry briefing generation failed.');
    }
  }
);

// ----------------------------------------------------------------------
// 5. Multimodal Government ID & Benefit Card Scanner (OCR)
// ----------------------------------------------------------------------
const ocrSchema = z.object({
  imageBase64: z.string().min(1, 'Image base64 data is required'),
  cardCategory: z.string().optional()
});

aiApp.post('/ocr/extract-card', zValidator('json', ocrSchema), async (c) => {
  const body = c.req.valid('json');
  const user = c.get('user');
  const startTime = Date.now();

  try {
    const result = await ocrService.extractCard({
      imageBase64: body.imageBase64,
      cardCategory: body.cardCategory
    });

    await recordAiAudit({
      facilityId: user?.facilityId,
      userId: user?.id,
      module: 'OCR',
      action: 'EXTRACT_BENEFIT_CARD',
      latencyMs: Date.now() - startTime,
      status: 'SUCCESS'
    });

    return c.json(result);
  } catch (err: any) {
    console.error('[Card OCR Error]', err);
    return apiError(c, 500, 'OCR_ERROR', err.message || 'Optical character recognition failed on card credential.');
  }
});

export default aiApp;
