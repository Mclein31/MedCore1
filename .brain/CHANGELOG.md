# AQROMED / MedCore: Changelog (Operational Brain)

Newest first, condensed. Decisions are in `DECISIONS.md`.

## [2026-10-29] Product video V6 re-edit: word-locked timing, real cursor, no zoom
- Owner review: cursor positions did not match the clicks, several clips were late against the voice, and the dashboard must not be zoomed. Causes: `capture-dashboard.mjs` logged clicks on the wall clock but built video from CDP frame timestamps, and ffmpeg's concat demuxer stretched long still frames, so clips ran up to 3.8 s longer than their click logs; `v6.py` stretched each scene evenly to its new take, so beats drifted from the words.
- Capture: the cursor is now a DOM overlay recorded in the same frames as the clicks; video is laid out at a constant 30 fps on the log's clock (every clip within one frame of its log); feature responses are prepared before capture; `ui.mark()` logs element boxes for callouts. All dashboard clips except `dash-lobby` re-recorded; `dash-ledger` now walks the six waterfall steps, `dash-clearance` shows the board first, `dash-analytics` shows KPIs with the briefing collapsed.
- Edit: `timing.py` locks every scene to `audio/vo-v6-mastered` with word times from `vo_words.json` (faster-whisper); Act III is authored in take time, other scenes are pinned to words (`pins.py`). Dashboard shots show the whole screen (58 %, `screen.py`) with spotlight callouts on the logged boxes. Animation pass (`fx.py`): motes, count-ups with drawn underlines, S1 time-lapse clock, S13 name rings, lobby ripple. S4 now says "It never decides the money" as the voice does. Runtime 4:39.6.
- App fixes found by filming without zoom: RCM Analytics AR aging was hard-coded (₱39.0 M); it is now computed from encounters. The HMO appeal prompt used an ISO admission timestamp; now a Manila date. The claims scrub cache never hit (eSOA XML embedded `new Date()`); it now uses the encounter time. The claims page showed "Finalize the bill before exporting the eSOA" as a page alert for draft bills; it now shows in the XML panels only.

## [2026-10-28] Product video V6 (final cut)
- New cut `docs/media/production/render/medcore-v6.mp4` (4:37, 1920×1080, 30 fps, −14.0 LUFS) built by `source-v6/` (`python3 docs/media/production/source-v6/v6.py`; `--still` and `--only` for single scenes). Script `script/MEDCORE_SCRIPT_FINAL.md` (narration rev. F, corrected stats), edit direction `script/EDIT_STYLE_V6.md`. Scenes are retimed to the new takes in `audio/vo-v6-mastered/`. Re-recorded dashboard footage in `footage-v6/` and `screenshots-v6/`. V4 and V5 are untouched.
- S14 close: the "The care is done. Now families can go home." caption was white on the pale sky; it now sits in navy on a white pill. The S14 "prototype is already live" opener was cut on the owner's call. The owner approved the cut's look.

## [2026-10-28] Any user, any device, any network; Gemini free-tier protection
- Verified locally: typecheck, lint (0 errors), all tests (domain, API 68, mobile). Cross-app sync both ways (mobile charge question → dashboard; dashboard resolution → mobile), two patients on three devices with isolation, per-device logout. Hosted Worker, Vercel dashboard, `/api` proxy and Neon `demo` healthy.
- Per-IP rate limits raised to network-wide ceilings (staff login 200/5 min, code request 100/10 min, code verify 300/10 min, invite 100/h) so a shared hospital/venue Wi-Fi or carrier NAT no longer locks users out; staff MFA is now limited per sign-in challenge (10/5 min) plus 300/5 min per IP. Per-account limits unchanged.
- Mobile defaults to the hosted Worker when `EXPO_PUBLIC_API_BASE_URL` is unset (was `127.0.0.1`, unreachable from a phone); `EXPO_PUBLIC_API_PORT` removed.
- Gemini client: a model that times out, returns 429 or 5xx is skipped for 60 s. Measured: `gemini-3.5-flash-lite` took 7–25 s (once 24.7 s for a one-word reply) while `gemini-3.1-flash-lite` took ~2 s, so Cora was waiting out a 25 s timeout before falling back.
- Not yet deployed: the Worker (last deploy 2026-10-27) needs `npm run deploy -w @medcore/api` for the rate-limit and cooldown changes.

