# MedCore sync, notifications and E2E audit — October 10, 2026

The sync/notifications prompt is implemented and its real PostgreSQL verifier passes. The dashboard, mobile app, staff patient preview and printed slip now use the same real QR encoder and issued pass data. The later exhaustive interactive E2E certification remains **BLOCKED**, with the boundaries below.

## Runtime and database

| Surface | Result |
| --- | --- |
| Local PostgreSQL `aqromed` | CONNECTED, 250 encounters |
| Backend `http://127.0.0.1:8787` | HTTP 200; restarted with the explicit local database URL |
| Dashboard `http://127.0.0.1:5173` | HTTP 200 |
| Mobile web `http://127.0.0.1:8082` | HTTP 200, JavaScript bundle HTTP 200 |
| Disposable validation seed | 250 encounters, 200 beds |
| Staff/patient pass parity | Identical payload and complete QR matrix for the same active pass |
| Existing local fixture signatures | 83 placeholder signatures repaired; all 83 stored signatures independently recomputed successfully |

Evidence: [runtime and QR checks](runtime-health-and-qr.log), [signature repair](seeded-signature-repair.log), [earlier live QR parity](qr-parity-live.log).

The signature repair matched each row to its exact seeded fixture and changed only `discharge_passes.hmac_signature`. Pass numbers, exit PINs, balances, fees and stages were preserved. It did not execute the held Juan QuickSign. The application database was not reseeded during this continuation. New seed runs assign a physical bed only once to an active stay with an exact inventory label; historic, duplicate and synthetic room labels retain no physical bed linkage. All release paths guard current ownership.

Database migration preparation initially loaded the hosted URL from `.env`, applying the pending schema migration there. Subsequent commands explicitly targeted local PostgreSQL. The pre-existing local `linked_mrn` column was checked before reconciling its missing migration journal entry, then the staff read-state migration was applied. This was previously disclosed; see [migration](application-migration.log) and [local reconciliation](application-local-migration.log). Automated financial workflows use only the named disposable local validation database.

## Automated results

| Required E2E suite | Result | Evidence |
| --- | --- | --- |
| `npm run test:api` | PASS, 88 checks, 0 failures, actual PostgreSQL | [API](e2e-api.log) |
| `npm run test:financial` | PASS, 250 fixtures, 0 errors | [financial](e2e-financial.log) |
| `npm --prefix apps/mobile run test` | PASS, 49 tests | [mobile](e2e-mobile.log) |
| `npm --prefix apps/mobile run test:server` | PASS, 53 handler groups | [server](e2e-server.log) |
| `npm --prefix apps/mobile run test:qr` | PASS, 16 independently decoded rendered patterns | [QR](e2e-qr.log) |

The API suite was pinned to `postgresql://mclein@127.0.0.1:5432/medcore_payment_validation_sync`, with `NODE_ENV=development`. Payment rails are simulated. No external gateway transaction is claimed.

All eight remediation commands are recorded with exit codes in [regressions.json](regressions.json). Additional checks include actual dashboard React DOM interactions (14), rejected mutations (17), mobile authentication/scope races (8), cache checks (13), foreground/background provider polling (5), mobile strict unused-code checks, and supplementary script types. DOM, handler and cache tests use controlled synthetic API/storage/database adapters; the PostgreSQL verifier is separate.

## Persisted synchronization verification

[The guarded PostgreSQL verifier](../../../scripts/verify-sync-and-notifications.ts) creates/migrates/reseeds only a disposable local database whose name begins `medcore_payment_validation_sync`. It rejects hospital/remote targets and query overrides. Its [latest log](sync-postgres.log) records:

- Real seeded billing, CFO, physician, security and patient authentication; 250 encounters and 200 beds; HMAC validation for every seeded pass.
- A charge insert and quantity/price edit, with SQL gross checked; patient dispute filing; disputed deletion rejection; supervisory waiver charge/dispute rows and zero OOP; patient API waterfall/balance parity with SQL.
- Protected early bill finalization; doctor PF signing, pharmacy RTS and HMO LOA; persisted settlement stage and patient checklist; actual bill finalization/delivery.
- QR Ph, GCash, Maya and card simulated payments, each with SQL payment/receipt checks, unique replay and exact patient/server balance parity; final settlement, issued pass and housekeeping transition.
- Staff notification feed, amount and event presence; patient feed rejection, invalid read ID rejection, persisted per-user read isolation; authoritative staff census refresh; security verification, verified-pass event and patient status.
- A finite DAR metric and successful completion marker.

This proves API/SQL synchronization. It does not establish a measured five-second delivery of each workflow through both live browser UIs.

## Button and feature findings

