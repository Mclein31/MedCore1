import { can } from '@medcore/domain';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppBindings, AppContext } from '../context';
import { encounters, patientAccountLinks } from '../db/schema';
import { ApiError, forbidden, notFound } from '../lib/errors';
import { patientAuth, requirePermission } from '../middleware/auth';
import { jsonBody } from '../middleware/http';
import { observeAiCache } from '../services/ai/aiResultCache';
import { claimsForensicService } from '../services/ai/claimsForensicService';
import { coraService } from '../services/ai/coraService';
import { executiveBriefingService } from '../services/ai/executiveBriefingService';
import { AiInferenceError } from '../services/ai/geminiClient';
import { hmoAppealService } from '../services/ai/hmoAppealService';
import { ocrService } from '../services/ai/ocrService';
import { CORA_LANGUAGE_IDS } from '../services/ai/prompts/coraPrompts';
import { audit } from '../services/audit';
import { staffEncounterScope } from '../services/views';

const MAX_OCR_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_OCR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_CARD_CATEGORIES = [
  'PHILHEALTH',
  'PHILHEALTH_ID',
  'SENIOR_CITIZEN',
  'SENIOR_CITIZEN_OSCA',
  'PWD',
  'PWD_ID',
  'HMO',
  'HMO_CARD',
  'NATIONAL_ID',
  'PHILSYS_NATIONAL_ID',
] as const;

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function validateOcrImage(imageBase64: string): boolean {
  const match = imageBase64.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  const mimeType = match ? match[1]!.toLowerCase() : 'image/jpeg';
  const rawBase64 = (match ? match[2]! : imageBase64).replace(/\s/g, '');
  if (!ALLOWED_OCR_MIME.has(mimeType)) return false;
  if (!rawBase64 || rawBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(rawBase64)) {
    return false;
  }
  const padding = rawBase64.endsWith('==') ? 2 : rawBase64.endsWith('=') ? 1 : 0;
  const decodedBytes = (rawBase64.length * 3) / 4 - padding;
  return decodedBytes > 0 && decodedBytes <= MAX_OCR_IMAGE_BYTES;
}

const CoraTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
});

const CoraChatBody = z.object({
  encounterId: z.string().min(1).max(64).optional(),
  message: z.string().min(1).max(2000),
  language: z.enum(CORA_LANGUAGE_IDS).optional().default('fil'),
  mode: z
    .enum(['GENERAL', 'WHY_DO_I_OWE', 'DISCHARGE_STATUS', 'PROMISSORY_ASSISTANCE', 'DISPUTE_DRAFT'])
    .optional()
    .default('GENERAL'),
  conversationHistory: z.array(CoraTurnSchema).max(8).optional(),
  conversation: z.array(CoraTurnSchema).max(8).optional(),
  forceRefresh: z.boolean().optional(),
});

const ScrubClaimBody = z.object({
  encounterId: z.string().min(1).max(64),
  forceRefresh: z.boolean().optional(),
  forceEscalation: z.boolean().optional(),
  customCf4Text: z.string().max(12000).optional(),
});

const HmoAppealBody = z.object({
  encounterId: z.string().min(1).max(64),
  deniedItemDescription: z.string().min(1).max(1000).optional(),
  deniedItem: z.string().min(1).max(1000).optional(),
  deniedAmount: z.number().positive(),
  hmoProviderName: z.string().max(200).optional(),
  hmoId: z.string().max(100).optional(),
  justificationNotes: z.string().max(6000).optional(),
  forceRefresh: z.boolean().optional(),
});

const BriefingBody = z.object({
  facilityId: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});

const ExtractCardBody = z.object({
  imageBase64: z.string().min(16).refine(validateOcrImage, {
    message: 'Image must be a valid JPEG, PNG, or WEBP base64 payload up to 6 MB.',
  }),
  cardCategory: z.enum(ALLOWED_CARD_CATEGORIES).optional(),
  forceRefresh: z.boolean().optional(),
});

function rethrowAiError(err: unknown, fallbackMessage: string): never {
  if (err instanceof ApiError) throw err;
  if (err instanceof AiInferenceError) {
    throw new ApiError(err.status as 400 | 422 | 502 | 503, err.code, err.message);
  }
  if (err instanceof Error && /not found/i.test(err.message)) {
    throw notFound('Stay');
  }
  if (
    err instanceof Error &&
    /no HMO payer|disputed charge and amount|required for card/i.test(err.message)
  ) {
    throw new ApiError(400, 'INVALID_AI_REQUEST', err.message);
  }
  throw new ApiError(502, 'AI_UNAVAILABLE', fallbackMessage);
}

async function resolveStaffEncounter(c: AppContext, encounterId: string): Promise<string> {
  const matchCond = isUuid(encounterId)
    ? or(eq(encounters.id, encounterId), eq(encounters.encounterNumber, encounterId))
    : eq(encounters.encounterNumber, encounterId);
  const [row] = await c.var.db
    .select({ id: encounters.id })
    .from(encounters)
    .where(and(matchCond, staffEncounterScope(c.var.staff), isNull(encounters.voidedAt)))
    .limit(1);
  if (!row) throw notFound('Stay');
  return row.id;
}