## [2026-10-28] Pitch statistics source check
- Checked every stat on the V5 video's "It isn't one family" slide and the Canva deck slide 3 against primary or news sources. Confirmed: 42.7% / ₱615 B OOP (PSA 2024), +33.8% IC HMO complaints. Retracted: 15–20% RTH, 20% returned/denied (PHAPi), 4–8+ h discharge. Verified figures, retractions and links are in `NOTES.md` §2.
- Canva deck slide 3 cards updated by the owner: ₱615B OOP (PSA 2024 PNHA) and ₱59.6B denied/returned claims 2018–2024 (PhilHealth at the House Committee on Health, via Philstar).

## [2026-10-27] Product video V5 visual pass
- New cut `docs/media/production/render/medcore-v5.mp4` from `source-v5/` (a copy of the V4 compositor); V4 render and `source/` untouched. Same 4:30 timeline, VO, music and SFX (−14.1 LUFS).
- Owner rejected the thin Instrument Serif: headlines now use a 640-weight Bricolage instance (between SemiBold and ExtraBold, "bold but not super thick"), supporting lines Avenir Next Regular.
- Dashboard shots fly from the monitor into a full-frame UI (add-zooms / motion-video-director techniques); V4 zoom framing kept exactly so the "Clip fixes" stay hidden. Caption pills, per-pain accent glows, and drawing rings around pain numerals.

## [2026-10-27] Hosted Cora failure investigation and diagnostics
- A physical-iPhone bill explanation reached the hosted patient Cora endpoint and returned HTTP 502 in 795 ms. Both configured Gemini models respond successfully with the local credential; the complete Taglish Cora service succeeds against local and hosted `demo` records. Hosted Cora source, schema and model bindings match the working local implementation. The underlying hosted failure is still awaiting a fresh request after diagnostic deployment.
- Provider failures now retain only HTTP status, model and a bounded uppercase reason identifier for server logs. AI route errors log these identifiers, or an unexpected error's name/SQL state, with the request ID; provider messages, patient prompts and credentials are excluded. Public error responses remain unchanged. Seven regression tests cover sanitization, malformed error bodies and fallback; all 62 API tests, API typecheck/lint and the Worker dry run pass.
- Deployed diagnostic version `4a235aa4-76d4-420b-89e5-986d41a0fb34`; previous version `d4174824-b671-4604-aab8-5f182fb606a0`. No credentials or database records were changed. Hosted health remains OK. The fix is not yet confirmed on the phone.
- Root cause found: Google closed `models/{model}:generateContent` to this account (instant empty HTTP 404 on every model, with both the old and a new key; `gemini-2.5-flash` says it is closed to new users). `geminiClient.ts` now calls the Interactions API (`POST /v1beta/interactions`, `store: false`, `system_instruction`, `generation_config` with `thinking_level: minimal`, `response_format` JSON Schema; legacy uppercase `responseSchema` types are lowercased). Same models. All six AI schemas verified live; local patient Cora (HTTP 200, 3.5 s) and card OCR verified end to end. Deployed to the Worker as version `c472bd32-4caa-48e9-b67e-86a9ae1bd229` (production key unchanged); hosted Cora then failed with Gemini HTTP 400 `API_KEY_INVALID`: the Worker secret held a stale/garbled key (first piped `secret put` did not fix it; pasting interactively did). Fixed 03:31 UTC; hosted patient Cora verified HTTP 200 in 3.5 s on version `ca29ceeb`. Also added `placement.region: gcp:asia-southeast1` (`HKG` was only the ingress colo, not the cause; kept to sit next to Neon Singapore) and made provider diagnostics read Google gateway errors (array body, `details[].reason`, e.g. `API_KEY_INVALID`); staff AI routes untested end to end because every seed staff account has MFA enrolled.

