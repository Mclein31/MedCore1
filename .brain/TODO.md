# AQROMED / MedCore: TODO (Operational Brain)

Status key: ⬜ to do · ✅ done · 👤 needs the owner. Order inside each group is priority order.

## 0. v2 rebuild (`rebuild/medcore-v2`)
- ✅ (2026-10-17) Original v1 mobile and dashboard restored on the v2 API, with v2 staff login/MFA preserved. Mobile simulator and dashboard browser workflow verified; validation records under each app's `validation/`.
- ⬜ Remaining v1 server capabilities: `docs/v2/API_GAPS.md` (AI, notifications/SMS, patient claim status/coverage detail, full RCM analytics, procedure bundles/scheduled admissions, configuration, admission/charge edits).
- ✅ (2026-10-16) Domain package, hardened API, staff dashboard (patient web portal later removed: patients use the mobile app); 86 tests (31 domain incl. property tests, 55 API against real Postgres); browser-verified sign-in with MFA enrollment, payment → clearance → exit pass, patient code sign-in, 0% payment plan.
- 👤 Review the branch and decide whether it replaces `main` (sections A–C below describe `main`).
- ✅ (2026-10-16) Mobile app rebuilt as `apps/mobile` on branch `rebuild/mobile-v2` (cut from `rebuild/medcore-v2`, not merged): code sign-in, bill, question a charge, simulated card payment, payment plan, exit pass QR/PIN, logout. Verified in the iOS simulator (Expo Go) against the local v2 API; 25 tests for the API client and token storage.
- ✅ (2026-10-16) v1 look restored on v2 (dashboard and mobile share palette, type and Solar icons via `packages/icons`); Discharge Clearance board, cost estimator, rules page and mobile Hospital updates carried over. Remaining v1 features that need API work: `docs/v2/API_GAPS.md` (coverage details for patients, notifications, RCM analytics, statements, admission edits, HMO worklist, promissory list, facility settings).
- ⬜ Mobile follow-ups: EAS dev build and signed builds, physical-device checks (keychain, Dynamic Type, VoiceOver), push notifications when a bill is ready, refund display once the API has refunds.
- ⬜ Port the AI layer (PHI scrubber, Cora, OCR, claims scrubber, appeals, briefing) onto v2 with per-user rate limits and input caps.
- ⬜ Deploy: Neon branch + Hyperdrive id + secrets in `apps/api/wrangler.jsonc`, API host in `apps/web/vercel.json` (see `DEPLOY.md`). Not deployed anywhere yet.
- ⬜ Refunds/reversals flow for `ledgers.credit_cents` (a waiver after payment shows a refund due but there is no refund action yet). Promissory installment collection tracking. Official PhilHealth eSOA DTD conformance still unproven.
- ⬜ Dependency advisories (2026-10-17 root audit): 26 total (11 moderate, 15 high), including inherited Expo/tooling dependency chains. Resolve through compatible upstream upgrades; do not force breaking SDK changes as part of the UI port.

## A. 2026-10-16 audit remediation (`docs/audits/2026-10-16/SECURITY_AND_ARCHITECTURE_AUDIT.md`)
Run in fresh sessions. Test migrations on a Neon branch first, and never seed or reset anything but `demo`.

**Phase 0: close the open doors**
- ✅ C1 (2026-10-16): rotate hosted passwords, remove the dashboard login prefill, make the seed read `SEED_PASSWORD` from the env and refuse remote hosts, put the demo principal behind a flag. The shared seed password is probably live on the hosted DB and a CFO account can browse all patients.
- ✅ H5 (2026-10-16): blank `.env.example`. Rotate `GATE_PASS_SECRET` if it was ever used.
- ⬜ H8: confirm ownership of the hard-coded Vercel origins, then move them to `ALLOWED_ORIGINS`.
- ⬜ C3: rate limiters on login, sign-in codes and AI are done (`PATIENT_AUTH_LIMITER`, `AI_LIMITER`). Still to do: PIN verify limiter and DB lockout on login and PIN.
- ⬜ H4: add `env.ts` with a production default. `GATE_PASS_SECRET` is required outside explicit development. Remove the public fallback secret.
- ✅ H9 (2026-10-16): disable encounter hard-delete (409 once any payment, note or pass exists). H10: scope physician sign-off to the attending physician (both done).
- ⬜ H2 quick part: `SameSite=Strict`, since the dashboard is already same-origin.