export const staffAiRoutes = new Hono<AppBindings>();

staffAiRoutes.post('/cora/chat', requirePermission('encounter:read'), jsonBody(CoraChatBody), async (c) => {
  const body = c.req.valid('json');
  if (!body.encounterId) throw new ApiError(400, 'INVALID_AI_REQUEST', 'Encounter ID is required.');
  const resolvedId = await resolveStaffEncounter(c, body.encounterId);
  try {
    const result = await observeAiCache(
      (outcome) => c.header('X-MedCore-AI-Cache', outcome),
      () =>
        coraService.chat({
          db: c.var.db,
          encounterId: resolvedId,
          facilityId: c.var.staff.facilityId,
          userId: c.var.staff.id,
          message: body.message,
          language: body.language,
          mode: body.mode,
          conversationHistory: body.conversationHistory ?? body.conversation ?? [],
          forceRefresh: body.forceRefresh,
          aiConfig: c.var.services.config.ai,
        }),
    );
    await audit(c, c.var.db, {
      action: 'AI_CORA_CHAT',
      resourceType: 'encounter',
      resourceId: resolvedId,
      detail: { language: body.language, mode: body.mode, modelUsed: result.modelUsed },
    });
    return c.json(result);
  } catch (err) {
    rethrowAiError(err, 'Cora is temporarily unavailable.');
  }
});

staffAiRoutes.post(
  '/claims/preflight-scrub',
  requirePermission('claim:read'),
  jsonBody(ScrubClaimBody),
  async (c) => {
    const body = c.req.valid('json');
    const resolvedId = await resolveStaffEncounter(c, body.encounterId);
    try {
      const result = await observeAiCache(
        (outcome) => c.header('X-MedCore-AI-Cache', outcome),
        () =>
          claimsForensicService.scrubEncounterClaim({
            db: c.var.db,
            cipher: c.var.services.cipher,
            encounterId: resolvedId,
            facilityId: c.var.staff.facilityId,
            userId: c.var.staff.id,
            forceRefresh: body.forceRefresh ?? body.forceEscalation,
            customCf4Text: body.customCf4Text,
            aiConfig: c.var.services.config.ai,
          }),
      );
      await audit(c, c.var.db, {
        action: 'AI_CLAIM_SCRUB',
        resourceType: 'encounter',
        resourceId: resolvedId,
        detail: {
          rthRiskScore: result.rthRiskScore,
          riskLevel: result.riskLevel,
          modelUsed: result.modelUsed,
        },
      });
      return c.json(result);
    } catch (err) {
      rethrowAiError(err, 'Claims pre-flight scrubber is temporarily unavailable.');
    }
  },
);

staffAiRoutes.post(
  '/hmo/generate-appeal',
  requirePermission('dispute:read'),
  jsonBody(HmoAppealBody),
  async (c) => {
    const body = c.req.valid('json');
    const deniedItemDescription = (body.deniedItemDescription ?? body.deniedItem ?? '').trim();
    if (!deniedItemDescription) {
      throw new ApiError(400, 'INVALID_AI_REQUEST', 'A denied item description is required.');
    }
    const resolvedId = await resolveStaffEncounter(c, body.encounterId);
    try {
      const result = await observeAiCache(
        (outcome) => c.header('X-MedCore-AI-Cache', outcome),
        () =>
          hmoAppealService.generateAppeal({
            db: c.var.db,
            encounterId: resolvedId,
            facilityId: c.var.staff.facilityId,
            deniedItemDescription,
            deniedAmount: body.deniedAmount,
            hmoProviderName: body.hmoProviderName ?? body.hmoId,
            justificationNotes: body.justificationNotes,
            userId: c.var.staff.id,
            forceRefresh: body.forceRefresh,
            aiConfig: c.var.services.config.ai,
          }),
      );
      await audit(c, c.var.db, {
        action: 'AI_HMO_APPEAL_GENERATED',
        resourceType: 'encounter',
        resourceId: resolvedId,
        detail: { referenceNumber: result.referenceNumber, modelUsed: result.modelUsed },
      });
      return c.json(result);
    } catch (err) {
      rethrowAiError(err, 'HMO appeal letter generator is temporarily unavailable.');
    }
  },
);

staffAiRoutes.post(
  '/executive/briefing',
  requirePermission('analytics:read'),
  jsonBody(BriefingBody),
  async (c) => {
    const body = c.req.valid('json');
    try {
      const result = await observeAiCache(
        (outcome) => c.header('X-MedCore-AI-Cache', outcome),
        () =>
          executiveBriefingService.generateBriefing({
            db: c.var.db,
            facilityId: c.var.staff.facilityId,
            userId: c.var.staff.id,
            forceRefresh: body.forceRefresh,
            aiConfig: c.var.services.config.ai,
          }),
      );
      await audit(c, c.var.db, {
        action: 'AI_EXECUTIVE_BRIEFING',
        resourceType: 'facility',
        resourceId: c.var.staff.facilityId,
        detail: { modelUsed: result.modelUsed },
      });
      return c.json(result);
    } catch (err) {
      rethrowAiError(err, 'Executive RCM briefing generator is temporarily unavailable.');
    }
  },
);