## [2026-10-27] Expo SDK 58 upgrade
- Updated the patient app to Expo 58.0.19 / React Native 0.88.0 and SDK-matched native modules. React and ReactDOM are pinned to 19.3.0 across the monorepo, including root overrides, so native modules and both apps resolve one React runtime.
- Migrated input/scroll refs to React Native's strict instance types and moved the splash image/color configuration into `expo-splash-screen`. Generated the ignored iOS project for the new scene lifecycle; retained the original Expo Go launch scripts. The prior generated native project was preserved outside the repo.
- Updated the Node requirement and physical-iPhone instructions, including the correct `EXPO_PUBLIC_API_BASE_URL` variable. Verified 115 tests, all workspace typechecks, web production build, ESLint (0 errors; 118 existing warnings), Expo Doctor (20/20), SDK dependency alignment, formatting, and iOS + Android bundle export.
- Runtime smoke check: Expo Go 58.0.7 on the iPhone 14 Plus simulator (iOS 26.5) rendered the patient sign-in screen without runtime errors; hosted API health returned database OK. The physical iPhone still needs the user's scan and same-account Expo Go sign-in.
- Dependency audit: 12 advisories (6 moderate, 6 high), down from 15 (9 moderate, 6 high) in the original lockfile. Remaining reports are inherited Expo CLI/certificate tooling, Zod, Cloudflare tooling and Drizzle tooling chains; automatic force-fixing proposes incompatible downgrades. No force fix applied.

## [2026-10-24] Product video: new narrator, 4:30 cut, motion and type pass
- New male narrator for S3–S14 (updated takes) replaces Neil; Mara (S1–S2) unchanged. Every scene's cues re-timed to the new takes' phrases; total exactly 4:30 (270.0 s), with the extra breathing room after the voice in S4, S11 and the S14 logo hold.
- Motion, revised the same day after owner review: text, text boxes, phones, monitor and photos are **static** again (a plain fade/rise entrance; no bounce, float or sway; an earlier overshoot-and-float pass was rejected). Entertainment now comes from graphics: Material Symbols icons (Apache 2.0, `source/fonts/`) on pain cards, the S3 list, S4 diagram, S11 rows, S12 audience cards and every dashboard caption; count-up stats in S3; S4 arrows that draw in with dots flowing along them; S2's montage as one-word beats ("Ask. Wait. Ask again. Wait."); a teal glow behind the phone.
- Color: one accent per pain point (`storyboard.PAIN_COLORS`: coral, amber, violet, sky, pink) across S3, the Act III pain screens (big numeral beside the card, icon badge) and S11. No edge stripes on cards.
- Type: film palette in `source/fonts/` (SIL OFL, licences beside the files): Bricolage Grotesque (display, condensed for money), Instrument Serif upright (the family's lines), JetBrains Mono (labels, timestamps, sources); Avenir Next stays for UI-style body text. `storyboard.text/chip` take an optional `face`.
- Fixed S11's highlight tint, which drew as solid teal (RGBA fills don't blend on an RGBA layer).

## [2026-10-23] Product video V4 first full cut
- Built the compositor (`docs/media/production/source/compose*.py`) and rendered the 4:50 film to `render/medcore-v4.mp4` (1920×1080, 30 fps, −14.8 LUFS): all 14 scenes, script clip fixes, slide transitions, touch dots, click SFX and a ducked music bed. The cut uses a temporary voice-over and four illustrations cropped from existing art.

