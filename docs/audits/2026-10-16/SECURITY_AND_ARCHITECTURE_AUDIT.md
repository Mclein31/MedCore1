# MedCore (AQROMED): security, database and architecture audit

**Date:** 2026-10-16
**Scope:** `apps/server` (Hono API on Cloudflare Workers and the Node standalone server), the database schema and migrations, auth in `apps/dashboard` and `apps/mobile`, deployment config (`wrangler.jsonc`, `vercel.json`, `.env.example`) and seed and test scripts.
**Reference standard:** AdvanCare (`../AdvanCare/backend`). Its email-OTP sign-in, sessions, staff auth, rate limiting, CSRF handling, error envelope and migration discipline are the target. Where this report says "AdvanCare does X", the file is named so it can be ported directly.
**Method:**
- Read the project brain (`.brain/PROJECT_CONTEXT.md`, all 2,538 lines, including the auth, deployment, demo-account, payment and SMS decisions) and the earlier audits (`docs/audits/2026-10-09`, `2026-10-10`, `apps/mobile/AUDIT.md`), so that I don't re-raise items that are already fixed or that were decided on purpose.
- Read AdvanCare's `.brain/ARCHITECTURE.md` and its auth, session, CSRF, CORS, crypto and mailer source, plus migration `0002`.
- Reviewed every MedCore server route definition (63 across 14 routers) with its role guard and facility scope, the middleware, the auth services, the gate-pass service, the DB client, the schema, all migrations, the seed and provisioning scripts, the dashboard API config and client, and the mobile auth provider.
- Ran `npm audit` (root and mobile) and `tsc --noEmit` for the server. tsc produced no errors.

**Not done:**
- No live testing against the hosted Worker. I did not sign in to the hosted service with any credential, so whether hosted accounts still use the seed password (C1) is not confirmed. The project notes do confirm that the accounts exist there.
- No mobile UI review and no load testing.

---

## 0. Context: demo prototype, not production

MedCore is currently a **demo prototype** with synthetic patients, simulated payments and sandbox SMS. It is not handling real patient data or money. The severities in section 2 describe what each issue would mean **in production**. For the demo stage, use this triage instead:

| Act on now (cheap, and it protects the demo itself or real money) | Why it matters even for a demo |
|---|---|
| **C1:** rotate hosted passwords, remove the login prefill | The demo is on a public URL. Anyone who reads the bundle can sign in and change or wipe the data right before your presentation. |
| **H9:** block encounter delete once payments exist | One stray click erases the records you plan to show. |
| **C3, AI part only (M4):** per-user AI rate limit and an OCR size cap | Gemini calls cost **real money** even when the data is fake. |
| **H5:** blank `.env.example`, rotate `GATE_PASS_SECRET` | Two commands, no downside. |
| **Section 4, Gmail OTP** | A demo feature in its own right, and it removes the weakest flow (C2). Seed patient emails must be **addresses you control**, such as Gmail plus-addresses like `you+juan@gmail.com`. `juan.delacruz@gmail.com` may belong to a real person, who would then receive your OTP emails. |
| **Database region** | Latency the audience will notice. See [`docs/production/NEON_REGION_MIGRATION.md`](../../production/NEON_REGION_MIGRATION.md). |

**Before any real hospital pilot:** everything else in sections 2, 3, 5 and 6. In particular: staff MFA, CSRF, sessions, the role matrix, migration 0006, PII encryption, retention and `PAYMENTS_MODE`. Keep this report as that checklist.

---

## 1. Executive summary

MedCore has many features, but its security baseline is well below AdvanCare's. The financial logic is careful: centavo math, row locks and idempotent payments are all solid. The identity layer around it is weak:

1. **Anyone can sign in with a password that is in the source code.** Every seeded account shares `HospitalRCM2026!`, which is also prefilled in the shipped login screen. One seeded account is a CFO-level "demo admin" that can browse every patient.
2. **Patient registration proves nothing about who is registering.** Knowing a patient's MRN and phone number is enough to take over their billing account. Nothing verifies that the person owns an email address or phone.
3. **There is no rate limiting anywhere.** That covers login, registration, the 4-digit gate-pass PIN and the paid Gemini endpoints.
4. **Session handling is weaker than AdvanCare's.** Cookies are `SameSite=None` even though the dashboard is already same-origin through the Vercel proxy. The token is copied into `localStorage`. There is no CSRF header check, and several state-changing POSTs take no body (including ones that send SMS and advance the discharge stage). There is no idle timeout and sessions can't be revoked.
5. **Financial history can be destroyed.** `DELETE /encounters/:id` hard-deletes the payments, promissory notes, gate passes, claims and charges of any encounter, including paid ones. Financial and audit rows also cascade at the FK level.
6. **The database relies on application code for its integrity.** There are no CHECK constraints. Email uniqueness is case-sensitive. The audit log is mutable. Migrations are applied by one-off scripts.

Adopting AdvanCare's email-OTP flow (section 4) fixes item 2 and the missing password reset. Porting AdvanCare's rate limiter, session and CSRF modules (section 5) fixes items 3 and 4. Voiding encounters instead of deleting them, together with the migration in section 3, fixes items 5 and 6.

### What is already solid (keep it)

Not everything is behind AdvanCare. These parts are good and should not be disturbed by the fixes:
- **Money handling.** Integer centavos, `SELECT … FOR UPDATE` on the encounter before any settlement, a shared lock order across payments, notes, disputes and recalculation, and idempotent payments with full payload matching (`routes/payments.ts`).
- **Tenant scoping.** Every staff query found is scoped by `facilityId`. Patients are confined to their own namespace by `middleware/access.ts` and `utils/encounterAccess.ts`, and patient responses use an explicit field projection.
- **Card data.** PAN, CVV and expiry are never accepted (`paymentSchema.strict()`). Only the brand and last four digits are stored.
- **Sessions are stored hashed** (SHA-256 of a 256-bit token), and inactive users are rejected on every request.
- **Gate-pass HMAC** uses a constant-time comparison, and production refuses to start gate-pass operations when `GATE_PASS_SECRET` is missing (when `NODE_ENV=production`).
- **SMS is sandbox-only** with allowlisted templates, no free-text bodies, and recipients resolved from facility records (by design, per the 2026-10-12 decision).
- **The AI layer** has a PHI scrubber, a Cora topic policy and structured responses.
- **Errors don't leak details.** `app.onError` logs only the name and message, and DB URLs and raw exceptions stay out of responses.
- **Production dependencies** have 0 known advisories (`npm audit --omit=dev`).
- **Mobile** stores the token in SecureStore and revokes staff logins in the patient app.

### Scorecard vs AdvanCare

