import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { encounters } from '../src/db/schema';
import type { AiConfig } from '../src/env';
import { AiInferenceError, geminiClient } from '../src/services/ai/geminiClient';
import { hasAdmissionDateAsLetterDate, hmoAppealService } from '../src/services/ai/hmoAppealService';
import { createHarness, stayAwaitingSettlement, type Harness } from './harness';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(() => h.close());

const aiConfig: AiConfig = {
  enabled: true,
  apiKey: 'test-api-key-never-sent-anywhere',
  model: 'primary-model',
  backupModel: 'backup-model',
  proModel: 'backup-model',
};

describe('HMO appeal drafter', () => {
  it("gives the model today's date so the letter is not dated with an invented or admission date", async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 7, bedIndex: 7, withHmo: true });
    let prompt = '';
    let systemInstruction = '';
    const generate = vi.spyOn(geminiClient, 'generate').mockImplementation(async (options) => {
      prompt = options.prompt;
      systemInstruction = options.systemInstruction ?? '';
      const referenceNumber = /APL-[0-9A-F]{8}/.exec(prompt)![0];
      const reconsiderationDeadline = /"reconsiderationDeadline":"([^"]+)"/.exec(prompt)![1]!;
      const rawJson = {
        referenceNumber,
        appealLetterMarkdown: `**Date:** December 10, 2026\n\nAppeal ${referenceNumber}`,
        citationsApplied: [],
        attendingPhysicianName: 'Doctor',
        doctorPan: 'None',
        reconsiderationDeadline,
        suggestedAttachments: [],
      };
      return { modelUsed: 'primary-model', text: JSON.stringify(rawJson), rawJson };
    });
    try {
      await hmoAppealService.generateAppeal({
        db: h.db,
        encounterId: stay.id,
        facilityId: h.fixture.facility.id,
        deniedItemDescription: 'Toiletries',
        deniedAmount: 350,
        aiConfig,
        forceRefresh: true,
        now: new Date('2026-12-10T02:00:00Z'),
      });
    } finally {
      generate.mockRestore();
    }
    expect(prompt).toContain('Letter Date: December 10, 2026');
    expect(prompt).toContain('"letterDate":"December 10, 2026"');
    expect(systemInstruction).toContain('never use admissionDate as the letter date');
  });

  it('rejects a generated letter that omits letterDate or uses admissionDate as the letter date', async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 8, bedIndex: 8, withHmo: true });
    await h.db
      .update(encounters)
      .set({ admittedAt: new Date('2026-11-05T02:00:00Z') })
      .where(eq(encounters.id, stay.id));

    for (const badMarkdown of [
      '**Date:** November 5, 2026\n\nAppeal REF',
      'November 5, 2026\n\nDear Claims Team,\n\nAppeal REF',
      '**Date:** December 10, 2026\n**Letter Date:** November 5, 2026\n\nAppeal REF',
    ]) {
      const generate = vi.spyOn(geminiClient, 'generate').mockImplementation(async (options) => {
        const referenceNumber = /APL-[0-9A-F]{8}/.exec(options.prompt)![0];
        const reconsiderationDeadline = /"reconsiderationDeadline":"([^"]+)"/.exec(options.prompt)![1]!;
        const rawJson = {
          referenceNumber,
          appealLetterMarkdown: badMarkdown.replace('REF', referenceNumber),
          citationsApplied: [],
          attendingPhysicianName: 'Doctor',
          doctorPan: 'None',
          reconsiderationDeadline,
          suggestedAttachments: [],
        };
        return { modelUsed: 'primary-model', text: JSON.stringify(rawJson), rawJson };
      });
      try {
        await expect(
          hmoAppealService.generateAppeal({
            db: h.db,
            encounterId: stay.id,
            facilityId: h.fixture.facility.id,
            deniedItemDescription: 'Toiletries',
            deniedAmount: 350,
            aiConfig,
            forceRefresh: true,
            now: new Date('2026-12-10T02:00:00Z'),
          }),
        ).rejects.toBeInstanceOf(AiInferenceError);
      } finally {
        generate.mockRestore();
      }
    }

    expect(
      hasAdmissionDateAsLetterDate(
        '**Date:** December 10, 2026\n\nThe patient was admitted on November 5, 2026.',
        'November 5, 2026',
        'December 10, 2026',
      ),
    ).toBe(false);
    expect(
      hasAdmissionDateAsLetterDate(
        '**Date:** December 10, 2026\n**Admission Date:** November 5, 2026\n\nDear Team,',
        'November 5, 2026',
        'December 10, 2026',
      ),
    ).toBe(false);
  });
});