## [2026-10-22] Product video V4 pre-production (`docs/media/production/`)
- Remade the production package around five pain points, each answered by the working feature: script V4 (4:50, 14 scenes, `script/MEDCORE_SCRIPT_V4.md`), narration and cue sheet, 30-frame storyboard in desktop and iPhone 17 Pro frames, V4 cast (Tatay Ramon, Mara, Lina).
- Recorded 7 dashboard clips with a scripted cursor and click log, plus 13 new dashboard screenshots (local fictional data; disposable account `film.capture@stjude.example.test`). Synthesized SFX library plus an original 120 BPM music bed. No film rendered yet, per the owner.
- V3 film, renders, audio, captions and legacy clips moved to `docs/media/archive/production-v3-2026-10-14/`.
- Re-shot all 7 dashboard clips after a full dry run, and recorded all 6 iPhone clips (bill, Cora in Ilokano, question, plan, pay, pass) on a Release build through Xcode DeviceHub with OCR-verified taps; Cora was shot on `gemini-3.1-flash-lite` after the 3.5 Flash Lite free-tier quota ran out. Script rev. B now matches the footage (Grace Reyes thread, Ramon Santos as the single HMO-LOA breach, clip crop notes). Local demo data re-dated to realistic discharge minutes.

## [2026-10-17] v2 AI suite, operational parity, acceptance test sign-off, and live deployment
- Full `TESTING_GUIDE.md` acceptance suite executed and verified (`PASS`) across mobile simulator and web dashboard; merged `rebuild/medcore-v2` into `main`.
- Ported the complete Gemini AI stack (`coraService`, `claimsForensicService`, `hmoAppealService`, `executiveBriefingService`, `ocrService`, `phiScrubber`, `aiResultCache`, `coraScope`, `coraLanguage`) to `apps/api/src/services/ai/` and mounted `/api/v1/staff/ai/*` and `/api/v1/patient/ai/*` with per-user/IP rate limits, RA 10173 PHI scrubbing, and audit logging.
- Added operational v2 API endpoints: patient coverage details (`GET /api/v1/patient/stays/:id` with `philhealth` and `hmo` objects plus `bedCode`/`roomCategory`), admission edits (`PATCH /api/v1/staff/encounters/:id`), simulated SMS/billing notifications (`POST /api/v1/staff/encounters/:id/notify`, `GET /api/v1/staff/notifications`, `POST /api/v1/staff/notifications/mark-read`, `GET /api/v1/staff/notifications/sms-outbox`), facility SLA settings (`GET/PUT /api/v1/staff/facility`), and promissory installment payment (`POST /api/v1/staff/promissory-notes/:id/installments/:seq/pay`).
- Restored RCM Analytics (`RcmAnalyticsPage`), Claims & eSOA AI scrubber (`ClaimsEsoaPage`), Executive AI Briefing (`CommandCenterPage`), HMO appeal drafter (`EncountersLedgerPage`), HMO roster (`CoverageApprovalsPage`), and Facility SLA settings (`ConfigurationPage`) across web and mobile `v2Bridge.ts` while keeping v1 security anti-patterns (demo role switching, patient password login) retired.
- Deployed v2 stack to production/demo cloud: migrated and seeded Singapore Neon `demo` (`br-small-hall-azzh041j`, 8 staff accounts, 36 beds, 22 stays, patient email aliases `mcleinonza0531+…@gmail.com`), uploaded `DATA_ENCRYPTION_KEY`, `GATE_PASS_SECRET`, and `GEMINI_API_KEY` to Cloudflare Worker `medcore-backend` (version `f6062a1e-d871-49e0-ba0a-55ee1a48ac3f`), and restored root `vercel.json` for `https://med-core1.vercel.app` (`/api/health` verified 200 OK).

## [2026-10-17] Original v1 UI restored on v2
- Mobile uses the original screens and assets through `apps/mobile/src/lib/v2Bridge.ts`; verified email-code/MRN+DOB sign-in, disputes, card/bank payments, receipts, payment plan, exit pass, onboarding and unavailable AI in the iOS simulator. Mobile commit: `7b8ecc3`.
- Dashboard uses `apps/web/src/v1/` and its API bridge, retaining v2 staff login, invitations, MFA/account, patients, staff administration and audit log. No role switching or mock financial/analytics results. The API/security routes are unchanged.
- Browser verification: local admission → charge → MGH/start → CFO PF sign with reason → pharmacy → finalize/send → QR Ph settlement → six-digit exit pass → one-time lobby verification. Claims XML, unavailable AI/notifications, all sidebar pages and restricted lobby navigation checked. Laptop/desktop responsiveness checked; tall dialogs scroll safely.
- Validation records: `apps/mobile/validation/v2-original-ui.md`, `apps/web/validation/v2-original-ui.md`. Unimplemented server features remain in `docs/v2/API_GAPS.md`.