staffAiRoutes.post('/ocr/extract-card', jsonBody(ExtractCardBody), async (c) => {
  const role = c.var.staff.role;
  if (
    !can(role, 'patient:write') &&
    !can(role, 'coverage:philhealth') &&
    !can(role, 'coverage:hmo') &&
    !can(role, 'promissory:create')
  ) {
    throw forbidden('Your role cannot scan identity or benefit cards.');
  }
  const body = c.req.valid('json');
  try {
    const result = await observeAiCache(
      (outcome) => c.header('X-MedCore-AI-Cache', outcome),
      () =>
        ocrService.extractCard({
          imageBase64: body.imageBase64,
          cardCategory: body.cardCategory,
          userId: c.var.staff.id,
          facilityId: c.var.staff.facilityId,
          forceRefresh: body.forceRefresh,
          aiConfig: c.var.services.config.ai,
        }),
    );
    await audit(c, c.var.db, {
      action: 'AI_CARD_OCR',
      resourceType: 'facility',
      resourceId: c.var.staff.facilityId,
      detail: { cardType: result.cardType, modelUsed: result.modelUsed },
    });
    return c.json(result);
  } catch (err) {
    rethrowAiError(err, 'Card OCR service is temporarily unavailable.');
  }
});

// ---------------------------------------------------------------- Patient AI Routes
export const patientAiRoutes = new Hono<AppBindings>();
patientAiRoutes.use('*', patientAuth);

const VISIBLE_BILL_STATES = new Set(['FINALIZED', 'SENT', 'PARTIALLY_PAID', 'SETTLED']);

patientAiRoutes.post('/cora/chat', jsonBody(CoraChatBody), async (c) => {
  const body = c.req.valid('json');
  const patient = c.var.patient;
  const linked = sql`exists (select 1 from ${patientAccountLinks}
    where ${patientAccountLinks.patientId} = ${encounters.patientId}
      and ${patientAccountLinks.accountId} = ${patient.accountId}
      and ${patientAccountLinks.revokedAt} is null)`;

  const rows = await c.var.db
    .select({
      id: encounters.id,
      encounterNumber: encounters.encounterNumber,
      patientId: encounters.patientId,
      billState: encounters.billState,
    })
    .from(encounters)
    .where(and(eq(encounters.facilityId, patient.facilityId), isNull(encounters.voidedAt), linked))
    .orderBy(desc(encounters.admittedAt));

  const target =
    (body.encounterId
      ? rows.find(
          (r) =>
            r.id === body.encounterId ||
            r.encounterNumber === body.encounterId ||
            r.patientId === body.encounterId,
        )
      : undefined) ?? rows[0];

  if (!target || !VISIBLE_BILL_STATES.has(target.billState)) {
    throw notFound('Stay');
  }

  try {
    const result = await observeAiCache(
      (outcome) => c.header('X-MedCore-AI-Cache', outcome),
      () =>
        coraService.chat({
          db: c.var.db,
          encounterId: target.id,
          facilityId: patient.facilityId,
          userId: patient.accountId,
          message: body.message,
          language: body.language,
          mode: body.mode,
          conversationHistory: body.conversationHistory ?? body.conversation ?? [],
          forceRefresh: body.forceRefresh,
          aiConfig: c.var.services.config.ai,
        }),
    );
    await audit(c, c.var.db, {
      action: 'AI_CORA_CHAT_PATIENT',
      resourceType: 'encounter',
      resourceId: target.id,
      detail: { language: body.language, mode: body.mode, modelUsed: result.modelUsed },
    });
    return c.json(result);
  } catch (err) {
    rethrowAiError(err, 'Cora is temporarily unavailable.');
  }
});

patientAiRoutes.post('/ocr/extract-card', jsonBody(ExtractCardBody), async (c) => {
  const body = c.req.valid('json');
  const patient = c.var.patient;
  try {
    const result = await observeAiCache(
      (outcome) => c.header('X-MedCore-AI-Cache', outcome),
      () =>
        ocrService.extractCard({
          imageBase64: body.imageBase64,
          cardCategory: body.cardCategory,
          userId: patient.accountId,
          facilityId: patient.facilityId,
          forceRefresh: body.forceRefresh,
          aiConfig: c.var.services.config.ai,
        }),
    );
    await audit(c, c.var.db, {
      action: 'AI_CARD_OCR_PATIENT',
      resourceType: 'facility',
      resourceId: patient.facilityId,
      detail: { cardType: result.cardType, modelUsed: result.modelUsed },
    });
    return c.json(result);
  } catch (err) {
    rethrowAiError(err, 'Card OCR service is temporarily unavailable.');
  }
});
