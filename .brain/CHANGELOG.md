# AQROMED / MedCore: Changelog (Operational Brain)

Newest first, condensed. Detail for each entry lives in `docs/validation/`, `docs/audits/`, `docs/implementation/` and `apps/*/validation/`. Decisions are in `DECISIONS.md`.

## [2026-10-24] Product video: new narrator, 4:30 cut, motion and type pass
- New male narrator for S3–S14 (owner's ElevenLabs takes) replaces Neil; Mara (S1–S2) unchanged. Every scene's cues re-timed to the new takes' phrases; total exactly 4:30 (270.0 s), with the extra breathing room after the voice in S4, S11 and the S14 logo hold.
- Motion, revised the same day after owner review: text, text boxes, phones, monitor and photos are **static** again (a plain fade/rise entrance; no bounce, float or sway; an earlier overshoot-and-float pass was rejected). Entertainment now comes from graphics: Material Symbols icons (Apache 2.0, `source/fonts/`) on pain cards, the S3 list, S4 diagram, S11 rows, S12 audience cards and every dashboard caption; count-up stats in S3; S4 arrows that draw in with dots flowing along them; S2's montage as one-word beats ("Ask. Wait. Ask again. Wait."); a teal glow behind the phone.
- Color: one accent per pain point (`storyboard.PAIN_COLORS`: coral, amber, violet, sky, pink) across S3, the Act III pain screens (big numeral beside the card, icon badge) and S11. No edge stripes on cards.
- Type: film palette in `source/fonts/` (SIL OFL, licences beside the files): Bricolage Grotesque (display, condensed for money), Instrument Serif upright (the family's lines), JetBrains Mono (labels, timestamps, sources); Avenir Next stays for UI-style body text. `storyboard.text/chip` take an optional `face`.
- Fixed S11's highlight tint, which drew as solid teal (RGBA fills don't blend on an RGBA layer).

## [2026-10-24] Repository cleanup
- Removed the duplicate `UI_SCREENSHOTS/` (identical to `docs/media/assets/ui/`; its WebM walkthroughs moved to `docs/media/assets/ui/recordings/`). Brand sources from `logo/` now live in `docs/media/assets/logos/`; `product video inspo/` moved to `docs/media/assets/references/video-inspo/`. References, ESLint and Prettier ignores updated; `.claude/` and `.agents/` removed and added to `.gitignore`.
- Removed stale docs: `handoff.md` (completed v1-UI port), `skills-lock.json`, the V2 and canonical video prompts (byte-identical to V3), `docs/architecture/API_CONTRACTS.md` (v1 API spec) and `docs/implementation/hosted-and-local-api.md` (v1 `apps/server` deploy state). Untracked v1 leftovers (`apps/dashboard`, `apps/server`, empty `packages/shared`) moved to the macOS Trash.
- Verified after the move: typecheck, web build, 115 tests, Prettier, and an Expo iOS + Android bundle export. The dashboard serves its logo from `apps/web/public/logo/`, the mobile app from `apps/mobile/assets/brand/`, so neither depended on the moved folders.

## [2026-10-23] Product video V4 first full cut
- Built the compositor (`docs/media/production/source/compose*.py`) and rendered the 4:50 film to `render/medcore-v4.mp4` (1920×1080, 30 fps, −14.8 LUFS): all 14 scenes, script clip fixes, slide transitions, touch dots, click SFX and a ducked music bed. The voice-over is a temporary macOS read, because the ElevenLabs key lacks TTS permission. The four new illustrations are crops of existing art, because the Gemini free tier has no image quota.

## [2026-10-22] Product video V4 pre-production (`docs/media/production/`)
- Remade the production package around five pain points, each answered by the working feature: script V4 (4:50, 14 scenes, `script/MEDCORE_SCRIPT_V4.md`), generated narration/cue sheet, 30-frame storyboard in desktop and iPhone 17 Pro frames, V4 cast (Tatay Ramon, Mara, Lina).
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
- `UI_SCREENSHOTS/` recaptured (76 images plus two WebM walkthroughs), mirrored to `docs/media/assets/ui/`. Video prompt, cues and ZIP synchronized with genuine Gemini output captures.

## [2026-10-13] Product video V3 and SMS presentation
- V3 masterclass prompt, narration cues, team portraits manifest and handoff ZIP. Notices and disclaimers removed from the film; dashboard SMS toast simplified.

## [2026-10-12] Apple-style UI, Cora languages, AI cache, SMS sandbox
- Dashboard shell and mobile Home refreshed. Cora gains Tagalog and strict language checks. Shared `ai_result_cache` (migration 0004) deployed, backend `2ae8c460…`. SMS sandbox engine (migration 0005) deployed, backend `8ec21c04…`. Approvals & Disputes page sizes tuned.

## [2026-10-11] Performance, AI integrity, Cora policy
- Census latency 26.2 s cold to 16.7 s and 234 ms warm; shared pool, SWR hydration, lazy pages (main chunk 809 kB to 504 kB), mobile polling 12 s.
- Runtime AI mocks removed; Hyperdrive SQL caching disabled after a stale-read root cause; hosted verifier passed all five AI services. Cora topic gate and policy deployed (`d31b7887…`, later `73a0ce2b…`). Native OCR scanner now uses real images. Fixed a Claims/eSOA initial-render null crash. Overlays rebuilt as `ViewportOverlay` and `ModalOverlay`.

## [2026-10-10] Sync, notifications, hosted deployment, AI suite
- Backend with finalize-bill, send-bill and notifications published to the Worker (`650e0bae…`). Hosted Neon holds the mobile demo principal and a patient account. Staff notifications (migration 0003), unified header search, shared gate-pass payload and QR, login screen redesign.
- Multi-agent AI suite delivered: claims scrubber, HMO appeal drafter, executive briefing, Cora, OCR scanner (14 AI tests, 88 API, 250 financial, 49 mobile).

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
