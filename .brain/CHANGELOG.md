# AQROMED / MedCore: Changelog (Operational Brain)

Newest first, condensed. Detail for each entry lives in `docs/validation/`, `docs/audits/`, `docs/implementation/` and `apps/*/validation/`. Decisions are in `DECISIONS.md`.

## [2026-10-16] Security audit and Singapore database
- Audit report `docs/audits/2026-10-16/SECURITY_AND_ARCHITECTURE_AUDIT.md` (3 critical, 10 high findings, draft migration 0006, OTP design). No code changed.
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