| Area | AdvanCare | MedCore today | Gap |
|---|---|---|---|
| Patient/app sign-in | Email OTP (6 digits, hashed, 10 min, 5 attempts, 5/hour, single active code, race-safe consume) | Password plus MRN and phone "knowledge check" | **Critical** |
| Staff sign-in | Password + TOTP MFA, recovery codes, lockout, invitations | Password only, no lockout | High |
| Rate limiting | Workers `ratelimits` bindings per IP and per email | None | **Critical** |
| Session storage | SHA-256 hash, `revoked_at`, `last_seen_at`, 30 min idle / 8 h absolute (staff) | SHA-256 hash, expiry only, deleted on logout | High |
| Cookie | `__Host-`, HttpOnly, Secure, `SameSite=Strict`, first-party via proxy | Already first-party via the Vercel proxy, but still two cookies, `SameSite=None`, plus token in body and `localStorage` | High |
| Record deletion | Nothing hard-deleted, all FKs RESTRICT | `DELETE /encounters/:id` wipes payments, notes, passes and claims | High |
| CSRF | Custom header + Origin allowlist on writes | None (partial protection from JSON content-type checks) | High |
| CORS | Env-only allowlist, separate staff policy | Hard-coded list of Vercel hostnames, credentials on | Medium–High |
| Client IP | `CF-Connecting-IP` only, never trusts caller headers | Trusts `X-Forwarded-For` / `X-Real-IP` | Medium |
| Errors | `{error:{code,message,requestId}}` + request-ID middleware | No request ID | Low |
| Config | Typed `Bindings` in `env.ts` | `(c.env as any)` and NODE_ENV fallbacks copy-pasted with **different defaults** | High (see H4) |
| DB integrity | All FKs RESTRICT, CHECKs on money, append-only audit trigger | Cascades on financial/audit rows, no CHECKs, mutable audit | High |
| Migrations | `drizzle-kit migrate` on unpooled URL, verified by hash, restore point first | 0003–0005 applied by ad-hoc `scripts/apply*Migration.ts` | Medium |
| Tests | Vitest in workerd, DB-backed scope matrix, SMTP blanked in tests | Custom script harness | Medium |
| Deploy runbook | `DEPLOY.md` | Spread across `.brain` | Low |

---

## 2. Findings: vulnerabilities

Severity: **Critical** = exploitable now by an outsider with little effort. **High** = serious, needs a precondition or an insider. **Medium** = defence-in-depth or abuse risk. **Low** = hygiene.

### C1: Shared, public demo password on every seeded account, including a CFO account that can browse all patients
- **Where:** `scripts/seedPostgres.ts:90` (`defaultPassword = 'HospitalRCM2026!'`), `apps/dashboard/src/components/auth/LoginScreen.tsx:8` and `:78` (password prefilled in the **production bundle**), `apps/server/src/services/mobileDemoAccess.ts` (`mobile.admin.demo@example.test` with `HOSPITAL_CFO` gets `/patient/demo/patients` and `X-Medcore-Patient-Id` impersonation of any patient, `routes/patient.ts:94-130`). The same password appears in `scripts/testBackendApi.ts`, `scripts/testCoraPolicy.ts`, `apps/mobile/__tests__/liveAi.mts`, `docs/implementation/mobile-admin-demo.md` and `.brain/PROJECT_CONTEXT.md:2167`.
- **Evidence that this reaches the hosted system:**
  - `.brain/PROJECT_CONTEXT.md` ("Cloudflare Backend Deployment & Mobile API Synchronization — October 10, 2026") records that `mobile.admin.demo@example.test` (CFO) and `juan.delacruz@gmail.com` were provisioned in the **hosted Neon `neondb`**. It also records that `GET /patient/demo/patients` returned all 250 patients live.
  - The hosted DB has the full 250-encounter seed dataset, so it was most likely loaded with `seedPostgres.ts` using `FORCE_SEED=true`. The seed's localhost guard (`seedPostgres.ts:17-22`) can be overridden that way. That seed gives every staff account (`elena.santos@stjude.ph` and the others) the same literal password.
  - The local `.env` (not tracked) lists that password for the mobile admin.
  - I did not try the credentials against the hosted API.
- **Impact:** If hosted passwords were not rotated, anyone who reads the login page's JavaScript can sign in as any staff member or as the CFO principal, then list and impersonate every patient.
- **Fix:**
  1. Remove the prefill (`useState('')`, and delete the `setPassword('HospitalRCM2026!')` button handler).
  2. Make the seed require `SEED_PASSWORD` from the environment and refuse non-local hosts, as AdvanCare's `db:seed-demo` refuses anything but a local DB or a Neon branch named like "demo".
  3. Rotate every hosted account's password now, or delete the seeded staff accounts in the hosted DB.
  4. Gate the demo principal behind an env flag (`MOBILE_DEMO_ENABLED=true`) that is **off** in `wrangler.jsonc` production vars. The identity check (`username === …`) is not a security boundary.
  5. Remove the literal from docs and `.brain` (keep "set via `SEED_PASSWORD`").

### C2: Patient account takeover through registration (no proof of possession)
- **Where:** `apps/server/src/routes/auth.ts:131-268`.
- **Issue:** Registration links a new `PATIENT_GUARANTOR` login to a patient when the caller supplies the MRN and the phone number on file. Both are low-secrecy: the MRN is on the admission slip and wristband, and family, neighbours and other staff know the phone number. The caller supplies an **arbitrary email** that is never verified. There is no rate limit, so for a known MRN the phone number can also be guessed. Several accounts can link to the same MRN. The 2026-10-06 mobile audit already lists "identity possession verification remains a release requirement".
- **Impact:** Someone else can read the patient's diagnosis-bearing bill, receipts, PhilHealth claim and promissory notes, and can file disputes or promissory notes in the patient's name.
- **Fix:** Section 4. Use email OTP (AdvanCare ADV-AUTH-001), sent to an **email recorded by the hospital at admission** (`patients.email`, new column), not to one the caller types in. Rate limit per IP, per email and per MRN. Record each link in `patient_account_links` so staff can see and revoke it.

### C3: No rate limiting or lockout anywhere
- **Where:** All of `apps/server/src`. A grep for `ratelimit|429` finds nothing.
- **Impact:**
  - **Login** (`auth.ts:22`): unlimited password guessing. Together with C1 and 6-character passwords, this is trivial.
  - **Register** (`auth.ts:131`): unlimited MRN and phone guessing (C2).
  - **Gate-pass PIN** (`gatePass.ts:57`): 4 digits and no attempt counter. Any `LOBBY_SECURITY` session can try all 10,000 PINs and mark a pass `VERIFIED_AT_LOBBY`.
  - **AI** (`routes/ai.ts`): Cora chat, OCR, appeals and briefings call paid Gemini models with no per-user limit (cost abuse).
- **Fix:** Port AdvanCare's pattern (`backend/wrangler.toml` `[[ratelimits]]` + `limit()` in `routes/auth.ts`). **Use different `namespace_id`s** from AdvanCare (1001–1003), because both Workers live on the same Cloudflare account. Suggested values:

  ```jsonc
  // apps/server/wrangler.jsonc
  "ratelimits": [
    { "name": "AUTH_LIMITER", "namespace_id": "2001", "simple": { "limit": 10, "period": 60 } },
    { "name": "OTP_LIMITER",  "namespace_id": "2002", "simple": { "limit": 5,  "period": 60 } },
    { "name": "PIN_LIMITER",  "namespace_id": "2003", "simple": { "limit": 5,  "period": 60 } },
    { "name": "AI_LIMITER",   "namespace_id": "2004", "simple": { "limit": 10, "period": 60 } }
  ]
  ```
  Also add a **database-backed** lockout, because the Workers limiter is per-location and best-effort:
  - `users.failed_login_count` and `users.locked_until`: lock after 5 failures for 15 minutes, as AdvanCare's staff five-strike rule does.
  - `discharge_passes.pin_attempts`: void the pass after 5 wrong PINs, so billing must reissue it.

  The Node standalone server has no Workers binding. Fall back to an in-memory token bucket there, or skip limiting only when `NODE_ENV=development`.

