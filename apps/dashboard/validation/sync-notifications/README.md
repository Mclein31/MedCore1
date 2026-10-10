# Sync and notifications regression checks

Run from the project root:

```bash
node apps/dashboard/validation/sync-notifications/run.mjs
node apps/dashboard/validation/sync-notifications/mobile-auth-dom.mjs
node apps/dashboard/validation/sync-notifications/mobile-auth-dom.mjs --cache
npx tsc --project apps/dashboard/validation/sync-notifications/tsconfig.json --noEmit
```

These runners bundle actual dashboard/mobile components with esbuild and execute in jsdom. API replies and mobile native storage are synthetic; no database, real login, payment, or message is sent. They cover notification interaction/read failures, unified search, genuine account switching, stale census/HMO updates, selected-patient request headers, and delayed/expired directory races.

jsdom is external test tooling, not an application dependency. The default module is `/private/tmp/medcore-visual-tools/node_modules/jsdom/lib/api.js`; set `MEDCORE_DOM_MODULE` to an installed jsdom module path if needed. Output files are `results.json` , `mobile-auth-results.json`, and `cache-results.json`.

The real PostgreSQL verifier and full evidence boundaries are documented in [the implementation report](../../../../docs/audits/2026-10-10/SYNC_AND_NOTIFICATIONS_REPORT.md). The first verifier now passes; the later E2E audit's automation passes, with live clinical handoff and certification gaps detailed in that report.
