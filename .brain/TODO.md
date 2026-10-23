# AQROMED / MedCore: TODO (Operational Brain)

Status key: ⬜ to do · ✅ done · 👤 needs the owner. Order inside each group is priority order.

## 0. v2 rebuild (`rebuild/medcore-v2`)
- ✅ (2026-10-17) Manual acceptance guide: `TESTING_GUIDE.md`, linked from README. Includes current staff accounts and three verified patient MRN/DOB sign-ins, cross-app payment/dispute/plan/pass checks, role isolation, responsive layouts, known gaps and a replacement decision sheet. Test actions change local fictional data; the guide does not replace `main`.
- ✅ (2026-10-17) Original v1 mobile and dashboard restored on the v2 API, with v2 staff login/MFA preserved. Mobile simulator and dashboard browser workflow verified; validation records under each app's `validation/`.
- ✅ (2026-10-17) Ported v1 server capabilities (`docs/v2/API_GAPS.md`): AI stack (`Cora`, OCR, claims scrubber, HMO appeals, executive briefing), staff notifications/simulated SMS outbox, patient claim status & coverage detail, full RCM analytics, facility SLA configuration, admission edits, and promissory installment collection.
- ✅ (2026-10-16) Domain package, hardened API, staff dashboard (patient web portal later removed: patients use the mobile app); 86 tests (31 domain incl. property tests, 55 API against real Postgres); browser-verified sign-in with MFA enrollment, payment → clearance → exit pass, patient code sign-in, 0% payment plan.
- ✅ (2026-10-17) Full acceptance test suite (`TESTING_GUIDE.md`) passed and branch merged into `main`.
- ✅ (2026-10-16) Mobile app rebuilt as `apps/mobile` on branch `rebuild/mobile-v2` (cut from `rebuild/medcore-v2`, not merged): code sign-in, bill, question a charge, simulated card payment, payment plan, exit pass QR/PIN, logout. Verified in the iOS simulator (Expo Go) against the local v2 API; 25 tests for the API client and token storage.
- ✅ (2026-10-16) v1 look restored on v2 (dashboard and mobile share palette, type and Solar icons via `packages/icons`); Discharge Clearance board, cost estimator, rules page and mobile Hospital updates carried over.
- ⬜ Mobile follow-ups: EAS dev build and signed builds, physical-device checks (keychain, Dynamic Type, VoiceOver), push notifications when a bill is ready, refund display once the API has refunds.
- ✅ (2026-10-17) Port the AI layer (PHI scrubber, Cora, OCR, claims scrubber, appeals, briefing) onto v2 with per-user rate limits and input caps.
- ✅ (2026-10-17) Deploy: Neon `demo` branch migrated and seeded with v2 schema, Hyperdrive id (`b611eac58efa4966b649dfa7d1631b2a`) + secrets deployed on Cloudflare Worker `medcore-backend` (`f6062a1e-d871-49e0-ba0a-55ee1a48ac3f`), and Vercel `https://med-core1.vercel.app` connected via root `vercel.json`.
- ⬜ Refunds/reversals flow for `ledgers.credit_cents` (a waiver after payment shows a refund due but there is no refund action yet). Official PhilHealth eSOA DTD conformance still unproven.
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
- 👤 Delete the Ohio Neon project after the rollback window (permanent). (Local Ohio `.env` backups deleted 2026-10-22.)
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
- ⬜ Product video V4 (`docs/media/production/README.md`). Done 2026-10-22/23: script rev. B, all clips, SFX and music bed, and the compositor (`source/compose*.py`), which renders the full 4:50 cut to `render/medcore-v4.mp4` with the clip fixes, transitions, touch dots, click SFX, ducked mix and −14 LUFS master. Remaining:
  1. 👤 **Approve script rev. B** (`script/MEDCORE_SCRIPT_V4.md`), especially the reworded S8 narration (no SMS claim), and review the rendered cut.
  3. ✅ Four illustrations made by the owner in the Gemini app (2026-10-23) and placed in `characters/`. The S1 time-lapse spins the clock painted in `s1-ready-bed.png`. Re-render pending, done together with the voice-over.
  4. ✅ Music: keep the procedural bed (`audio/music-bed.wav`), decided 2026-10-23.
  5. ⬜ Regenerate the storyboard (`source/storyboard.py`); its frames predate the re-shoot. Low priority now that stills come from `compose.py --still`.
  6. 👤 **Review** `render/medcore-v4.mp4` (rendered 2026-10-23: 4:31, synced to the voice-over, real voices, illustrations, BizBox and KCCI MedSys logos in S12, YEP photos in S14) against the competition checklist and honesty notes.
  7. ⬜ 15-second teaser (S1 hook, S5 waterfall, S9 payment, logo): wanted, after the final cut.
  8. ✅ `render/`, `footage/` and `audio/` under `docs/media/production/` are git-ignored (kept locally only).
- 👤 Gemini key is on the free tier (15 RPM for Flash Lite). Cora makes ~3 calls per answer, so it stalls or 503s under light load. Set up billing before the Dec 10 pitch, and replace the dead `GEMINI_PRO_MODEL=gemini-1.5-pro-latest` fallback in `.env`.
- ⬜ Fix rough edges found while filming: "View discharge pass"/"View Gate Pass" open Documents instead of the pass; the appeal letter prints a raw ISO deadline and the admission date; the analytics AR aging (₱39.0 M) is inconsistent with ₱442.8 K billings; the clearance header labels the encounter number as MRN; the Home draft-bill state overlaps the patient name; Cora's money explanations vary between calls (once ₱350 → ₱3,500, once said the HMO ₱5,000 made up the balance), so ground the reply's numbers in the ledger; RN warning "Unsupported dashed / dotted border style".
- ⬜ Dashboard main JS chunk is 570 KB (Vite 500 KB warning); consider further splitting.
- 👤 PGC Digital Innovation Challenge presentation 2026-12-10, SP Session Hall, Capitol Compound, Tuguegarao City (12-slide deck `MedCore_Presentation_Deck.pptx`, 5-minute pitch and 10-minute defense).
