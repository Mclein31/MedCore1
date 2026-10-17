# MedCore v2

Financial clearance and patient billing middleware for Philippine hospitals. MedCore applies the statutory
deduction waterfall to the centavo, runs discharge clearance as a strict state machine, and gives patients a
plain-language bill they can question, pay, or put on a 0% interest promissory note (RA 9439).

This branch (`rebuild/medcore-v2`) is a ground-up rewrite. The previous implementation, including the AI
features, remains on `main`. Both apps now use the original v1 UI through client adapters to the v2 API; the dashboard keeps v2 staff sign-in and MFA.

## Layout

| Path              | What it is                                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/domain` | Pure business rules shared by API and web: money, waterfall, promissory schedules, discharge state machine, permission matrix, request contracts. No I/O. |
| `apps/api`        | Hono + Drizzle + PostgreSQL. Runs on Node (`src/node.ts`) and Cloudflare Workers (`src/worker.ts`).                                                       |
| `apps/web`        | React 19 + Vite + Tailwind 4. Hospital staff dashboard only. Patients use the mobile app.                                                                 |
| `apps/mobile`     | Expo (SDK 57) patient app: bill, coverage, payments, questions, exit pass. Bearer token in the OS keychain.                                               |

## Run it locally

Requires Node 22+, PostgreSQL 15+ and, for the mobile app, Xcode with an iOS simulator (Expo Go installs itself).
Run every command from the repository root.

```bash
cp .env.example .env          # fill GATE_PASS_SECRET, DATA_ENCRYPTION_KEY, SEED_PASSWORD
npm install
createdb medcore              # or point DATABASE_URL at another empty database
npm run db:migrate
npm run db:seed               # fictional demo hospital SJMC-MNL
npm run dev                   # API on :8787, staff dashboard on http://localhost:5173
npm run ios -w @medcore/mobile   # second terminal: patient app in the iOS simulator
```

Set `PATIENT_ONLINE_PAYMENTS=simulated` and `PATIENT_ONLINE_PROMISSORY=true` in `.env` to try payments and payment
plans from the app.

Port 8787 is also the v1 Worker's port (`wrangler dev` on `main`). If it is taken, move v2:
`PORT=8788` in `.env`, then start the dashboard with `API_PORT=8788 npm run dev -w @medcore/web` and the app with
`EXPO_PUBLIC_API_PORT=8788 npm run ios -w @medcore/mobile`.

To run beside existing servers on 8787/8790/5173, use three terminals from this checkout (do not reseed an existing database):

```bash
# API
cd apps/api
PORT=8788 ALLOWED_ORIGINS=http://localhost:5174 PUBLIC_APP_URL=http://localhost:5174 npm run start
```

```bash
# Dashboard (open http://localhost:5174)
cd apps/web
API_PORT=8788 npx vite --port 5174 --strictPort
```

```bash
# Mobile (then open exp://localhost:8081 in Expo Go)
cd apps/mobile
EXPO_PUBLIC_API_PORT=8788 npx expo start --port 8081
xcrun simctl openurl booted exp://localhost:8081
```

The commands above retain MFA. For the local fictional database only, `STAFF_MFA_REQUIRED=false` can be added to the API command to permit unenrolled seed accounts; enrolled accounts still require their authenticator. Never change production defaults.

Staff sign in at http://localhost:5173 with `cfo@`, `billing@`, `claims@`, `hmo@`, `dr.cruz@`, `lobby@` …
`stjude.example.test` and `SEED_PASSWORD`, then enroll an authenticator app. Patients use the mobile app: "First time here? Link your hospital stay" (MRN + DOB),
a seeded MRN (for example `MRN-240118`) and date of birth, then the 6-digit code printed in the API log.

The app calls `http://localhost:8787` (`10.0.2.2` on the Android emulator). For a phone on your network set
`EXPO_PUBLIC_API_URL=http://<your-mac-ip>:8787` and start the API with `HOST=0.0.0.0`.

What v1 had that v2 does not yet: [`docs/v2/API_GAPS.md`](docs/v2/API_GAPS.md).

## Checks

```bash
npm run check                 # typecheck + lint + all tests
npm run format:check
npm run build
```

API tests run against a real, disposable PostgreSQL database (`medcore_v2_test`, created and dropped by the
test setup; override with `TEST_DATABASE_URL`). They refuse any database that is not local and named `*_test`.

## Security model (summary)

- **Identity.** Staff: password (PBKDF2-SHA256, policy-checked, 5-strike lockout) plus mandatory TOTP with
  single-use recovery codes; accounts exist only by emailed invitation. Patients: 6-digit email code sent only
  to the address the hospital recorded, never one the caller types. Patient logins are a separate principal
  type and can never hold staff permissions.
- **Sessions.** 256-bit opaque tokens, stored as SHA-256. Staff: 8 h absolute, 30 min idle. Revoked (never
  deleted) on logout, password change, role change or deactivation. `__Host-`, HttpOnly, Secure,
  `SameSite=Strict` cookies; JavaScript never sees a token. Mobile clients get a bearer token on request.
- **Requests.** CSRF header + Origin allowlist + Fetch Metadata on every cookie write; strict, bounded
  validation on every body; Postgres-backed rate limits; 64 KB body cap; no-store caching; locked-down
  security headers; errors carry a request id and never internals.
- **Authorization.** One permission matrix (`packages/domain/src/access.ts`); physicians see only their own
  patients; lobby security can only verify passes; every query is facility-scoped; waivers have separation
  of duties and a ₱5,000 limit below the CFO.
- **Data.** PhilHealth PINs, phone numbers, discount IDs, borrower IDs and MFA secrets are AES-256-GCM
  encrypted, bound to their row and column. Money is integer centavos with CHECK constraints, including a
  CHECK that every ledger reconciles. All foreign keys RESTRICT; triggers make payments, receipts, signed note
  terms and the audit log immutable and block deletes of financial records. Official receipt numbers are
  gap-free per facility.
- **Exit passes.** HMAC-signed; the 6-digit PIN is derived from a server secret (never stored); tampering is
  detected; five wrong PINs void the pass.
- **Accountability.** Append-only audit log of sign-ins, every money movement, every PHI record opened,
  and every administrative change, with actor, IP and request id.

See [`DEPLOY.md`](DEPLOY.md) for production setup.