| Area | Verified behavior / fix | Evidence boundary |
| --- | --- | --- |
| Header/search | Centered universal search; duplicate rendered searches and ledger dropdown removed; MRN search, keyboard selection and shared filters | Actual DOM; centered header observed in native screenshot |
| Staff accounts | Menu signs out and prefills actual target sign-in; no production impersonation | DOM, auth handlers and live Carlos sign-in |
| Facility context | Displays the authenticated single facility; no pretend cross-facility selector | Source; alternate facility switching not implemented by this product |
| Notification bell | Opens real feed; type filters, visit encounter, persisted mark-all/read, errors and foreground refresh | DOM plus PostgreSQL; mobile-payment-to-live-bell interaction pending |
| Ledger | One delete confirmation executes one DELETE; add/edit/delete use authoritative responses; finalize/send persist | DOM, API and SQL |
| Charge quantity/price | Backend now derives gross in integer cents when gross is omitted, then recalculates the waterfall; waived item liability stays zero | SQL defect reproduced and fixed; [before evidence](charge-edit-gross-before.log) |
| Dossier/cards | Latest encounter is derived from current census; actual MGH action; existing pass display; zero-copay release uses transactional endpoint | Source, handlers; complete live Juan sequence pending |
| Clearance | PF sign persists active fee line, waterfall and stage; no-HMO RTS proceeds directly to settlement; lower QuickSign controls share height | API, handlers, source; held clinical browser confirmation pending |
| Admission/edit | Real facility physician IDs and available inventory; UUID encounter references; exact rates; inline errors; bed locks and ownership guards | API/SQL, typechecks, source |
| Coverage | Authoritative refresh replaces fake batch timer; gateway previews explicitly unmonitored | Source/DOM; no external carrier integration claimed |
| Claims | Server XML only; stale encounter XML cleared; no mock fallback; retry/copy errors handled | API and source; official DTD validation pending |
| Analytics/settings | Date/search filters apply to metrics; report labeling reflects actual behavior; unsupported settings save and SMS controls unavailable | Source/build; no backend settings persistence or SMS delivery claimed |
| Mobile authentication | Real patient login; demo selects Juan before scoped reads; patient selection replaces scope; logout/expiry races guarded | Native UI, auth DOM and API |
| Mobile home/bill/payment | Authoritative balances and stage gates; selected-account payment request; active polling on data screens | Units/provider DOM; early payment review and cleared bill observed; final live settlement pending |
| Mobile notifications | Reads are namespaced by account/patient; visit baseline/read IDs retained correctly | Source and unit/provider checks; no OS push delivery claimed |
| Gate passes | Shared payload, matrix, quiet zone, crisp black/white modules and responsive frame; actual private PIN; inactive pass hides credentials across modal/preview/print/mobile | Shared matrix check, 16 decoded images, actual API parity and native AX pass inspection |
| Offline pass | Scoped cache, 24-hour expiry, known invalidation and storage-error guards; historical document cannot erase newer pass | Cache regressions; real mobile browser offline/back/reopen/reconnect observed |

An independent source review found and helped close the cache invalidation, bed ownership, printed PIN and decorative preview QR defects. It did not perform live clinical actions.

## Live interaction boundary

Native browser work verified onboarding, ordinary Juan login, protected early payment review, Carlos staff login, patient search, QuickSign review, authorized demo patient switching, a cleared Rafael bill/pass, and an actual offline pass test. The mobile browser was set offline through its own DevTools: the pass remained visible with its warning, Documents reopened the saved pass, and normal online presentation returned after reconnecting.

The dashboard accessibility tree exposed Rafael's same issued pass number and PIN with the real QR image. Native screenshot capture later returned a different state from that tree and coordinate input ended with `noWindowsAvailable`; this is not counted as a completed side-by-side visual comparison. No physical iOS/Android device was observed. Existing Metro on 8081 was preserved; the audited web instance uses 8082 and watches the shared encoder directory.

Automatic approval review rejected the live **Sign As Declared ₱21,000** QuickSign confirmation because it changes patient financial liability. The user handoff remains pending. The action was not repeated through another UI, API or CLI on the held application case. The independent disposable test workflow uses its prescribed ₱15,000 fee. Subsequent live HMO, settlement and bell verification therefore remain incomplete.

## Certification scorecard

PASS below identifies the stated evidence scope; BLOCKED means a required certification observation is missing.

| # | Criterion | Result | Evidence scope |
| --- | --- | --- | --- |
| 1 | Database seeder and 250/200 parity | PASS | Real disposable PostgreSQL seed/counts; safe allocation |
| 2 | Statutory centavo reconciliation | PASS | 250 exact fixtures and strict invalid input checks |
| 3 | Authentication/RBAC/facility isolation | PASS | Actual API authentication plus isolated security probes |
| 4 | Chargemaster CRUD/disputed deletion | PASS | Actual API/SQL plus rejected client mutation tests |
| 5 | Dispute filing/supervisory waiver | PASS | Actual SQL rows, persisted resolution and patient API parity |
| 6 | Waiver recalculation across both clients | BLOCKED | SQL/API and component checks pass; complete live client observation pending |
| 7 | Six-stage discharge progression | BLOCKED | API/SQL sequence passes; complete interactive Juan sequence pending |
| 8 | HMO approval and mobile synchronization | BLOCKED | SQL/API/provider checks pass; measured live browser delivery pending |
| 9 | Finalization/payment action gating | PASS | Actual protected API actions, all-role guards and mobile gating checks |
| 10 | Multi-rail settlement/idempotency | PASS | Four simulated rails; real payment/receipt rows and unique replay |
| 11 | Multi-table rollback | PASS | API suite's actual SQL rollback queries all three tables; injected handler rollback checks |
| 12 | Promissory note/zero-interest schedule | PASS | Actual API execution; exact schedule and stage guard checks |
| 13 | Gate PIN/lobby re-verification | PASS | Real SQL verification, valid stored signatures, replay/wrong PIN checks and decoded QR patterns |
| 14 | Official PhilHealth XML conformance | BLOCKED | Generated XML syntax/namespaces/amount checks pass; official DTD acceptance unverified |
| 15 | RCM metrics/bed capacity | PASS | Actual finite DAR and 200-bed fixture inventory; guarded transitions |
| 16 | Dashboard/server/mobile compilation | PASS | Production dashboard build and server/mobile typechecks |

**12 PASS, 4 BLOCKED. OVERALL: BLOCKED — no 100% certification or authorization for AI integration.** No AI feature, commit, push or deployment was added. Existing unrelated document, login-design and mobile package changes were preserved.