## [2026-10-16] v1 look restored on v2 (branch `rebuild/mobile-v2`)
- Dashboard: v1 tokens (SF font at 90%, #087F70 teal, mint selection), floating top bar, grouped sidebar with badges, split sign-in, Overview tiles and cards. New pages from v1: Discharge Clearance board, pre-admission estimator (now on `computeWaterfall`), read-only Settings & Rules.
- Mobile: badge + wordmark header, floating pill tab bar, round shortcuts, teal bill card on a mint band, grouped Profile, Hospital updates.
- `packages/icons` (`@medcore/icons`): the v1 Solar geometry (CC BY 4.0) shared by both apps. Gap list: `docs/v2/API_GAPS.md`.

## [2026-10-16] v2 patient mobile app (branch `rebuild/mobile-v2`)
- `apps/mobile` (Expo 57, RN 0.86.3, React 19.2.3) talks only to `/api/v1/auth/patient/*` and `/api/v1/patient/stays/*`. Tabs: Home, Bill, Coverage, Payments, Profile; stack: Documents, Pay, Payment plan, Question a charge. No AI screens.
- `src/lib/apiClient.ts` (bearer token, CSRF header on anonymous sign-in calls, Idempotency-Key on payments, card = brand + last 4 only, 401 clears the session) and `src/lib/tokenStore.ts` (expo-secure-store `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, serialized writes so sign-out always wins). Vitest: 25 tests.
- Monorepo quirk: web hoists React 19.3 to the root; `metro.config.js` and `tsconfig.json` pin React to the app's own 19.2.3.
- Dashboard (`apps/web`) logo and favicon switched to the shield badge from `logo/MedCore_Badge_Logo.png` (user request).

## [2026-10-16] v2 rebuild on branch `rebuild/medcore-v2`
- Fresh monorepo: `packages/domain`, `apps/api`, `apps/web`; old apps removed on that branch only. README.md and DEPLOY.md describe setup, security model and deployment. CI in `.github/workflows/ci.yml` (typecheck, lint, prettier, tests with a Postgres service, build, `npm audit --omit=dev`).
- Migrations `apps/api/drizzle/0000_init.sql` (generated) and `0001_hardening.sql` (immutability/no-delete triggers). Local dev DB `medcore_v2_dev`; tests create and drop `medcore_v2_test`.
- Browser check found and fixed: Field ARIA props leaking as DOM attributes, `₱-0.00` from negative zero, sign-in audit rows recorded as anonymous.

## [2026-10-16] Audit C2 closed, login rate limit (C3)
- Removed `POST /api/v1/auth/register` (MRN + phone + password) and `/forgot-password` from `routes/auth.ts` and `publicAuth`. Anonymous calls now get 401 from the auth wall; signed-in calls get 404. Stays are linked only through `/auth/otp/*` with purpose REGISTER.
- New Workers rate limiter `PATIENT_AUTH_LIMITER` (namespace 2005, 10 per 60 s) in `wrangler.jsonc`. `otp.ts` already used it; `/auth/login` now checks it per IP and per email and returns 429 `RATE_LIMITED`. Not deployed yet.

## [2026-10-16] Patient email-code sign-in (audit C2, §4)
- `POST /api/v1/auth/otp/request` and `/verify` (`apps/server/src/routes/otp.ts`), ported from AdvanCare ADV-AUTH-001: 6-digit codes, sha256 stored, 10 min, 5 tries, 5 per hour, newest code only, race-safe consume. REGISTER sends only to the hospital-recorded `patients.email` (MRN + phone pick the record, decoy mask when nothing matches). Patient sessions last 30 days; `revoked_at` is honoured, `last_seen_at` is touched hourly, and logout now revokes instead of deleting.
- Mailer `apps/server/src/services/mailer.ts`: dependency-free SMTP. It loads `cloudflare:sockets` lazily on Workers and `node:tls` on Node. With `NODE_ENV=development` and no SMTP, the code is logged; anywhere else that returns 503.
- Migration `0006_patient_email_otp.sql` (OTP pieces of §3 only: `login_codes`, `patients.email`, `patient_account_links` with a LEGACY_MRN backfill of 2 links, `lower(email)` unique, nullable password with a staff CHECK, session columns). Applied to Neon **demo** only via `npm run db:otp`, which refuses production. Not recorded in `__drizzle_migrations` (D12 drift; the drifted `ai_*` tables were left out of the SQL).
- Mobile `AuthScreen`: email → code (auto-submits on the sixth digit), "Link your hospital stay" (MRN + phone → code), password kept as a secondary path for demo accounts. Token still in SecureStore.
- Tests: `npm run test:otp` (8 mailer checks + 13 flow checks on a disposable local DB `medcore_otp_validation`, SMTP blanked).
- Deployed 2026-10-16 (merged with main's section-0 fixes): Worker version `40bdc37b…`, sender `medcore1.noreply@gmail.com` via `SMTP_USER` / `SMTP_PASSWORD` secrets. Demo emails seeded as `mcleinonza0531+…@gmail.com` aliases (2 guarantors, 9 patients). Live `/otp/request` returned 202 with real delivery.
- Re-run `npm run seed:otp-emails -- mcleinonza0531@gmail.com` after any reseed: `scripts/seedPostgres.ts` still seeds juan/ramon.delacruz@gmail.com.

## [2026-10-16] AI audit tables on demo (audit D12)
- `ai_conversations` and `ai_audit_logs` existed only in `schema.ts`, so `recordAiAudit` writes were silently skipped. Added `0007_ai_audit_tables.sql` (`IF NOT EXISTS`, guarded FKs; first committed as 0006, renumbered after `0006_patient_email_otp`) and `npm run db:ai-audit` (refuses `NEON_BRANCH=production`). Applied to `demo` only. A hosted Cora call then wrote a `SUCCESS` audit row.
- `__drizzle_migrations` on `demo` still records only 0000–0003 (0004–0007 applied by scripts). Do not run `drizzle-kit migrate` there until it is reconciled. The audit's remaining draft security migration is now 0008.

## [2026-10-16] Audit section-0 demo fixes (C1, H5, H9, H10, M4)
- No login password prefill. `seedPostgres.ts` and the test scripts read `SEED_PASSWORD` (12+ chars). The mobile demo CFO principal requires `MOBILE_DEMO_ENABLED=true` (set in `wrangler.jsonc`). `.env.example` `GATE_PASS_SECRET` is blank.
- `DELETE /encounters/:id` is CFO-only and returns 409 once any payment, note or pass exists. Physicians can sign only their own encounters. AI routes cap free text and OCR size and use `AI_LIMITER` (10/60 s).
- Hosted passwords rotated on `demo` with `scripts/rotateSeedPasswords.ts` (14 of 15 accounts, sessions revoked). Worker version `810c41bf…` deployed; Vercel rebuilt. `medcore1.vercel.app` serves an unrelated site but is still in the credentialed CORS list (H8).

## [2026-10-16] Security audit and Singapore database
- Audit report `docs/audits/2026-10-16/SECURITY_AND_ARCHITECTURE_AUDIT.md` (3 critical, 10 high findings, draft security migration, OTP design). No code changed.
- Database moved from Neon Ohio to Singapore project `medcore-sg`: `production` (schema only) and `demo` (full copy, 21 tables matched, payments total ₱43,300.00). Hyperdrive repointed to `demo` direct endpoint; live health 200 with 248 encounters, about 435–463 ms warm. `neon.ts` added and repo linked.

## [2026-10-14] Final polish, mascot, screenshots, video
- Shared dashboard tokens and mobile tab bar refreshed (Solar icons). Cora mascot with blink and tilt animation replaces sparkle icons.
- `UI_SCREENSHOTS/` recaptured (76 images plus two WebM walkthroughs), mirrored to `docs/media/assets/ui/`. Video direction and narration cues synchronized with recorded feature demonstrations.

## [2026-10-13] Product video V3 and SMS presentation
- V3 production brief, narration cues and team portraits manifest. Notices and disclaimers removed from the film; dashboard SMS toast simplified.

## [2026-10-12] Apple-style UI, Cora languages, AI cache, SMS sandbox
- Dashboard shell and mobile Home refreshed. Cora gains Tagalog and strict language checks. Shared `ai_result_cache` (migration 0004) deployed, backend `2ae8c460…`. SMS sandbox engine (migration 0005) deployed, backend `8ec21c04…`. Approvals & Disputes page sizes tuned.

## [2026-10-11] Performance, AI integrity, Cora policy
- Census latency 26.2 s cold to 16.7 s and 234 ms warm; shared pool, SWR hydration, lazy pages (main chunk 809 kB to 504 kB), mobile polling 12 s.
- Runtime AI mocks removed; Hyperdrive SQL caching disabled after a stale-read root cause; hosted verifier passed all five AI services. Cora topic gate and policy deployed (`d31b7887…`, later `73a0ce2b…`). Native OCR scanner now uses real images. Fixed a Claims/eSOA initial-render null crash. Overlays rebuilt as `ViewportOverlay` and `ModalOverlay`.

## [2026-10-10] Sync, notifications, hosted deployment, AI suite
- Backend with finalize-bill, send-bill and notifications published to the Worker (`650e0bae…`). Hosted Neon holds the mobile demo principal and a patient account. Staff notifications (migration 0003), unified header search, shared gate-pass payload and QR, login screen redesign.
- AI features delivered: claims scrubber, HMO appeal drafter, executive briefing, Cora, OCR scanner (14 AI tests, 88 API, 250 financial, 49 mobile).

## [2026-10-09] Master audit and remediation
- First master audit was BLOCKED by sandbox DB access; remediation then landed: shared waterfall engine, transactional mutations, server-authoritative dashboard, keyed exit PIN, `OR-SJMC` receipts, DAR formula, XML namespaces. Government ID validation, mobile administrator account, onboarding SVGs and animated preload, gesture-refresh hook, analytics card alignment, A4 printing. Reports in `docs/audits/2026-10-09/`.

## [2026-10-08] Mobile reference match and simulated payments
- Close reference-match UI pass, Expo Go SDK alignment fixes, annotated refinements, backend-owned simulated payments for four rails, Final LOA toast and confirmation lifecycle fixes, reusable A4 print engine.

## [2026-10-06–07] Mobile patient companion
- `apps/mobile` Expo patient app against the shared backend: sign-in, registration, bills, coverage, payments, documents, receipts, notifications. Independent audits cleared it as a prototype, not production.

## [2026-10-03] Cloudflare Workers and Vercel authentication
- Worker deployed with Hyperdrive and secret isolation. Fixed CORS regex for `medcore1.vercel.app`, Vercel `/api` proxy, `X-Forwarded-For` overflow, Hyperdrive pool starvation (error 1101), isolate socket lifecycle, and print root and logo defects.

## [Sep 26 – Oct 2] Dashboard foundation
- Built the eight-route Command Center, light-mode enterprise visual system, Master/Detail discharge workstation, 250-patient realistic dataset (100% reconciliation), RCM analytics suite, feature-sliced reorganization, confirmation modals, print engine, REM-scale density pass, PostgreSQL backend with Drizzle, atomic payment settlement and idempotency, the 14-finding code-review remediation, navigation simplification, shared control primitives, client separation and Vercel setup.
- Product framing: PGC Digital Innovation Challenge alignment, competitive positioning and statutory research (see `NOTES.md`).