### H1: Gate-pass PIN is weak and stored in plaintext
- **Where:** `schema.ts:510` (`exit_pin varchar(4)` in plaintext), `gatePass.ts:57` (`!==` comparison, PIN checked **before** the HMAC, no attempt count), `gatePassService.ts:76-85`.
- **Fix:** Store only `HMAC(secret, passId:pin)` and compare with `timingSafeEqualHex`. Add `pin_attempts` and void the pass after 5 failures (C3). Run the HMAC integrity check before the PIN check. Consider 6 digits.

### H2: Cross-site request forgery exposure
- **Where:** `routes/auth.ts:78-86` (`sameSite: 'None'` in production), `index.ts:39-75` (`credentials: true`). There is no CSRF header check.
- **Detail:** `@hono/zod-validator`'s `json` target rejects non-JSON content types, which incidentally blocks HTML-form CSRF on JSON routes. These POST routes have **no** JSON validator, so any website can trigger them with a plain form post that carries the staff cookie:
  - `/encounters/:id/finalize-bill`, `/send-bill` (which also dispatches an SMS) and `/view-bill` (`encounters.ts:830-868`);
  - `/encounters/:id/advance-stage` (`:909`) and `/encounters/:id/gate-pass` (`:871`);
  - `/encounters/:id/nudge-doctor` and `/notify-patient-sms` (`:808-828`), which read `c.req.text()` and so accept a `text/plain` body;
  - `/auth/logout`.

  `DELETE` and `PATCH` need a CORS preflight, so they are not affected.
- **Fix (AdvanCare `middleware/staff.ts` `staffCsrf`):**
  - Require a custom header (`X-MedCore-Client: 1`) **and** an allowlisted `Origin` on every non-GET request that authenticates by cookie. Bearer-token requests from the mobile app are exempt, because they can't be forged cross-site.
  - Switch the cookie to `__Host-medcore_session`, `SameSite=Strict`. In production, `apps/dashboard/src/config/api.ts:57` already forces the relative `/api/v1` path through the Vercel rewrite, so the cookie is first-party today and `SameSite=None` (`auth.ts:81`) is no longer needed. This is the same setup the AdvanCare admin uses through its Pages proxy.

### H3: Session token exposed to JavaScript
- **Where:** `routes/auth.ts:101-104` returns `token` in the JSON body. `apps/dashboard/src/api/client.ts:71,104` stores it in `localStorage`. Two identical cookies are set (`medcore_session` and `aqromed_session`).
- **Impact:** Any XSS, or any compromised npm dependency in the dashboard, can steal an 8-hour staff session. The HttpOnly cookie gives no protection.
- **Fix:** The dashboard uses the HttpOnly cookie only, and returns no token for web logins. The mobile app keeps a bearer token in `expo-secure-store`, which it already uses. Return the token only when the client asks for it (for example `"client": "mobile"`). Drop the `aqromed_session` duplicate.

### H4: Privilege escalation in any non-production deployment; gate-pass forgery if `NODE_ENV` is unset
- **Where:**
  - `middleware/auth.ts:84-89`: in non-production, any staff session can set `X-Demo-Role: HOSPITAL_CFO`.
  - `routes/auth.ts:347`: `/switch-role`.
  - `standalone.ts:8-11`: defaults to `development` and binds `0.0.0.0`, so the dev server on café or hospital Wi-Fi accepts the escalation header.
  - The NODE_ENV fallback differs between files: `index.ts` and `auth.ts` default to `'production'`, but `gatePass.ts:63`, `payments.ts`, `promissory.ts` and `encounters.ts:883` default to `'development'`. Per `.brain` line 2147, that default was flipped deliberately.
  - `gatePassService.ts:46` falls back to the **public** secret `medcore_dev_gate_pass_hmac_secret_2026_local`.
- **Impact:** A Worker or preview deployed without `NODE_ENV` signs and verifies gate passes with a key published in the repo, so anyone can forge "paid, free to exit" passes. Today `wrangler.jsonc` sets `NODE_ENV=production`, so the live Worker is safe. One missing var is all it would take.
- **Fix:**
  - Add a single `src/env.ts` with typed `Bindings` and one `isProduction(env)` helper that **defaults to production**, and use it everywhere (AdvanCare `env.ts`).
  - Require `GATE_PASS_SECRET` in every environment except an explicit `NODE_ENV=development`.
  - Put the demo-role header behind `DEMO_ROLE_SWITCH=true`, not "non-production".
  - Bind the standalone server to `127.0.0.1` by default.

### H5: Real-looking HMAC secret committed in `.env.example`
- **Where:** `.env.example:14`: `GATE_PASS_SECRET=1fb38c2f…3954`.
- **Fix:** Replace it with an empty value and a comment (`openssl rand -hex 32`). If this value was ever used for the hosted Worker, **rotate** it with `wrangler secret put GATE_PASS_SECRET`. Outstanding passes then fail verification, so reissue any that are active.

### H6: Login weaknesses
- **Where:** `routes/auth.ts:16-56`, `services/authService.ts:47-54`.
- **Issues:**
  - The email is not lowercased on login (`:40`) but is on registration (`:176`), so mixed-case accounts can't sign in.
  - The account state leaks: `404 FACILITY_NOT_FOUND`, `403 USER_INACTIVE` vs `401` for a wrong password, and `409 USER_EXISTS` on registration.
  - A timing oracle: PBKDF2 runs only when the user exists.
  - `hash === expectedHash` is not a constant-time comparison.
  - Passwords need only 6 characters and have **no maximum** on login, so a 1 MB password costs 100k PBKDF2 rounds per request.
  - `forgot-password` (`:277`) is a stub, so patients have no recovery path.
- **Fix:**
  - Lowercase and trim emails at the Zod layer, as AdvanCare does with `v.toLowerCase()`.
  - Return one generic `INVALID_CREDENTIALS` for every case.
  - Always run PBKDF2 against a dummy hash when the user is missing.
  - Use `timingSafeEqual` (AdvanCare `staff/crypto.ts`).
  - Require 12–128 characters for staff.
  - Patients move to OTP (section 4), which also replaces forgot-password.
  - PBKDF2-SHA256 at 100,000 iterations is the Cloudflare Workers maximum. Keep it, store the iteration count with each hash so it can be raised later, and rely on rate limiting and MFA.

### H7: Sessions can't be revoked or idle-expired
- **Where:** `schema.ts:201-218`, `middleware/auth.ts:46-60`, `routes/auth.ts:284-318`.
- **Issues:** There is no `revoked_at`, `last_seen_at` or idle timeout. Deactivating a user is honoured (`isActive` join), but there is no "sign out everywhere" and no session list.
- **Fix:** Port AdvanCare `staff/sessions.ts`: 8-hour absolute and 30-minute idle for staff, 30 days for patients with a touch at most once an hour, `revoked_at` instead of delete, and a `/auth/sessions` list with revoke.

### H8: Hard-coded credentialed CORS origins
- **Where:** `index.ts:28-37`.
- **Issue:** Seven fixed origins are allowed **with credentials**. If any of `med-core1.vercel.app`, `med-core1-beige.vercel.app`, `medcore1.vercel.app` or `medcore-hospital.vercel.app` is not a project you own, whoever owns it can make credentialed API calls as your logged-in users.
- **Fix:** Confirm that you own each one, then move the list entirely to `ALLOWED_ORIGINS` (AdvanCare `middleware/cors.ts`). Keep the localhost rule for development only. The production dashboard already calls through the same-origin Vercel proxy, and native mobile sends no `Origin`. The deployed system may therefore need **no** credentialed CORS origins at all. Only the Expo web build might, and it doesn't persist tokens.

