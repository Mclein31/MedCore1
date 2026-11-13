import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AiConfig } from '../src/env';
import { geminiClient } from '../src/services/ai/geminiClient';
import { hmoAppealService } from '../src/services/ai/hmoAppealService';
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
  it("gives the model today's date so the letter is not dated with an invented one", async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 7, bedIndex: 7, withHmo: true });
    let prompt = '';
    const generate = vi.spyOn(geminiClient, 'generate').mockImplementation(async (options) => {
      prompt = options.prompt;
      const referenceNumber = /APL-[0-9A-F]{8}/.exec(prompt)![0];
      const reconsiderationDeadline = /"reconsiderationDeadline":"([^"]+)"/.exec(prompt)![1]!;
      const rawJson = {
        referenceNumber,
        appealLetterMarkdown: `Appeal ${referenceNumber}`,
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
    expect(prompt).toContain('"letterDate":"December 10, 2026"');
  });
});
