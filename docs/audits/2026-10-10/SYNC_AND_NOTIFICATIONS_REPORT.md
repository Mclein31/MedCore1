# Sync and notifications implementation verification — October 10, 2026

Scope: `CODEX_SYNC_AND_NOTIFICATIONS_PROMPT.md` and the annotated dashboard screenshot. The later `CODEX_E2E_SYNC_AND_FEATURES_TEST_PROMPT.md` audit is deferred at the user's request until this work succeeds.

**Status: first sync/notifications prompt verified. All eight regressions and the real PostgreSQL verifier pass. The later exhaustive browser E2E audit is in progress and has a separate clinical-confirmation approval blocker.**

## Implemented behavior

- Dashboard records start empty and hydrate from authenticated API responses. Finalize, send, and view bill actions now persist timestamps, bill state, timeline, and audit records. Finalize/send require settlement readiness; failed writes do not fabricate client success. Transactions roll back all associated writes on audit failure. Existing paid balances remain unchanged.
- Confirmed encounter mutations invalidate older census responses, including HMO approval. Session changes discard old responses. Notifications and the full census poll every ten seconds while the dashboard is visible and refresh on foreground/focus. New events trigger authoritative encounter reads.
- The staff notification API derives payment, stage, bill, HMO, dispute/waiver, and gate-pass events from PostgreSQL. Every source is facility-scoped. Stable event IDs have persistent per-user read acknowledgements, with anonymous/patient access and foreign event IDs rejected. The default feed and unread badge describe the latest 30 events, with a maximum limit of 100.
- The bell opens an accessible panel with All/Payments/Discharges/Alerts filters, relative timestamps, persisted mark-read, retry handling, and navigation to the correct encounter. Failed acknowledgements preserve the last confirmed unread count.
- The date/time/database/SLA header strip is removed. One header search replaces rendered searches across the dashboard pages and tabs. Ctrl/Cmd-K, MRN matching, and Enter selection focus the matching discharge workstation.
- Account-menu selections sign out the previous identity and prefill a real sign-in. They do not silently impersonate another staff member. Production rejects the legacy role-emulation endpoint.
- Mobile demo selection uses its authorized patient directory, selecting Juan's primary MRN before scoped requests. Ordinary patients retain their linked-record scope. Expired or delayed directory responses cannot restore a signed-out session. Patient changes recreate the client/provider scope, discard old replies, and refresh immediately. Existing active five-second polling and foreground refresh are retained; a successful refresh clears stale errors without loading flicker.
- Patient encounter ordering prioritizes active stays, then unverified exit passes, then completed history, with descending admission/creation/ID tie-breaks. Doctor/insurance checklist state reflects confirmed clinical clearance and final HMO approval.

The implementation uses the actual schema: payment status `SUCCESS`, `system_audit_logs`, and existing canonical action names. Juan's existing seeded MRN, linked patient credentials, and phone remain consistent with the prior 24-check audit. Bill delivery means availability in the authenticated patient app; no SMS or external message delivery is claimed.

## Verification scorecard

| Check | Result | Evidence |
| --- | --- | --- |
| Master offline audit | PASS, 24/24 | [offline.log](offline.log) |
| Security and handler probes | PASS, all six probes | [handlers.log](handlers.log) |
| Statutory fixture calculations | PASS, 250/250, zero errors | [financial.log](financial.log) |
| Root project suite | PASS, 53 server groups, auth/financial/notification checks | [project.log](project.log) |
| Mobile unit suite | PASS, 49/49 | [mobile.log](mobile.log) |
| Dashboard build | PASS | [dashboard-build.log](dashboard-build.log) |
| Server typecheck | PASS | [server-types.log](server-types.log) |
| Mobile typecheck | PASS | [mobile-types.log](mobile-types.log) |
| Dashboard notification/search/account/race checks | PASS, 14/14 | [results.json](../../../apps/dashboard/validation/sync-notifications/results.json) |
| Mobile account scope and expired/logout races | PASS, 8/8 | [mobile-auth-results.json](../../../apps/dashboard/validation/sync-notifications/mobile-auth-results.json) |
| Existing dashboard rejected-mutation checks | PASS, 17/17 | [dashboard-mutations-dom.log](dashboard-mutations-dom.log) |
| Existing mobile provider polling checks | PASS, 5/5 | [mobile-polling-dom.log](mobile-polling-dom.log) |
| Additional verification-script/test types | PASS | [sync-test-types.log](sync-test-types.log) |
| Mobile strict unused-code checks | PASS | [mobile-lint.log](mobile-lint.log) |
| Actual PostgreSQL seed, stage, payment, bed and notification synchronization | PASS, verifier exits 0 | [sync-postgres.log](sync-postgres.log) |
| Exhaustive dashboard/mobile interaction certification | BLOCKED | [Later E2E scorecard](E2E_REPORT.md), pending clinical handoff and live observation |

All eight required regression commands exit 0; ordered commands and exit codes are in [regressions.json](regressions.json). DOM tests use actual React components/providers and controlled synthetic API/storage replies. Server handler tests use a synthetic transactional DB. Neither proves PostgreSQL durability or native-device synchronization.

## Live verification

`scripts/verify-sync-and-notifications.ts` is ready to create/migrate/reseed only a disposable local `medcore_payment_validation_sync` database. It rejects hospital/remote targets and connection query overrides. It authenticates actual seeded staff/patient accounts, verifies every workflow response code, checks SQL stage/balance/bed rows, confirms patient overview and staff census parity, and tests notification read isolation and lobby verification.

From the project root in a local terminal with PostgreSQL access:

```bash
node --import ./node_modules/tsx/dist/loader.mjs scripts/verify-sync-and-notifications.ts
```

An optional `MEDCORE_SYNC_DATABASE_URL` may select a local database named `medcore_payment_validation_sync` or an alphanumeric-suffixed variant. The script requires local create-database privileges if that database does not exist. Success must end with `SYNC_NOTIFICATIONS_POSTGRES_DONE` and exit 0. The continuation run exited 0 and recorded that success marker.

The previous workstation sandbox attempt failed with EPERM before any write; the earlier escalation was rejected. On continuation, approval review allowed the guarded disposable PostgreSQL verifier, which passed all stage/payment/bed/feed/read/lobby assertions. This closes the first prompt's live verification gate.

For application runtime preparation, the migration CLI first loaded the configured hosted database from `.env` and applied its pending migration successfully. Subsequent commands explicitly pinned `DATABASE_URL` to local `aqromed`. The local schema already had the exact nullable varchar(64) `linked_mrn` column but lacked migration0002's journal entry. After verifying the column definition, the missing local history entry was reconciled and migration0003 applied successfully. No hospital financial rows were changed on the hosted database by this migration. See [application migration log](application-migration.log) and [local reconciliation log](application-local-migration.log).

The later E2E source fixes and automated checks are complete; its interactive certification is partially verified. Its local API suite reseeded/mutated the authorized demo database and passed88 checks. Source and browser audits found additional issues, tracked separately. A live uncapped QuickSign confirmation was rejected by automatic approval review and handed to the user; it has not been executed through a workaround. No AI feature, commit, push or deployment was added. Pre-existing mobile package upgrades were preserved; the later QR implementation adds its own explicit qrcode dependency.

The latest screenshot fixes share a real QR encoder/payload across dashboard, mobile, patient preview and printing; inactive passes hide QR/PIN. See [the E2E report](E2E_REPORT.md) for additional fixes, 83 corrected fixture signatures, service health and evidence boundaries.