### H9: Deleting an encounter destroys payments and other financial records
- **Where:** `routes/encounters.ts:1255-1312`.
- **Issue:** `BILLING_SPECIALIST` or `HOSPITAL_CFO` can hard-delete any encounter in the facility. In one transaction this deletes its timeline, disputes, charges, waterfall, PhilHealth claim, HMO authorisation, discharge passes, promissory notes and **payments**. Receipts go too, through the FK cascade. There is no stage or balance check, so a `PAID` stay can be erased. The audit row keeps only `{encounterNumber}`.
- **Impact:** A single click, a stolen session or a CSRF-style misuse can permanently lose money-trail records, including signed RA 9439 promissory notes and official receipts. Records like these must be retained for accounting and BIR purposes.
- **Fix:**
  - Replace the delete with **void**: set `voided_at`, `voided_by` and `void_reason`, and allow it only before any payment, note or pass exists. Otherwise return 409 and require a reversal or refund flow.
  - Restrict it to `HOSPITAL_CFO`, require a reason, and snapshot the full previous state into the audit row.
  - Back this up in the database with D2 (RESTRICT FKs). AdvanCare never hard-deletes and uses `cancellation_reason` instead.

### H10: Any physician can sign any other physician's professional fee
- **Where:** `routes/clearance.ts:32-47`. The query filters by facility only, not by `encounters.attending_physician_id = user.id`.
- **Impact:** A physician can set `agreedFee` on another doctor's patient. The amount above the PhilHealth/HMO ceiling becomes the patient's out-of-pocket excess.
- **Fix:** For `ATTENDING_PHYSICIAN`, add `eq(encounters.attendingPhysicianId, user.id)`. Let the CFO sign on a doctor's behalf only with an audited reason.

### M1: Spoofable client IP in audit logs (and in future rate limits)
- **Where:** `utils/clientIp.ts:17-29` trusts `X-Forwarded-For` and `X-Real-IP`.
- **Fix:** On Workers, use only `CF-Connecting-IP`. AdvanCare: "Do not trust caller-supplied IP headers." Requests that come through the Vercel rewrite carry Vercel's egress IP, so key rate limits on email or user as well as IP.

### M2: No security headers
- **Fix:** Add `hono/secure-headers` on the API (`X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`). Add `headers` in `vercel.json` for the SPA: a CSP limited to `'self'` plus the API origin, HSTS, `Permissions-Policy`. AdvanCare uses `public/_headers` for this.

### M3: Staff roles are not least-privilege for reading PHI
- **Where:** `routes/encounters.ts:468` (`GET /`), `:724` (`GET /:id`), `:734` (`/ledger`), `routes/beds.ts:15`. These have no `requireRole`, so `LOBBY_SECURITY` can read the full census, diagnoses and charges.
- **Fix:** Add a role matrix in one file (as in AdvanCare `staff/rules.ts`) and apply it to every route. Lobby security needs only pass verification. Audit-log every patient-record open, as AdvanCare audits clinical access.

### M4: Unbounded AI inputs and cost
- **Where:** `routes/ai.ts:292-293`: `imageBase64: z.string().min(1)` has no maximum and is open to patients. The HMO appeal fields have no maximum either.
- **Fix:** Cap base64 at about 6 MB (around 4.5 MB of image) and check the magic bytes, as AdvanCare's upload route does. Cap every free-text field. Apply `AI_LIMITER` per user (C3).

### M5: Public health endpoint leaks operational data
- **Where:** `index.ts:181-226`: unauthenticated, and returns the facility name, the live encounter count, the DB driver and the version.
- **Fix:** Return only `{status, database: ok|error}`, as AdvanCare's `routes/health.ts` does. Move the details behind auth.

### M6: Simulated payments settle real balances
- **Where:** `routes/payments.ts`, `services/simulatedPaymentService.ts`. A patient "payment" marks the bill paid and can issue a gate pass.
- **Context:** This is intentional for the university demo (`docs/implementation/simulated-payments.md`). The risk is that nothing at deploy level prevents it from running against a real facility.
- **Fix:** Add `PAYMENTS_MODE=simulated|disabled|live` in `wrangler.jsonc` vars, and refuse patient settlement unless it is `simulated`.
  - Your 2026-10-08 decision keeps patient screens free of simulation banners, so keep that marker internal: carry `is_simulated_demo` from the payment onto the pass and show it on the **staff** dashboard and the lobby verification result only.
  - Treat a facility going live as a deliberate config change, never the default.

### M7: Audit log is mutable and loses the actor
- **Where:** `schema.ts:640-662`: no append-only protection, and `user_id ON DELETE SET NULL`.
- **Fix:** See D2 and D8 in section 3 (append-only trigger as in AdvanCare `0001_staff_accounts.sql`, RESTRICT, and actor email copied into the row).

### M8: No separation of duties on dispute waivers
- **Where:** `routes/disputes.ts:124-127`. "Supervisory" waive is open to `BILLING_SPECIALIST`, the same role that handles the bill, so one person can raise and write off charges.
- **Fix:** Limit waivers to `HOSPITAL_CFO`, or add a two-person rule: the waiver approver must differ from the dispute's assignee or creator. Set a maximum per-waiver amount without CFO approval.

### M9: Dependency advisories in tooling and mobile
- **Root:** 17 advisories (2 critical, 9 high, 6 moderate). All are in **dev and build tooling**: `concurrently` → `shell-quote` (critical), `wrangler`/`miniflare`, `tailwindcss` 3 → `chokidar`/`braces`, `drizzle-kit` → `@esbuild-kit`, and `sharp`. None ship in the Worker bundle (`npm audit --omit=dev`: 0).
- **Mobile:** 22 production advisories (15 high, 7 moderate), mostly in the Expo toolchain tree.
- **Fix:**
  - Upgrade `concurrently`, `wrangler` and `drizzle-kit`. Plan the Tailwind 3 → 4 upgrade separately.
  - For mobile, run `npx expo install --check` and re-audit.
  - Add `npm audit --audit-level=high` to CI.

### L1–L7: Lower-risk items
- **L7:** Dispute and charge lookup by code uses `ilike(chargemaster_items.code, input)` (`utils/dbQuery.ts:23-28`), so a `%` in `chargeId` matches the first charge in the stay. It is scoped to the caller's own encounter, so it can't cross patients, but a patient could contest the wrong line. Use `eq` only.
- **L1:** The error envelope has no `requestId`, and the `apiError` status type lacks 422 and 429. Port AdvanCare `middleware/request-id.ts` and `lib/errors.ts` (`throw new ApiError(...)` instead of `return apiError(...)`).
- **L2:** `payments.idempotency_key` is globally unique, not scoped per user, so a 409 reveals that another user used a key. Scope it as `(user_id, key)`.
- **L3:** `encounters.magic_token_hash` and `magic_token_expires_at` are unused. Drop them, or implement them with OTP-grade rules.
- **L4:** `scripts/tmp/*.py` and the `needs_fix/` folders are committed or ignored inconsistently. Clean them up.
- **L5:** `index.ts` mixes imports and code (`import … from './db'` at line 77). Some routes are written minified (`encounters.ts:460`, `:871`, `auth.ts:347`). Add Prettier and ESLint.
- **L6:** The session lookup runs on every `/api/*` request, including public ones. Move it into `requireAuth` or skip it on public paths.

