# AQROMED / MedCore: Changelog (Operational Brain)

Newest first, condensed. Detail for each entry lives in `docs/validation/`, `docs/audits/`, `docs/implementation/` and `apps/*/validation/`. Decisions are in `DECISIONS.md`.

## [2026-10-16] Patient email-code sign-in (audit C2, §4)
- `POST /api/v1/auth/otp/request` and `/verify` (`apps/server/src/routes/otp.ts`), ported from AdvanCare ADV-AUTH-001: 6-digit codes, sha256 stored, 10 min, 5 tries, 5 per hour, newest code only, race-safe consume. REGISTER sends only to the hospital-recorded `patients.email` (MRN + phone pick the record, decoy mask when nothing matches). Patient sessions last 30 days; `revoked_at` is honoured, `last_seen_at` is touched hourly, and logout now revokes instead of deleting.
- Mailer `apps/server/src/services/mailer.ts`: dependency-free SMTP. It loads `cloudflare:sockets` lazily on Workers and `node:tls` on Node. With `NODE_ENV=development` and no SMTP, the code is logged; anywhere else that returns 503.
- Migration `0006_patient_email_otp.sql` (OTP pieces of §3 only: `login_codes`, `patients.email`, `patient_account_links` with a LEGACY_MRN backfill of 2 links, `lower(email)` unique, nullable password with a staff CHECK, session columns). Applied to Neon **demo** only via `npm run db:otp`, which refuses production. Not recorded in `__drizzle_migrations` (D12 drift; the drifted `ai_*` tables were left out of the SQL).
- Mobile `AuthScreen`: email → code (auto-submits on the sixth digit), "Link your hospital stay" (MRN + phone → code), password kept as a secondary path for demo accounts. Token still in SecureStore.
- Tests: `npm run test:otp` (8 mailer checks + 13 flow checks on a disposable local DB `medcore_otp_validation`, SMTP blanked).
- 👤 Open: demo patients have no `patients.email` yet, and the two demo guarantors still use `juan.delacruz@gmail.com` / `ramon.delacruz@gmail.com`. Run `npm run seed:otp-emails -- you@gmail.com` **before** setting `SMTP_USER` / `SMTP_PASSWORD` with `wrangler secret put` and deploying. `scripts/seedPostgres.ts` still seeds those gmail addresses, so re-run the alias seed after any reseed.
