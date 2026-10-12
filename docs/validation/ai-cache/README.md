# AI result caching

All five AI features share validated results through PostgreSQL `ai_result_cache`:

| Feature | Maximum reuse window |
| --- | --- |
| Cora (topic check, answer and language check together) | 5 minutes |
| Executive briefings/reports | 5 minutes |
| Card OCR | 5 minutes |
| PhilHealth preflight audits | 30 minutes |
| HMO appeal drafts | 30 minutes |

Current authorized source records are loaded before lookup. SHA-256 keys include feature, account, facility, encounter, configured models, generation revision, prompt/schema and semantic inputs. Cora additionally keys language, mode, conversation and scope/language policies. OCR keys normalized image data and MIME; raw images are never persisted. Identity mappings stay per request; scrubbed drafts are rehydrated after retrieval. OCR's extracted credentials remain private, account-scoped database values.

Matching concurrent misses and refreshes use atomic PostgreSQL leases, including across Worker instances. No transaction or session lock is held while generating. Owner tokens fence publication/release; lease expiry recovers abandoned jobs. Failed/malformed/language-invalid results never become successful hits. Existing waiters share a safe failure code; a later explicit request can retry. A failed refresh preserves the previous valid value. Coordination failures fail closed before starting another generation rather than silently spending credits through an uncached fallback.

Completed cache values are schema-validated on retrieval. Maximum serialized result is 256 KiB; expired inactive rows older than one day are removed in bounded opportunistic batches. TTL limits reuse, not guaranteed physical deletion at that instant. No raw prompts, image data, token maps or provider errors are written to this cache. Authorization runs before access. Responses remain private/no-store at the HTTP boundary.

`X-AI-Cache` reports `GENERATED`, `HIT`, `SHARED` or `REFRESHED`; audit logs record the same outcome when their existing table is available. Cache hits run no Gemini calls. Provider generation may still use the existing fallback/retry and independent Cora checks on a genuine miss. This is exact-input caching, not semantic matching: altered questions or follow-up histories can require a new answer.

Executive Refresh bypasses completed values and shares matching refreshes. Opening an appeal reuses its original reference/deadline; its explicit Regenerate action requests a new draft. Cached claim audits still recheck current chart/XML and persist normalized risk/status. Missing MGH dates now remain empty consistently in both generated/downloaded XML and audits rather than inventing a changing current timestamp.

## Verification

- `npm run test:ai:cache`: 13 isolated cache groups.
- `node --import ./node_modules/tsx/dist/loader.mjs apps/server/__tests__/aiServices.test.ts`: 54 route/provider regression groups, including zero additional provider calls for duplicate requests to every feature, source/language/history invalidation, cached-audit persistence, ownership and appeal regeneration.
- `npm run test:ai:cache:postgres`: 7 groups against two independent PostgreSQL pools in an isolated schema of the local `medcore_payment_validation_sync` database. Eight simultaneous calls produce one generation. Checks also cover persisted hits, refresh deduplication, expiry, shared failures, lease fencing and the fast-failure contender race. The script removes only its own disposable schema; no clinical mutations or model credits.
- Server and changed test/script strict types, dashboard production build, Worker dry run and diff checks pass. Independent read-only review's cleanup and failure races were corrected and reviewed again.
- Root dependency audit retains 17 existing advisories (6 moderate, 9 high, 2 critical); dependencies were not changed.

## Setup / repeatable commands

Apply the additive migration before starting this backend version:

```sh
npm run db:ai-cache
```

The script uses `MEDCORE_AI_CACHE_DATABASE_URL` or configured `DATABASE_URL` (loading `.env` when available), creates only the cache table/index, verifies its columns and never reseeds or modifies clinical tables. Migration `0004_ai_result_cache.sql` is also included in the existing Drizzle journal/snapshot chain.

The PostgreSQL verifier accepts only the named local validation database (or a suffixed variant) via `MEDCORE_AI_CACHE_TEST_DATABASE_URL`.

```sh
npm run test:ai:cache
npm run test:ai:cache:postgres
./node_modules/.bin/tsc -p apps/server/tsconfig.json --noEmit
npm run build
./node_modules/.bin/wrangler deploy --dry-run --config apps/server/wrangler.jsonc
```

Hosted verification uses the existing authorized mobile presentation account, selects an accessible encounter, sends two identical concurrent Cora requests and repeats one. It asserts identical valid English responses, the current balance and a `HIT` repeat; only cache outcomes/timing are saved. It logs out its verification session and changes no patient/financial rows. At most one new Cora workflow is generated on a cold cache.

```sh
MEDCORE_AI_CACHE_BASE_URL=https://medcore-backend.mcleinonza0531.workers.dev \
  node --import ./node_modules/tsx/dist/loader.mjs scripts/testHostedAiCache.ts
```

The additive cache table/index was applied after verifying the database matches the existing Hyperdrive origin and SQL query caching is disabled. Backend version `2ae8c460-37f9-49bd-8a9e-623dd23af278` is deployed. [Hosted results](./hosted-results.json) recorded `GENERATED`, `HIT`, `HIT` for identical valid English responses with the authoritative balance. No clinical records were changed. Dashboard source publication/rebuild is required for the explicit appeal Regenerate flag; mobile caching runs on the backend. When normalization/filtering code changes beyond automatically keyed prompts/schemas, increment `CACHE_REVISION` in `aiResultCache.ts`. Hyperdrive's SQL query caching must remain disabled for authentication, billing and lease coordination.