---

## 3. Database audit and fixes

| # | Issue | Where | Fix |
|---|---|---|---|
| D1 | **No CHECK constraints on money or state.** Nothing stops negative amounts, `amount_paid > gross`, or a `SCHEDULED` row with no date. | All `numeric` columns | Add CHECKs (migration below). AdvanCare enforces rates in `shifts_rate_matches_tier`. |
| D2 | **Financial and audit rows cascade-delete with their encounter.** These cascade: `chargemaster_items`, `statutory_waterfalls`, `philhealth_claims`, `hmo_authorizations`, `payment_receipts` (via payments), `encounter_timeline_events`, `ai_conversations`, `ai_audit_logs`, `sms_dispatches`. | `schema.ts:339,373,403,441,568,623,740,755,790`, plus the explicit deletes in `encounters.ts:1283-1292` (H9) | Change to `RESTRICT`. Encounters are never hard-deleted; add `voided_at`. AdvanCare: "All FKs are RESTRICT". |
| D3 | `users.email` unique is case-sensitive. | `schema.ts:178` | Unique index on `lower(email)`, plus Zod lowercasing. |
| D4 | `users.linked_mrn` is a free-text MRN with no FK and no facility. Any number of logins can attach to one patient, with no record of how they were verified. | `schema.ts:188` | New `patient_account_links(user_id, patient_id, verified_via, verified_at, revoked_at)`. Backfill, then drop `linked_mrn`. |
| D5 | `user_sessions` has no `revoked_at`, `last_seen_at` or `user_id` index, and `user_agent` is unbounded `text`. | `schema.ts:201` | Add the columns, an index on `user_id`, and `varchar(255)`. |
| D6 | No OTP tables. | n/a | `login_codes` (section 4). |
| D7 | Redundant indexes, which cost write amplification. | `idx_patients_mrn` (same as `uq_patient_facility_mrn`), `idx_payments_idempotency` (same as UNIQUE), `idx_discharge_passes_number` (same as UNIQUE), `idx_user_sessions_lookup` (UNIQUE `token_hash` already covers it) | Drop them. |
| D8 | Missing FK indexes. | `encounters.patient_id`, `promissory_notes.encounter_id`, `discharge_passes.encounter_id`, `payment_receipts.encounter_id`, `philhealth_claims.assigned_auditor_id` | Add them. Every patient-portal query filters by `patient_id`. |
| D9 | Dates stored as `timestamp without time zone`. | `patients.date_of_birth`, `promissory_notes.first_due_date` | Change to `date`. Asia/Manila is the business timezone, so a timestamp can shift by a day. |
| D10 | Plaintext sensitive identifiers. | `philhealth_pin`, `senior_citizen_id`, `pwd_id`, `contact_number`, `discharge_passes.exit_pin` | Encrypt the IDs at the application layer (AES-GCM with HKDF-derived keys, AdvanCare `staff/crypto.ts`) and keep the last 4 digits for display. Hash `exit_pin` (H1). Required in spirit by RA 10173. |
| D11 | `beds.current_encounter_id` has no FK. | `schema.ts:235` | Add an FK (RESTRICT, deferrable) or derive it from encounters. |
| D12 | **Migration drift (confirmed on the hosted DB).** A read-only check found only **4 of 6** migrations recorded in `drizzle.__drizzle_migrations`. The `ai_conversations` and `ai_audit_logs` tables defined in `schema.ts` **do not exist** in the hosted database, so `recordAiAudit` writes are silently skipped (`routes/ai.ts:74`). Also, 0004 and 0005 were applied by `scripts/applyAiCacheMigration.ts` and `applySmsMigration.ts` instead of `drizzle-kit migrate`. `0005` hand-edits `IF NOT EXISTS`. `sms_dispatches.id` has no default. | `src/db/migrations`, `scripts/` | Use one `npm run db:migrate` (drizzle-kit, **unpooled** URL). Verify `__drizzle_migrations` hashes on the hosted DB before 0006. Take a Neon restore point or branch first. Delete the ad-hoc apply scripts. |
| D16 | **Hyperdrive points at Neon's pooled endpoint, and the DB is far from users.** `medcore-hyperdrive` targets the `-pooler` host in `us-east-2` (Ohio). Hyperdrive pools connections itself, so AdvanCare points it at the **unpooled** endpoint. Ohio is about 200 ms or more round trip from the Philippines, multiplied across sequential queries. Caching is correctly disabled. | Hyperdrive config | Move to `aws-ap-southeast-1` (Singapore) and switch to the direct endpoint, following `docs/production/NEON_REGION_MIGRATION.md`. |
| D13 | Retention: `sms_dispatches.message_body` and `recipient_phone` are kept forever. Expired `ai_result_cache` rows and sessions are never purged. | n/a | Add a scheduled Worker (`[triggers] crons`) that purges expired sessions and codes and redacts SMS bodies older than 90 days. |
| D14 | Denormalised balances (`encounters.amount_paid`, `remaining_balance`, `statutory_waterfalls.patient_paid`) can drift from `payments`. | n/a | Add a `v_encounter_balance_check` view and assert it in `test:financial`. Keep it updated only inside the existing locked transaction. |
| D15 | Mutable audit log. | `system_audit_logs` | Add an append-only trigger and `actor_email`. Change `user_id` to RESTRICT. |

### Migration `0006_security_hardening.sql` (draft)

Generate it with `drizzle-kit generate` after you edit `schema.ts`, then add the hand-written parts (CHECKs, the trigger and the functional index) as AdvanCare did. **Run it on a Neon branch first.** Before adding the CHECKs, run the "find violators" queries at the bottom of this section, because existing seed data may violate them.

