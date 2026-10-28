import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiConfig } from '../src/env';
import { AiInferenceError, GeminiClient } from '../src/services/ai/geminiClient';

const aiConfig: AiConfig = {
  enabled: true,
  apiKey: 'test-api-key-never-log-this',
  model: 'primary-model',
  backupModel: 'backup-model',
  proModel: 'backup-model',
};

afterEach(() => vi.unstubAllGlobals());

describe('Gemini provider diagnostics', () => {
  it.each([
    [400, 'invalid_request', 'INVALID_REQUEST', 'AI_UNAVAILABLE', 502],
    [403, 'permission_denied', 'PERMISSION_DENIED', 'AI_UNAVAILABLE', 502],
    [429, 'resource_exhausted', 'RESOURCE_EXHAUSTED', 'AI_RATE_LIMITED', 503],
  ])(
    'retains safe status identifiers for HTTP %i after fallback fails',
    async (httpStatus, providerCode, reason, code, status) => {
      const fetch = vi.fn(async () =>
        Response.json(
          {
            error: {
              message: `Provider echoed ${aiConfig.apiKey} and private request content`,
              code: providerCode,
            },
          },
          { status: httpStatus },
        ),
      );
      vi.stubGlobal('fetch', fetch);

      const error = await new GeminiClient()
        .generate({ prompt: 'Private request', aiConfig })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AiInferenceError);
      expect(error).toMatchObject({
        code,
        status,
        providerFailure: { httpStatus, model: 'backup-model', reason },
      });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(error)).not.toContain(aiConfig.apiKey);
      expect(JSON.stringify(error)).not.toContain('private request content');
      expect((error as Error).message).not.toContain(aiConfig.apiKey);
    },
  );

  it('reads the reason from Google gateway errors such as an invalid key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          [{ error: { code: 400, status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } }],
          { status: 400 },
        ),
      ),
    );

    const error = await new GeminiClient()
      .generate({ prompt: 'Private request', aiConfig })
      .catch((e: unknown) => e);

    expect(error).toMatchObject({
      code: 'AI_UNAVAILABLE',
      providerFailure: { httpStatus: 400, model: 'backup-model', reason: 'API_KEY_INVALID' },
    });
  });

  it.each([
    '<html>upstream error</html>',
    '',
    JSON.stringify({ error: { code: 'private request content' } }),
    JSON.stringify({ error: { code: { reason: 'private request content' } } }),
  ])('keeps malformed or unsafe error bodies out of diagnostics', async (body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { status: 502 })),
    );

    const error = await new GeminiClient()
      .generate({ prompt: 'Private request', aiConfig })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AiInferenceError);
    expect((error as AiInferenceError).providerFailure).toEqual({ httpStatus: 502, model: 'backup-model' });
  });

  it('still returns the backup model response when only the primary is rejected', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: { code: 'permission_denied' } }, { status: 403 }))
      .mockResolvedValueOnce(
        Response.json({
          status: 'completed',
          steps: [
            { type: 'thought' },
            { type: 'model_output', content: [{ type: 'text', text: 'Verified reply' }] },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetch);

    await expect(new GeminiClient().generate({ prompt: 'Request', aiConfig })).resolves.toMatchObject({
      text: 'Verified reply',
      modelUsed: 'backup-model',
    });
  });

  it('sends Interactions requests without provider storage and with JSON Schema output', async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        status: 'completed',
        steps: [{ type: 'model_output', content: [{ type: 'text', text: '{"ok":true}' }] }],
      }),
    );
    vi.stubGlobal('fetch', fetch);

    const result = await new GeminiClient().generate({
      prompt: 'ignored when parts are present',
      parts: [{ text: 'Read card' }, { inlineData: { mimeType: 'image/png', data: 'AAAA' } }],
      systemInstruction: 'Be brief.',
      responseMimeType: 'application/json',
      responseSchema: { type: 'OBJECT', properties: { ok: { type: 'BOOLEAN' } } },
      aiConfig,
    });

    expect(result).toMatchObject({ rawJson: { ok: true }, modelUsed: 'primary-model' });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'primary-model',
      store: false,
      system_instruction: 'Be brief.',
      input: [
        { type: 'text', text: 'Read card' },
        { type: 'image', mime_type: 'image/png', data: 'AAAA' },
      ],
      response_format: { type: 'object', properties: { ok: { type: 'boolean' } } },
    });
  });

  it('skips a rate-limited model for later requests, then retries it after the cooldown', async () => {
    vi.useFakeTimers();
    const ok = (text: string) =>
      Response.json({
        status: 'completed',
        steps: [{ type: 'model_output', content: [{ type: 'text', text }] }],
      });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: { code: 'resource_exhausted' } }, { status: 429 }))
      .mockResolvedValueOnce(ok('first'))
      .mockResolvedValueOnce(ok('second'))
      .mockResolvedValueOnce(ok('third'));
    vi.stubGlobal('fetch', fetch);
    const client = new GeminiClient();
    const modelOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string).model;

    await client.generate({ prompt: 'One', aiConfig });
    await expect(client.generate({ prompt: 'Two', aiConfig })).resolves.toMatchObject({
      modelUsed: 'backup-model',
    });
    expect(fetch.mock.calls.map(modelOf)).toEqual(['primary-model', 'backup-model', 'backup-model']);

    vi.advanceTimersByTime(61_000);
    await expect(client.generate({ prompt: 'Three', aiConfig })).resolves.toMatchObject({
      modelUsed: 'primary-model',
    });
    vi.useRealTimers();
  });

  it('still tries a cooling model last when the healthy one fails', async () => {
    const limited = () => Response.json({ error: { code: 'resource_exhausted' } }, { status: 429 });
    const ok = () =>
      Response.json({
        status: 'completed',
        steps: [{ type: 'model_output', content: [{ type: 'text', text: 'ok' }] }],
      });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(limited())
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(limited())
      .mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', fetch);
    const client = new GeminiClient();
    const modelOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string).model;

    await client.generate({ prompt: 'One', aiConfig });
    await expect(client.generate({ prompt: 'Two', aiConfig })).resolves.toMatchObject({
      modelUsed: 'primary-model',
    });
    expect(fetch.mock.calls.map(modelOf)).toEqual([
      'primary-model',
      'backup-model',
      'backup-model',
      'primary-model',
    ]);
  });

  it('does not cool down a model for a request-specific rejection', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: { code: 'invalid_request' } }, { status: 400 }))
      .mockImplementation(async () =>
        Response.json({
          status: 'completed',
          steps: [{ type: 'model_output', content: [{ type: 'text', text: 'ok' }] }],
        }),
      );
    vi.stubGlobal('fetch', fetch);
    const client = new GeminiClient();

    await client.generate({ prompt: 'One', aiConfig });
    await expect(client.generate({ prompt: 'Two', aiConfig })).resolves.toMatchObject({
      modelUsed: 'primary-model',
    });
  });

  it('fails over when the interaction itself failed', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ status: 'failed', steps: [] }))
      .mockResolvedValueOnce(
        Response.json({
          status: 'completed',
          steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Backup reply' }] }],
        }),
      );
    vi.stubGlobal('fetch', fetch);

    await expect(new GeminiClient().generate({ prompt: 'Request', aiConfig })).resolves.toMatchObject({
      text: 'Backup reply',
      modelUsed: 'backup-model',
    });
  });
});
