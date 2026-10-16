# AQROMED / MedCore: TODO (Operational Brain)

Status key: ⬜ to do · 👤 needs the owner. Order inside each group is priority order.

## A. 2026-10-16 audit remediation (`docs/audits/2026-10-16/SECURITY_AND_ARCHITECTURE_AUDIT.md`)
Run in fresh sessions. Test migrations on a Neon branch first, and never seed or reset anything but `demo`.

**Phase 0: close the open doors**
- ⬜ C1: rotate hosted passwords, remove the dashboard login prefill, make the seed read `SEED_PASSWORD` from the env and refuse remote hosts, put the demo principal behind a flag. The shared seed password is probably live on the hosted DB and a CFO account can browse all patients.
- ⬜ H5: blank `.env.example`. Rotate `GATE_PASS_SECRET` if it was ever used.
- ⬜ H8: confirm ownership of the hard-coded Vercel origins, then move them to `ALLOWED_ORIGINS`.
- ⬜ C3: rate limiters on login, register, PIN verify and AI; DB lockout on login and PIN.
- ⬜ H4: add `env.ts` with a production default. `GATE_PASS_SECRET` is required outside explicit development. Remove the public fallback secret.
- ⬜ H9: disable encounter hard-delete (409 once any payment, note or pass exists). H10: scope physician sign-off to the attending physician.
- ⬜ H2 quick part: `SameSite=Strict`, since the dashboard is already same-origin.

**Phase 1: identity (next 2 weeks)**
- ⬜ Migration `0006_security_hardening.sql`, run on a Neon branch first.
- ⬜ C2: email OTP for patients (ADV-AUTH-001 port, Gmail SMTP App Password over `cloudflare:sockets`, code to hospital-recorded `patients.email`). Retire MRN-and-phone-only registration. 👤 needs a Gmail App Password.
- ⬜ Sessions and CSRF: H2 header check, H3 no web token in `localStorage`, H7 revocation and idle timeout.
- ⬜ H1 gate-pass PIN hashing and attempt limits; H6 login fixes; M1 spoofable client IP; M2 security headers; M5 public health endpoint leak.

**Phase 2: hardening**
- ⬜ Staff TOTP MFA and invitations (AdvanCare phase A).
- ⬜ Role matrix and audited PHI reads (M3), waiver separation of duties (M8), append-only audit (D15), retention cron (D13).
- ⬜ `PAYMENTS_MODE` (M6), AI input caps (M4), dependency upgrades (M9).
- ⬜ Vitest, CI, split `encounters.ts`, lint.

## B. Database
- ⬜ Reconcile migration drift (audit D12): record or reconcile 0004 and 0005 in `drizzle.__drizzle_migrations`, and create or drop `ai_conversations` and `ai_audit_logs`, before running any new migration.
- 👤 Delete the git-ignored `.env.ohio-backup`, `.env.ohio-direct` and `.env.migration` now that the switch is confirmed. Delete the Ohio Neon project after the rollback window (permanent).
- ⬜ For a real pilot, point Hyperdrive at the `production` branch (schema only, 0 rows).

## C. Release gates for the patient mobile app (prototype only today)
- ⬜ Verified identity, OTP and abuse controls (overlaps audit C2, C3).
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
- ⬜ Hosted account `juan.delacruz@gmail.com` resolves to a patient with zero encounters; positive live Cora tests use the mobile presentation principal.
- ⬜ AI telemetry inserts (`ai_audit_logs`) were unavailable in the configured DB during live checks (nonblocking). Fixed by the D12 reconciliation above.

## E. Publication and media
- 👤 Dashboard and mobile source changes from Oct 11–14 need normal publication: Vercel rebuild for the dashboard (explicit appeal Regenerate flag, SMS toast copy) and a Metro reload or rebuild for mobile.
- ⬜ Product video: render the final V3 film and corrected Ilokano narration audio, then re-check the handoff ZIP integrity, cue timeline and 18 source clips. No finished film exists yet.
- ⬜ Dashboard main JS chunk is 570 KB (Vite 500 KB warning); consider further splitting.
- 👤 PGC Digital Innovation Challenge presentation 2026-12-10, SP Session Hall, Capitol Compound, Tuguegarao City (12-slide deck `MedCore_Presentation_Deck.pptx`, 5-minute pitch and 10-minute defense).