```sql
-- D3: case-insensitive email
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (lower(email));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;

-- H6/C3: lockout
ALTER TABLE users
  ADD COLUMN failed_login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN locked_until timestamptz,
  ADD COLUMN password_iterations integer NOT NULL DEFAULT 100000,
  ALTER COLUMN password_hash DROP NOT NULL,   -- OTP-only patient accounts
  ALTER COLUMN salt DROP NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_staff_have_password
  CHECK (role = 'PATIENT_GUARANTOR' OR (password_hash IS NOT NULL AND salt IS NOT NULL));

-- D5/H7: sessions
ALTER TABLE user_sessions
  ADD COLUMN last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN revoked_at timestamptz,
  ALTER COLUMN user_agent TYPE varchar(255);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions (user_id);
DROP INDEX IF EXISTS idx_user_sessions_lookup;

-- Section 4: email OTP (shape mirrors AdvanCare client_login_codes)
ALTER TABLE patients ADD COLUMN email varchar(255);
CREATE TABLE login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  email varchar(255) NOT NULL,
  purpose varchar(16) NOT NULL CHECK (purpose IN ('LOGIN','REGISTER')),
  patient_id uuid REFERENCES patients(id) ON DELETE RESTRICT,
  code_hash varchar(64) NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  ip varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (purpose = 'LOGIN' OR patient_id IS NOT NULL)
);
CREATE INDEX login_codes_email_idx ON login_codes (lower(email), created_at);

-- D4: verified patient links
CREATE TABLE patient_account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  verified_via varchar(32) NOT NULL,          -- 'EMAIL_OTP' | 'STAFF_DESK'
  verified_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX patient_account_links_active_uq
  ON patient_account_links (user_id, patient_id) WHERE revoked_at IS NULL;
INSERT INTO patient_account_links (user_id, patient_id, verified_via, verified_at)
  SELECT u.id, p.id, 'LEGACY_MRN', u.created_at
  FROM users u JOIN patients p ON p.facility_id = u.facility_id AND p.mrn = u.linked_mrn
  WHERE u.role = 'PATIENT_GUARANTOR';
-- Drop users.linked_mrn in 0007, after code no longer reads it.

-- H1: gate-pass PIN
ALTER TABLE discharge_passes
  ADD COLUMN pin_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN exit_pin_hash varchar(64);
-- backfill exit_pin_hash in a script using GATE_PASS_SECRET, then: ALTER TABLE discharge_passes DROP COLUMN exit_pin;

-- D1: money CHECKs (add NOT VALID first, VALIDATE after cleaning data)
ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0) NOT VALID;
ALTER TABLE payment_receipts ADD CONSTRAINT receipts_amount_positive CHECK (amount > 0) NOT VALID;
ALTER TABLE encounters ADD CONSTRAINT encounters_money_nonneg
  CHECK (amount_paid >= 0 AND remaining_balance >= 0 AND daily_room_rate >= 0 AND doctor_agreed_fee >= 0 AND doctor_excess_pf >= 0) NOT VALID;
ALTER TABLE chargemaster_items ADD CONSTRAINT charges_amounts_consistent
  CHECK (quantity > 0 AND unit_price >= 0 AND gross_amount >= 0
         AND philhealth_covered >= 0 AND hmo_covered >= 0 AND patient_oop >= 0
         AND philhealth_covered + hmo_covered + patient_oop <= gross_amount + 0.01) NOT VALID;
ALTER TABLE statutory_waterfalls ADD CONSTRAINT waterfall_nonneg
  CHECK (gross_total >= 0 AND net_patient_due >= 0 AND patient_paid >= 0) NOT VALID;
ALTER TABLE promissory_notes ADD CONSTRAINT notes_amounts
  CHECK (principal_amount > 0 AND total_repayment >= principal_amount AND monthly_installment > 0) NOT VALID;
ALTER TABLE billing_disputes ADD CONSTRAINT disputes_amount_positive CHECK (contested_amount > 0) NOT VALID;

-- D2: stop cascading financial/audit history (repeat per FK; names from \d+)
ALTER TABLE chargemaster_items DROP CONSTRAINT chargemaster_items_encounter_id_encounters_id_fk,
  ADD CONSTRAINT chargemaster_items_encounter_id_encounters_id_fk
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE RESTRICT;
-- … same for statutory_waterfalls, philhealth_claims, hmo_authorizations, payment_receipts.payment_id,
--     encounter_timeline_events, ai_conversations, ai_audit_logs, sms_dispatches
ALTER TABLE encounters ADD COLUMN voided_at timestamptz;

-- D7: redundant indexes
DROP INDEX IF EXISTS idx_patients_mrn;
DROP INDEX IF EXISTS idx_payments_idempotency;
DROP INDEX IF EXISTS idx_discharge_passes_number;

-- D8: FK indexes
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters (patient_id);
CREATE INDEX IF NOT EXISTS idx_promissory_encounter ON promissory_notes (encounter_id);
CREATE INDEX IF NOT EXISTS idx_discharge_passes_encounter ON discharge_passes (encounter_id);
CREATE INDEX IF NOT EXISTS idx_receipts_encounter ON payment_receipts (encounter_id);

-- D9: dates
ALTER TABLE patients ALTER COLUMN date_of_birth TYPE date USING (date_of_birth AT TIME ZONE 'Asia/Manila')::date;
ALTER TABLE promissory_notes ALTER COLUMN first_due_date TYPE date USING (first_due_date AT TIME ZONE 'Asia/Manila')::date;

-- D15: append-only audit (same approach as AdvanCare audit_logs_append_only)
ALTER TABLE system_audit_logs ADD COLUMN actor_email varchar(255);
CREATE OR REPLACE FUNCTION system_audit_logs_append_only() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'system_audit_logs is append-only'; END $$ LANGUAGE plpgsql;
CREATE TRIGGER system_audit_logs_no_update BEFORE UPDATE OR DELETE ON system_audit_logs
  FOR EACH ROW EXECUTE FUNCTION system_audit_logs_append_only();
```

Find violators before running `VALIDATE CONSTRAINT`:

```sql
SELECT id, amount FROM payments WHERE amount <= 0;
SELECT id FROM encounters WHERE amount_paid < 0 OR remaining_balance < 0;
SELECT id FROM chargemaster_items WHERE philhealth_covered + hmo_covered + patient_oop > gross_amount + 0.01;
SELECT lower(email), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;   -- must be empty before users_email_lower_uq
```

---

## 4. Gmail OTP: porting AdvanCare ADV-AUTH-001 to MedCore

### 4.1 What AdvanCare does (the reference)

| Element | AdvanCare file | Behaviour to copy exactly |
|---|---|---|
| Code generation | `backend/src/routes/auth.ts` `generateCode()` | 6 digits from `crypto.getRandomValues` with rejection sampling (no modulo bias) |
| Storage | `client_login_codes` (`drizzle/0002_client_sign_in.sql`) | Only `sha256(email:code)` is stored, never the code |
| Lifetime | `CODE_TTL_MS = 10 min` | Single use |
| Attempts | `MAX_CODE_ATTEMPTS = 5` | The code is burned after 5 wrong tries (`CODE_LOCKED`) |
| Issuance cap | `MAX_CODES_PER_HOUR = 5` per email | Plus `CLIENT_AUTH_LIMITER` per IP and per email |
| One live code | Older unconsumed codes are marked consumed on each request | Only the newest email works |
| Race safety | `UPDATE … WHERE consumed_at IS NULL RETURNING` inside the transaction | Two parallel verifies can't both succeed |
| Comparison | `timingSafeEqualString` | Constant time |
| Delivery | `backend/src/lib/mailer.ts` | Dependency-free SMTP over `cloudflare:sockets`, implicit TLS to `smtp.gmail.com:465`, `AUTH PLAIN` with a **Gmail App Password**, dot-stuffing, RFC 2047 header encoding, address validation against header injection, 15 s timeout, failure logged without echoing the address |
| Dev mode | `sendMail` returns `'logged'` | Without SMTP settings and only when `ENVIRONMENT=development`, the code goes to the API log. Elsewhere it returns 503 and never logs the code |
| Failed send | The code row is marked consumed | A failed email doesn't leave a usable code |
| Session | `middleware/auth.ts` `issueClientSession` | 256-bit random token, SHA-256 stored, 30 days, `revoked_at`, `last_seen_at` touched hourly |
| Tests | `test/mailer.test.ts`, `vitest.config.ts` | SMTP is blanked in tests so real mail can never be sent |

### 4.2 MedCore design

**Who uses it:** patients and guarantors (mobile app and patient web). Staff keep password login, hardened, and get TOTP MFA in phase 2 (section 5).

**Flows:**

1. **Register (first link).** `POST /api/v1/auth/otp/request {purpose:"REGISTER", mrn, contactNumber, facilityCode}`.
   - The server finds the patient by facility, MRN and contact number. The response is generic whether or not one matches.
   - The code goes **to `patients.email`**, the address the hospital recorded at admission. The caller never chooses the destination. This is the possession proof that C2 lacks.
   - The response is always `202 {sent:true, sentTo:"j***@gmail.com"}`. Mask the address only if a patient matched; otherwise return the same shape with a believable mask so the endpoint can't be used as an oracle. Alternatively, return only `{sent:true}`.
   - If `patients.email` is empty, return a generic "Please visit the billing desk to add your email". Staff add it at the desk after checking ID, and the desk action is audited.