**Phase 1: identity (next 2 weeks)**
- ⬜ Rest of the draft security migration (now `0008`, since 0006 is patient OTP and 0007 is AI tables), run on a Neon branch first.
- ✅ C2 (2026-10-16): patient email OTP (`routes/otp.ts`, Gmail SMTP from `medcore1.noreply@gmail.com`), old MRN-and-phone registration removed.
- ⬜ Sessions and CSRF: H2 header check, H3 no web token in `localStorage`, H7 idle timeout (revocation via `revoked_at` is done).
- ⬜ H1 gate-pass PIN hashing and attempt limits; H6 login fixes; M1 spoofable client IP; M2 security headers; M5 public health endpoint leak.

**Phase 2: hardening**
- ⬜ Staff TOTP MFA and invitations (AdvanCare phase A).
- ⬜ Role matrix and audited PHI reads (M3), waiver separation of duties (M8), append-only audit (D15), retention cron (D13).
- ⬜ `PAYMENTS_MODE` (M6), dependency upgrades (M9). AI input caps (M4) done 2026-10-16.
- ⬜ Vitest, CI, split `encounters.ts`, lint.

## B. Database
- ⬜ Reconcile migration drift (audit D12): AI tables now exist (0007). Still record 0004–0007 in `drizzle.__drizzle_migrations` on `demo` before running `drizzle-kit migrate`.
- 👤 Delete the git-ignored `.env.ohio-backup`, `.env.ohio-direct` and `.env.migration` now that the switch is confirmed. Delete the Ohio Neon project after the rollback window (permanent).
- ⬜ For a real pilot, point Hyperdrive at the `production` branch (schema only, 0 rows).

## C. Release gates for the patient mobile app (prototype only today)
- ⬜ Abuse controls beyond the current rate limits (OTP identity is done, audit C2).
- ⬜ Backend-bound expiring magic links; the Clarify selector is a demonstration.
- ⬜ Real gateway confirmation and legal signing (currently simulated by design; see `DECISIONS.md`).
- ⬜ Production controls for staff simulation workflows.
- ⬜ Real PostgreSQL concurrency tests and physical-device checks (SecureStore, restart, logout, keyboard, safe areas, Dynamic Type, reduced motion, VoiceOver, native photo selection for the OCR scanner).
- ⬜ Resolve npm audit advisories compatibly (root 17: 6 moderate, 9 high, 2 critical; mobile 22: 7 moderate, 15 high). No forced downgrades.
- ⬜ Native EAS project setup and signed builds.

## D. Verification gaps
- ⬜ Exhaustive browser E2E certificate is BLOCKED: approval review rejected a live uncapped ₱21,000 QuickSign, and a user handoff is pending. Do not bypass the held action.
- ⬜ Official PhilHealth eSOA DTD conformance is unproven (current XML is syntactically valid with the circular namespaces).
- ⬜ Persisted 250-encounter and 200-bed parity, PostgreSQL rollback and concurrency, and native synchronization were verified only on local or synthetic setups.
- ⬜ Dashboard scorecard and footer metrics are legacy values, not certified live measurements.
- ⬜ Local sign-in: confirm which backend (local or hosted) the user's mobile account was created on; reseeding deletes locally created accounts and local and hosted accounts do not sync.
- ⬜ Hosted guarantor Juan (now `mcleinonza0531+juandelacruz@gmail.com`) resolves to a patient with zero encounters; positive live Cora tests use the mobile presentation principal.
- ✅ AI telemetry inserts (`ai_audit_logs`) work on `demo` since migration 0007.

## E. Publication and media
- 👤 Dashboard and mobile source changes from Oct 11–14 need normal publication: Vercel rebuild for the dashboard (explicit appeal Regenerate flag, SMS toast copy) and a Metro reload or rebuild for mobile.
- ⬜ Product video: render the final V3 film and corrected Ilokano narration audio, then re-check the handoff ZIP integrity, cue timeline and 18 source clips. No finished film exists yet.
- ⬜ Dashboard main JS chunk is 570 KB (Vite 500 KB warning); consider further splitting.
- 👤 PGC Digital Innovation Challenge presentation 2026-12-10, SP Session Hall, Capitol Compound, Tuguegarao City (12-slide deck `MedCore_Presentation_Deck.pptx`, 5-minute pitch and 10-minute defense).