2. **Login.** `POST /api/v1/auth/otp/request {purpose:"LOGIN", email}`. A code is sent only if an active `PATIENT_GUARANTOR` with a live `patient_account_links` row exists. The response is identical either way.
3. **Verify.** `POST /api/v1/auth/otp/verify {email, otp, purpose}`. This consumes the code (race-safe), then:
   - for REGISTER: creates the user (no password) and a `patient_account_links` row with `verified_via='EMAIL_OTP'`;
   - for LOGIN: opens a session.

   It returns the mobile bearer token, or sets the web cookie. Both events are audited.
4. **Forgot password** goes away for patients, because OTP is the recovery path.

Add `/api/v1/auth/otp/request` and `/api/v1/auth/otp/verify` to `publicAuth` in `middleware/access.ts:4`.

### 4.3 Implementation sketch (MedCore conventions: Hono + Zod + Drizzle)

`apps/server/src/services/otp.ts` is a direct port of AdvanCare's code:

```ts
import { timingSafeEqualHex } from './gatePassService';
import { hashSessionToken as sha256Hex } from './authService';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_CODES_PER_HOUR = 5;

/** Uniform 6-digit code (rejection sampling avoids modulo bias). */
export function generateCode(): string {
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < 4_294_000_000) return String(buf[0]! % 1_000_000).padStart(6, '0');
  }
}
export const codeHash = (email: string, purpose: string, code: string) => sha256Hex(`${purpose}:${email}:${code}`);
export const codesMatch = timingSafeEqualHex;
```

`apps/server/src/routes/otp.ts` has the same structure as AdvanCare `routes/auth.ts`. Key points:

```ts
const Email = z.string().trim().toLowerCase().email().max(255);
const Otp = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.');

otpApp.post('/request', zValidator('json', z.discriminatedUnion('purpose', [
  z.object({ purpose: z.literal('LOGIN'), email: Email, facilityCode: z.string().max(32).default('SJMC-MNL') }).strict(),
  z.object({ purpose: z.literal('REGISTER'), mrn: z.string().trim().min(2).max(64),
             contactNumber: z.string().max(32), facilityCode: z.string().max(32).default('SJMC-MNL') }).strict(),
])), async (c) => {
  // 1. limit(c, ['ip:'+cfIp, 'email:'+email, 'mrn:'+mrn])  → 429 RATE_LIMITED
  // 2. resolve recipient (patients.email for REGISTER; linked guarantor for LOGIN); if none → return the same 202
  // 3. count codes in last hour ≥ 5 → 429 TOO_MANY_CODES
  // 4. in one tx: mark older unconsumed codes consumed; insert {codeHash, expiresAt, ip, purpose, patientId}
  // 5. sendMail(); on throw → mark this row consumed, rethrow (503/502)
  return c.json({ sent: true, expiresInMinutes: 10 }, 202);
});

otpApp.post('/verify', zValidator('json', z.object({ email: Email, otp: Otp, purpose: z.enum(['LOGIN','REGISTER']) }).strict()), async (c) => {
  // newest unconsumed, unexpired code for (email, purpose)
  // attempts ≥ 5 → consume, 401 CODE_LOCKED
  // !codesMatch → attempts+1, 401 CODE_INVALID (same message for "no code")
  // db.transaction: UPDATE … SET consumed_at=now() WHERE id=? AND consumed_at IS NULL RETURNING id  (none → 401)
  //   REGISTER: insert user (role PATIENT_GUARANTOR, no password) + patient_account_links(EMAIL_OTP)
  //   LOGIN: load user; inactive → 403 ACCOUNT_DISABLED
  //   issue session (revoked_at/last_seen_at model), audit 'PATIENT_OTP_LOGIN' / 'PATIENT_REGISTERED'
});
```

**Mailer, with a caveat specific to MedCore.** MedCore also runs on Node (`standalone.ts`), where `cloudflare:sockets` doesn't exist. A static import would break `npm run dev:server`. Do it this way:
- Copy AdvanCare `lib/mailer.ts` to `apps/server/src/services/mailer.ts`, but load the socket lazily: `const { connect } = await import('cloudflare:sockets')`. Call it only when `navigator.userAgent === 'Cloudflare-Workers'`.
- On Node with `NODE_ENV=development` and no SMTP settings, use the AdvanCare `'logged'` path, so the code is printed to the console.
- In any other case without SMTP settings, return 503 `EMAIL_UNAVAILABLE`.
- Keep `SAFE_ADDRESS`, `dotStuff` and `encodeHeader` exactly as AdvanCare has them. They are what prevent SMTP and header injection.
- Port `test/mailer.test.ts`.

**Email content:** reuse AdvanCare's copy and change the brand. The subject is "`123456` is your MedCore code". The body says it works once, expires in 10 minutes, and that the patient should never share it, including with hospital staff. Per AdvanCare `lib/notify.ts`, **put no bill amounts, diagnoses or MRNs in the email**.

**Secrets and config:**

```bash
cd apps/server
npx wrangler secret put SMTP_USER        # the Gmail address
npx wrangler secret put SMTP_PASSWORD    # a Google App Password (requires 2-Step Verification on that account)
```

Add `MAIL_FROM_NAME="MedCore"` to `vars` and add names only to `.env.example`. Never use a `VITE_*` variable.

**Gmail limits.** A consumer Gmail account sends about 500 messages a day, and Google may block automated sending. This is fine for the pilot and the defence demo. For a real hospital, switch the SMTP host to Google Workspace, or use a transactional provider such as Resend or Postmark through the same `sendMail()` interface. AdvanCare's mailer is host-agnostic (`SMTP_HOST`, `SMTP_PORT`).

**Clients:**
- **Mobile (`apps/mobile`):** replace the email and password sign-in with a two-step screen (email, then code), as AdvanCare's `EmailCode` component does. Registration becomes MRN and phone, then "we sent a code to j***@gmail.com", then the code. The token stays in SecureStore.
- **Dashboard:** unchanged for staff. Remove the patient registration UI from it if any remains.

**Tests to add (mirror AdvanCare):**
- `generateCode` is always 6 digits, and a uniform-distribution sanity check passes.
- Only the newest code works.
- The 6th wrong attempt gives `CODE_LOCKED`.
- An expired code is rejected.
- Two parallel verifies: one succeeds and one gets 401.
- A REGISTER code can't be used for LOGIN.
- Request responses are identical for unknown and known emails.
- The 6th request in an hour gives 429.
- The mailer rejects addresses containing `\r\n`, dot-stuffs correctly and encodes non-ASCII subjects.
- SMTP is blanked in the test environment.

---

## 5. Other AdvanCare features to adopt (by priority)

| Priority | Feature | AdvanCare source | MedCore target |
|---|---|---|---|
| P0 | Rate limiters | `wrangler.toml` `[[ratelimits]]`, `limit()` in `routes/auth.ts` | `wrangler.jsonc` + `middleware/rateLimit.ts` (C3) |
| P0 | Typed env + one production check | `src/env.ts` | `apps/server/src/env.ts`. Remove every `(c.env as any)` (H4) |
| P0 | Constant-time helpers, random tokens | `src/staff/crypto.ts` | `services/crypto.ts`, used by auth, OTP and gate passes |
| P1 | Staff sessions: idle and absolute timeouts, `__Host-` cookie, `SameSite=Strict`, revoke | `src/staff/sessions.ts` | `services/sessions.ts` (H2, H3, H7) |
| P1 | CSRF middleware | `middleware/staff.ts` `staffCsrf` | `middleware/csrf.ts` on cookie-authenticated writes |
| P1 | Request ID + `ApiError` + one error handler | `middleware/request-id.ts`, `lib/errors.ts`, `middleware/error.ts` | Replace `return apiError(...)` with `throw new ApiError(...)` |
| P1 | Per-request DB client (`withDb`) | `middleware/staff.ts` `withDb`, `db/client.ts` | Replace the global `db` Proxy and AsyncLocalStorage (`db/index.ts:109`). Same behaviour, explicit lifetime, easier testing |
| P2 | Staff TOTP MFA + recovery codes + invitations + Super Admin | `staff/totp.ts`, `challenge.ts`, `recovery.ts`, `routes/admin/*` | `HOSPITAL_CFO` acts as Super Admin, invites staff and resets MFA. Patient accounts never get staff roles |
| P2 | Scope helpers (`scopeCondition` / `assertInScope`) | `staff/scope.ts` | Generalise `utils/encounterAccess.ts` into a role × facility matrix (M3) |
| P2 | Audited sensitive reads and reason-gated clinical access | `routes/admin/people.ts` | Audit opening a patient dossier, and require a reason for diagnosis or ICD views |
| P2 | Security headers on static hosting | `frontend/public/_headers` | `vercel.json` `headers` (M2) |
| P3 | Vitest in workerd + DB-backed scope matrix | `vitest.config.ts`, `test/admin-scope.test.ts` | Replace the `scripts/test*.ts` harness step by step |
| P3 | Deploy runbook | `DEPLOY.md` | `MedCore1/DEPLOY.md`: Worker, Vercel, secrets, migrations, rollback |
| P3 | Split brain files | `.brain/ARCHITECTURE.md`, `DECISIONS.md`, `TODO.md` | `.brain/PROJECT_CONTEXT.md` is over 2,000 lines. Split it into the standard set (AGENTS.md lists them) |

---

## 6. Code quality and architecture gaps

- **The god file.** `routes/encounters.ts` is 1,315 lines and holds the census, hydration, the statement, SMS, the gate pass and stage transitions, with a module-level cache (`invalidateEncountersCache`). Split it into `encounters/list.ts`, `detail.ts` and `stage.ts`, and move the business rules into pure functions as AdvanCare does (`staff/requestRules.ts`, `serviceRules.ts`) so they can be unit-tested.
- **Copy-pasted config resolution.** The NODE_ENV fallback is written out about 10 times with two different defaults. This is the root cause of H4.
- **Duplicate route mounting.** `promissoryApp` is mounted at both `/api/v1/promissory-notes` and `/api/v1` (`index.ts:234-235`). `encounters`, `clearance` and `payments` all share `/api/v1/encounters`. Route-level guards in `access.ts` depend on path regexes, which is fragile. Prefer guards attached per route, as in AdvanCare `routes/admin/index.ts`.
- **Validation.** Several schemas aren't `.strict()`, and many strings have no `.max()`. AdvanCare validates every payload with strict objects and returns 422 `VALIDATION_FAILED`. Use the same here.
- **Workers DB pool.** The request-scoped pool was the right fix for the stale-socket 1101 errors recorded in the brain (section 23.9). It still builds a `pg.Pool` of up to 5 connections per request behind Hyperdrive, which already pools. A single `pg.Client` per request, closed before responding (AdvanCare `db/client.ts`), keeps that fix with less overhead. The `encounters.ts` hydration batches would then run sequentially on one client, which is already how they are batched.
- **Formatting and linting.** There is no ESLint or Prettier, and parts of the code are written minified. Add both, with a pre-commit hook.
- **CI.** There is no `.github/workflows`. Add typecheck, tests and `npm audit` on every push, as AdvanCare has `.github/`.
- **Repo weight.** `product video inspo/`, `UI_SCREENSHOTS/` and the media under `docs/` bloat clones. Move them to Git LFS or out of the repo.

---

## 7. Remediation plan

**Phase 0: this week (close the open doors)**
1. C1: rotate hosted passwords, remove the login prefill, make the seed take its password from the env and refuse remote hosts, put the demo principal behind a flag.
2. H5: blank `.env.example`, and rotate `GATE_PASS_SECRET` if it was ever used.
3. H8: confirm ownership of the hard-coded Vercel origins, then move them to `ALLOWED_ORIGINS`.
4. C3: rate limiters on login, register, PIN verify and AI. DB lockout on login and PIN.
5. H4: `env.ts` with a production default, and `GATE_PASS_SECRET` required outside explicit development.
6. H9: disable encounter hard-delete (return 409 once any payment, note or pass exists). H10: scope physician sign-off to the attending physician.
7. H2 (quick part): `SameSite=Strict` now, because the dashboard is already same-origin.

**Phase 1: next 2 weeks (identity)**
8. Migration 0006 (section 3), run on a Neon branch first.
9. Email OTP for patients (section 4), and retire MRN-and-phone-only registration.
10. Sessions and CSRF (H2 header check, H3 no web token, H7 revocation and idle timeout).
11. H1 PIN hashing and attempts. H6 login fixes. M1, M2, M5.

**Phase 2: hardening**
12. Staff TOTP MFA and invitations (AdvanCare phase A).
13. Role matrix and audited PHI reads (M3), waiver separation of duties (M8), append-only audit (D15), retention cron (D13).
14. `PAYMENTS_MODE` (M6), AI input caps (M4), dependency upgrades (M9).
15. Move to Vitest, CI, the `encounters.ts` split, lint.

---

## 8. Verification checklist (after the fixes)

- [ ] `grep -r "HospitalRCM2026" apps scripts docs .brain` finds nothing. Login with that password fails on the hosted API.
- [ ] The 11th login attempt in a minute returns 429. The 6th wrong password locks the account for 15 minutes.
- [ ] A 6th wrong PIN voids the pass. `exit_pin` no longer exists in the DB.
- [ ] Registration without a verified email code is impossible. The code goes only to `patients.email`.
- [ ] OTP: newest-only, 5 attempts, 10-minute expiry, 5 per hour, parallel-verify race, and purpose separation all pass in tests.
- [ ] The hosted health endpoint shows no facility name or counts.
- [ ] A cross-site `fetch(…, {credentials:'include', method:'POST'})` from an unlisted origin gets 403 `CSRF_REJECTED`.
- [ ] The dashboard has no token in `localStorage`. The cookie is `__Host-`, HttpOnly, Secure and Strict.
- [ ] `DELETE /encounters/:id` on a stay with a payment returns 409. A raw SQL delete fails with an FK RESTRICT error. `UPDATE system_audit_logs` raises an error.
- [ ] Physician B signing physician A's encounter returns 404. A `BILLING_SPECIALIST` waiver above the limit returns 403.
- [ ] A cross-site form `POST /encounters/:id/send-bill` with the staff cookie returns 403 and sends no SMS.
- [ ] `SELECT lower(email), count(*) … HAVING count(*) > 1` is empty, and a mixed-case login works.
- [ ] A Worker deployed without `NODE_ENV` refuses to start gate-pass operations (no fallback secret).
- [ ] `npm audit`, `tsc` and the full test suite pass in CI.
