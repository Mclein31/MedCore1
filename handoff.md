# HANDOFF: Put the ORIGINAL v1 UI back on the v2 backend (mobile + dashboard)

Written 2026-10-17 by Claude Code for Codex. Read ALL of this before touching anything.

---

## 0. TL;DR (what the user wants)

The user (project owner) hates the v2 UI. They want the **original v1 UI** of BOTH apps
(the staff **dashboard** and the patient **mobile app**) exactly as it was on branch `main`,
but running on top of the **new hardened v2 API**. One exception, in the user's words:

> "use the original ui of the dashboard and the mobile app of our original dashboard and mobile,
> **except for the login on the dashboard**"

So:

| App       | UI to use                           | Login screen                                                                                                      |
| --------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Mobile    | Original v1 (`main:apps/mobile`)    | Original v1 mobile login, adapted to v2 (DONE)                                                                    |
| Dashboard | Original v1 (`main:apps/dashboard`) | **KEEP the current v2 login** (`apps/web/src/staff/Login.tsx` + `AuthShell.tsx`). Do NOT bring back the v1 login. |

Do **not** redesign anything. Do **not** "improve" the v1 look. Copy it and make it work.

Status:

- **Mobile: ~90% done, NOT committed.** Works end to end in the iOS simulator (details in §4).
- **Dashboard: NOT started.** Plan in §5.

---

## 1. Where everything is (READ CAREFULLY, there are several copies of the repo)

Repo root (main checkout, branch `main`, the OLD v1 app). **Do not work here.**

```
/Users/mclein/Documents/Developer/Personal_Projects/MedCore1
```

Git worktrees (separate folders, each on its own branch). Two matter:

| Folder                                                                                      | Branch               | What it is                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/Users/mclein/Documents/Developer/Personal_Projects/MedCore1/.claude/worktrees/mobile-v2`  | `rebuild/mobile-v2`  | **WORK HERE.** Has the uncommitted mobile port. This file lives here.                                                                                                             |
| `/Users/mclein/Documents/Developer/Personal_Projects/MedCore1/.claude/worktrees/medcore-v2` | `rebuild/medcore-v2` | The "main" v2 branch. The user's running dev server (`localhost:5173`) is started from this folder. It was fast-forwarded to commit `64e7bad` (same as `rebuild/mobile-v2` HEAD). |

Rules:

- Run every command from `/Users/mclein/Documents/Developer/Personal_Projects/MedCore1/.claude/worktrees/mobile-v2` unless told otherwise.
- **Never** run `git checkout`/`git switch` to another branch in any of these folders. Never `git stash`. Never `git reset --hard`.
- Other Claude sessions may use other worktrees. Only touch `mobile-v2` (and, at the very end, fast-forward `medcore-v2`, see §7).
- When finished: commit on `rebuild/mobile-v2`, then fast-forward `rebuild/medcore-v2` to it (§7). Do not push, do not merge into `main`.

The ORIGINAL v1 code is on branch `main`. Read any old file with:

```bash
git show main:apps/dashboard/src/pages/CommandCenterPage.tsx
git show main:apps/mobile/src/screens/HomeScreen.tsx
git ls-tree -r --name-only main apps/dashboard
```

A full extracted copy of the old apps also exists at (temporary, may be deleted by the OS; recreate with the command below if missing):

```
/private/tmp/claude-501/-Users-mclein-Documents-Developer-Personal-Projects-MedCore1/60ec0e57-154f-4cc6-8a09-fbbb7a77609e/scratchpad/old/apps/{dashboard,mobile,shared}
```

Recreate anywhere with:

```bash
mkdir -p /tmp/medcore-old && git -C /Users/mclein/Documents/Developer/Personal_Projects/MedCore1 archive main apps/dashboard apps/mobile apps/shared | tar -x -C /tmp/medcore-old
```

Screenshots of what v1 looked like (the target look): `UI_SCREENSHOTS/dashboard/*.png` and `UI_SCREENSHOTS/mobile/*.png` in the repo. Open them. The finished result must look like these.

---

## 2. Project background you need

MedCore = Philippine hospital billing / discharge-clearance app. Monorepo with npm workspaces.

On branch `rebuild/mobile-v2`:

```
packages/domain   pure business rules (money in integer centavos, waterfall, discharge stages, zod contracts)
packages/icons    @medcore/icons: Solar icon SVG data (shared by web and mobile)
apps/api          v2 API: Hono + Drizzle + Postgres. THE BACKEND. Do not change its security model.
apps/web          v2 staff dashboard (React 19 + Vite + Tailwind 4). Currently v2 UI with a v1-ish restyle. TO BE REPLACED (except login).
apps/mobile       Expo SDK 57 / React Native 0.86.3 / React 19.2.3 patient app. NOW = original v1 code + bridge (uncommitted).
docs/v2/API_GAPS.md   list of v1 features the v2 API does not have yet
```

Key v2 facts (non-negotiable, the user and audit require them):

- **Money is integer centavos** in v2 (`balanceCents: 25000` = ₱250.00). v1 UI code uses **pesos as floats**. Every boundary must convert: pesos = cents / 100; cents = Math.round(pesos * 100).
- **Patients** sign in only with a 6-digit code emailed to the hospital-recorded address (no patient passwords). In dev the code is printed in the API log.
- **Staff** sign in with password + TOTP MFA, cookie session. Every write request from the browser needs header `X-MedCore-CSRF: 1` (the existing `apps/web/src/lib/api.ts` `api()` function already does this).
- Payments need an `Idempotency-Key` header (16–64 chars of `[A-Za-z0-9-]`). Card payments accept **brand + last 4 only**, never a full card number.
- Read the v2 routes before mapping anything:
  - `apps/api/src/routes/patientAuth.ts`, `patientPortal.ts` (patient)
  - `apps/api/src/routes/staffAuth.ts`, `staffEncounters.ts`, `staffOperations.ts`, `staffAdmin.ts` (staff)
  - Request bodies: `packages/domain/src/contracts.ts`
  - Response shapes used by the current web app: `apps/web/src/lib/types.ts`
- v2 discharge stages: `ADMITTED, MGH_DECLARED, DOCTOR_PF_PENDING, PHARMACY_RTS_AUDIT, HMO_FINAL_LOA, PENDING_SETTLEMENT, CLEARED`. v1 calls the last one `CLEARED_GATE_PASS`.
- v2 charge categories: `ROOM_AND_BOARD, PHARMACY, LABORATORY, IMAGING, SUPPLIES, PROCEDURE, PROFESSIONAL_FEE`. v1 used `ROOM_BOARD, CENTRAL_SUPPLIES` for two of them.
- AI features (Cora chat, OCR, claims scrubber, appeal drafter, executive briefing) **do not exist in v2**. Keep the v1 UI for them but make calls fail gracefully ("AI is temporarily unavailable"). Do NOT build AI endpoints.

---

## 3. How to run things locally

The local Postgres database is `medcore_v2_dev` (already migrated and seeded). Secrets are in the gitignored `.env` at the root of the `mobile-v2` worktree (copied from `medcore-v2/.env`). It already has `PATIENT_ONLINE_PAYMENTS=simulated` and `PATIENT_ONLINE_PROMISSORY=true`.

**Port 8787 is taken** by the old v1 Worker (`workerd`). The user's own v2 API runs on **8790** from the `medcore-v2` folder; their v2 dashboard on **5173**. Don't kill those. Use your own ports:

Terminal A, API on 8788 (from the `mobile-v2` worktree):

```bash
cd /Users/mclein/Documents/Developer/Personal_Projects/MedCore1/.claude/worktrees/mobile-v2/apps/api
PORT=8788 ALLOWED_ORIGINS=http://localhost:5174 PUBLIC_APP_URL=http://localhost:5174 STAFF_MFA_REQUIRED=false npm run start
```

(`STAFF_MFA_REQUIRED=false` only so you can sign in to the dashboard locally without an authenticator. Never change `.env` or production defaults for this.)

Terminal B, dashboard on 5174:

```bash
cd /Users/mclein/Documents/Developer/Personal_Projects/MedCore1/.claude/worktrees/mobile-v2/apps/web
API_PORT=8788 npx vite --port 5174 --strictPort
```

Terminal C, mobile (iPhone 14 Plus simulator is already booted; Expo Go installed):

```bash
cd /Users/mclein/Documents/Developer/Personal_Projects/MedCore1/.claude/worktrees/mobile-v2/apps/mobile
EXPO_PUBLIC_API_PORT=8788 npx expo start --port 8081
```

then open `exp://localhost:8081` in the simulator (`xcrun simctl openurl booted exp://localhost:8081`). After code changes, if the app doesn't reload: `xcrun simctl terminate booted host.exp.Exponent` then open the URL again.

Logins:

- Staff (dashboard): `cfo@stjude.example.test`, password = value of `SEED_PASSWORD` in `.env`. Others: `billing@`, `claims@`, `hmo@`, `dr.cruz@`, `lobby@` + `stjude.example.test`.
- Patients (mobile): "First time here? Link your hospital stay" → MRN + date of birth, then the code from the API log (search the log for `sign-in code for`). Or "Email" with an already-linked email.
  - `MRN-240121` / `1991-05-23` → Liza Navarro, CLEARED, has exit pass `GP-CRKV9FV88W` PIN `394525`. Email `mrn-240121@patients.example.test` already linked.
  - `MRN-240120` / `1958-10-22` → Maria Villanueva. I just PAID her ₱250 balance in testing, so she is now CLEARED too.
  - `MRN-240119` / `1979-03-05` → still has ₱1,250.00 balance, PENDING_SETTLEMENT. Use this one to test payment again.
  - `MRN-240118` / `1975-03-06` → paid, but has an OPEN dispute so it won't clear.
  - Find more: `psql -d medcore_v2_dev -Atc "select p.mrn,p.date_of_birth,e.stage,e.bill_state from patients p join encounters e on e.patient_id=p.id order by e.admitted_at desc"`
  - Reset everything if data gets messy: from `apps/api`, `npm run db:seed` (wipes and reseeds the dev DB; ask the user first, their own server uses the same DB).

Checks that MUST pass before you commit (run from the worktree root):

```bash
npm run check          # typecheck + eslint + all tests (domain 31, api 55, mobile 20+)
npm run format:check   # prettier
npm run build          # web build
```

If prettier complains about copied v1 files, run `npx prettier --write <path>` on them (formatting only is fine).

---

## 4. MOBILE: what is done, what is left

### 4.1 What I did (all uncommitted in `apps/mobile`)

1. Deleted the v2 mobile UI (`src/navigation.tsx`, `src/ui/*`, v2 `src/screens/*`, `src/lib/{apiClient,tokenStore,secureStorage,session,stays,types}.ts`, `src/config.ts`, old tests). A backup of the deleted v2 mobile code is at `/private/tmp/claude-501/.../scratchpad/v2mobile_keep` (and in git history at commit `64e7bad`).
2. Copied the ENTIRE original v1 app from `main:apps/mobile`: `App.tsx`, `src/**`, `assets/**` (icons, provider logos, Cora mascot), `app.json` (plus `expo-secure-store` plugin added).
3. Copied v1 shared files it imports into `apps/mobile/src/shared/` (`coraLanguage.ts`, `governmentId.ts`, `gatePassQr.ts`, `gatePassPayload.ts`) and rewrote imports from `../../../shared/...` to `../shared/...`. Solar icons import from `@medcore/icons`.
4. Added deps to `apps/mobile/package.json`: `@react-native-async-storage/async-storage`, `@react-native-community/netinfo`, `expo-image-picker`, `expo-notifications` (versions match v1; `npx expo install --check` says OK). `npm install` was run at the worktree root.
5. **The key piece: `apps/mobile/src/lib/v2Bridge.ts`.** The v1 screens still call v1 URLs (`/patient/me/overview`, `/encounters/:id/payments`, `/auth/otp/verify`, ...). Instead of rewriting screens, `src/lib/api.ts` (the v1 `ApiClient`) now sends every request to `bridge()` in `v2Bridge.ts`, which calls the real v2 endpoints and converts the replies into the old v1 JSON shapes (`src/types/domain.ts`), converting centavos→pesos. Mappings inside:
   - `/auth/otp/request|verify` → `/auth/patient/code/request|verify` with `client: "mobile"`; returns `{ token, user }` like v1. Bearer token stored by v1 `SessionToken` in SecureStore (unchanged v1 code).
   - `/auth/me`, `/auth/logout` → `/auth/patient/me`, `/auth/patient/logout`.
   - `/auth/login` (password) → refused (400, "use the emailed code").
   - All `GET /patient/me/*` (overview, encounters, encounter by id, payments, receipts, receipt by id, promissory-notes, documents, notifications, claims) → built from `GET /patient/stays` + `GET /patient/stays/:id` for each stay.
   - `POST /encounters/:id/payments` → `POST /patient/stays/:id/payments` (Idempotency-Key forwarded, card = brand + last 4, rail `CREDIT_DEBIT_CARD`→`CARD`, bank names → `BPI|BDO|...`).
   - `POST /encounters/:id/promissory-notes` → v2 promissory (relationship `PATIENT`→`SELF`, id type `PHILSYS_NATIONAL_ID`→`PHILSYS`, `acceptTerms: true`).
   - `POST /encounters/:id/disputes` → `POST /patient/stays/:id/disputes`.
   - `/ai/*` → 503 "AI is temporarily unavailable" (no network call). `/patient/demo/patients` → 403.
   - User id is `acct.<email with unsafe chars replaced>` because v1 uses it inside SecureStore keys (only `[A-Za-z0-9._-]` allowed). **Do not change this back to the raw email** (it crashed the payment screen).
6. Sign-in screen (`src/screens/AuthScreen.tsx`, v1 code): "Link your hospital stay" now asks **MRN + date of birth** (v2) instead of MRN + phone (v1). Password-sign-in link removed. `src/lib/auth.tsx` `CodeTarget` updated to `{ purpose: 'REGISTER'; mrn; dateOfBirth }`.
7. Exit pass: v2 PIN is 6 digits and the QR encodes just the pass number. Updated `src/shared/gatePassPayload.ts` and `src/lib/gatePassCache.ts` (regex `\d{6}`).
8. New (not in v1, the user's task required it): "Question this charge" link inside each bill line in `src/components/BillBreakdown.tsx`, opening `src/components/QuestionChargeSheet.tsx` (built from v1 `ModalOverlay`/`Field`/`PrimaryButton`).
9. Hid empty "Room —" text in `HomeScreen.tsx` and `RecordDetailScreen.tsx` (v2 doesn't expose bed to patients).
10. `src/config/env.ts` + `apiConfig.ts`: default API is `http://127.0.0.1:${EXPO_PUBLIC_API_PORT || 8787}`.
11. `apps/mobile/tsconfig.json`: set `noUncheckedIndexedAccess: false`, `noImplicitOverride: false` (v1 code was written without them).
12. Root `eslint.config.js`, mobile block: uses classic `react-hooks/rules-of-hooks` + `exhaustive-deps` (warn) instead of the React-Compiler rule set; `no-explicit-any` is a warning; AsyncStorage import allowed only in `src/hooks/useOnboarding.ts`, `src/hooks/useUnread.ts`, `src/screens/NotificationsScreen.tsx` (non-sensitive flags). Lint: 0 errors.
13. Tests: `apps/mobile/test/v2Bridge.test.ts` (15 tests) and `apps/mobile/test/sessionToken.test.ts` (5). All 20 pass (`cd apps/mobile && npx vitest run`).

### 4.2 Verified in the iOS simulator (works)

Original v1 sign-in screen → email code sign-in → Home ("Cleared to leave") → Documents → Hospital record with exit pass QR + 6-digit PIN → app restart keeps session → Profile → Log out (v2 session revoked) → "Link your hospital stay" MRN+DOB → code → Home "Pay balance ₱250.00" → full v1 payment flow (amount keypad → method list with GCash/Maya/QR Ph/card/bank logos → GCash → review → confirm) → "Payment Successful" screen. The v2 API recorded the payment (201) and the stay became CLEARED with a gate pass.

### 4.3 Mobile TODO (do these, in order)

1. On the "Payment successful" screen, tap **View Digital Gate Pass** and **View Receipt**; both must work. Fix in `v2Bridge.ts` if a shape is missing (receipt by id = `GET /patient/me/receipts/:reference`).
2. Test with `MRN-240119`: Bill tab → open a charge → "Question this charge" → send (expect `POST .../disputes` 201 in the API log, badge "Billing issue under review"). Then pay by **card** (brand + last 4) and by **Bank Transfer**, and create a **payment plan** (promissory note) on another unpaid patient. Each must return 2xx in the API log.
3. Check every tab and screen for crashes: Home, Bill, Coverage, Payments, Profile, Documents, Notifications/"Hospital updates", Claims (should show empty state), Record detail, Onboarding (first launch only; to see it again delete the app data: `xcrun simctl uninstall booted host.exp.Exponent` is too drastic, instead clear AsyncStorage key used in `src/hooks/useOnboarding.ts`).
4. Open Cora (mascot bottom-right) and the benefit-card scanner: they must show the friendly "AI is temporarily unavailable" error, not crash.
5. Run `npm run check` and `npm run format:check` at the worktree root. Fix anything.
6. Commit ONLY mobile + eslint changes in one commit (see §7 for message format), BEFORE starting the dashboard:
   ```bash
   cd /Users/mclein/Documents/Developer/Personal_Projects/MedCore1/.claude/worktrees/mobile-v2
   git add -A apps/mobile eslint.config.js package-lock.json
   git commit -m "feat(mobile): restore the original v1 patient app on the v2 API" -m "<body>" -m "Co-Authored-By: ..."
   ```

Known limits to leave as-is (v2 API doesn't provide them; listed in `docs/v2/API_GAPS.md`): no bed/doctor/diagnosis for patients, PhilHealth/HMO show amounts only (no case-rate code/provider name), Claims screen empty, no push notifications, no AI.

---

## 5. DASHBOARD: what to do (NOT started)

Goal: `apps/web` must look and behave like `main:apps/dashboard` (see `UI_SCREENSHOTS/dashboard/*.png`), but:

- talk ONLY to the v2 API (`/api/v1/auth/staff/*`, `/api/v1/staff/*`),
- keep the **v2 login flow** (`apps/web/src/staff/Login.tsx`, `apps/web/src/staff/AcceptInvite.tsx`, `apps/web/src/components/AuthShell.tsx`, MFA enrollment, recovery codes). The user explicitly said NOT to restore the v1 login.

### 5.1 What the old dashboard is

- Vite + React 18 + **Tailwind 3** (`tailwind.config.js`, `src/index.css` with `@tailwind` directives, CSS variables like `--brand-teal`). The current `apps/web` uses **Tailwind 4** (`@import 'tailwindcss'` + `@theme`). You must port the v1 colors/utilities into Tailwind 4 `@theme` (e.g. `--color-brand-teal: #087F70;` gives `bg-brand-teal`) and copy all v1 custom CSS classes (`.workspace-toolbar`, `.sidebar-link`, `.priority-action`, `.status-badge*`, `.operations-*`, etc.) from `main:apps/dashboard/src/index.css` into `apps/web/src/index.css`. Check that classes like `bg-brand-teal`, `text-brand-navy`, `bg-surface-app`, `border-slate-200` still resolve. Note v1 sets `:root { font-size: 14.4px }`.
- Entry: `src/main.tsx` → `src/app/App.tsx` → `MedCoreContext` (`src/context/MedCoreContext.tsx`, 1188 lines) holds ALL state: encounters list, selected encounter, active route (`activeRoute` string, NOT react-router), role, modals, notifications, auth.
- Pages (`src/pages/`): CommandCenterPage (Overview), DischargeClearancePage, EncountersLedgerPage, ApprovalsDisputesPage (+ CoverageApprovalsPage, DisputesExceptionsPage), ClaimsEsoaPage, RcmAnalyticsPage, ConfigurationPage.
- Feature components: `src/features/{command-center,discharge,ledger,analytics,patient-clarify}`, `src/components/{layout,modals,common,ai,notifications,printing}`.
- API layer: `src/api/*.ts` + `src/api/client.ts` (`UnifiedMedCoreApiClient`) + `src/config/api.ts`. v1 endpoints it calls:
  ```
  /auth/login /auth/logout /auth/me /auth/switch-role
  /encounters  /encounters/:id  /encounters/physicians  /encounters/:id/ledger|statement|invoice|view-bill
  /encounters/:id/charges  /charges/:id (PATCH, DELETE)
  /encounters/:id/doctor/sign  /doctor/accredited-ceiling  /pharmacy/clear-rts  /hmo/final-loa
  /encounters/:id/advance-stage  /finalize-bill  /send-bill  /gate-pass  /notify-patient-sms  /nudge-doctor
  /encounters/:id/payments  /encounters/:id/promissory-notes  /encounters/:id/disputes
  /disputes/:id/supervisory-waive  /discharge/passes/verify
  /beds  /beds/:id/status  /claims/:id/esoa-xml  /analytics/rcm-metrics
  /notifications  /notifications/mark-read  /notifications/sms-outbox
  /ai/*  (claims/preflight-scrub, hmo/generate-appeal, executive/briefing, cora/chat, ocr/extract-card)
  ```
- `src/data/mockData.ts` and `patientDatasetGenerator.ts` are demo data. **Do not show mock data as if it were real.** Everything visible must come from v2, or show an empty/unavailable state.

### 5.2 Recommended approach (same trick as mobile: a bridge)

Do NOT rewrite the 28k lines of v1 UI. Instead:

1. Copy `main:apps/dashboard/src/**` into `apps/web/src/` (replace the v2 pages/layout). Keep from the current `apps/web/src`: `staff/Login.tsx`, `staff/AcceptInvite.tsx`, `staff/session.ts`, `components/AuthShell.tsx`, `components/QrCode.tsx`, `components/ui.tsx` (Login uses it), `lib/api.ts` (v2 fetch with CSRF), `lib/types.ts`, `assets/logo-badge.png`. Put the v1 code in its own folder (e.g. `apps/web/src/v1/...`) if names collide.
2. Routing: keep `react-router` for `/staff/login` and `/staff/accept-invite` (v2 login). For `/staff/*` after login, render the v1 `App`/`MedCoreProvider` shell (v1 uses its own `activeRoute` state; that's fine).
3. Auth glue: in `MedCoreContext`, replace v1 login/session logic with v2: session check = `GET /api/v1/auth/staff/me` (returns `{ user, facility, permissions }`); if 401 → navigate to `/staff/login`. Logout = `POST /api/v1/auth/staff/logout`. Map v2 roles (`packages/domain/src/access.ts` `STAFF_ROLES`) to v1 roles in `src/types/` (same names mostly: `BILLING_SPECIALIST`, `CLAIMS_ENCODER`, `HMO_COORDINATOR`, `HOSPITAL_CFO`, `ATTENDING_PHYSICIAN`, `LOBBY_SECURITY`). Remove the v1 "switch staff account / switch-role" menu (security: it let anyone become any role). The account menu should show the v2 user and "Sign out".
4. Write `apps/web/src/v1/api/v2Bridge.ts` (model it on `apps/mobile/src/lib/v2Bridge.ts`): make the v1 `UnifiedMedCoreApiClient` route every v1 call to v2, converting cents↔pesos and v1↔v2 shapes. Use the existing `api()` from `apps/web/src/lib/api.ts` for transport (it adds `X-MedCore-CSRF` and cookies). Mapping table to implement (check each against the v2 route files):

   | v1 call                                                   | v2 call                                                                                                                                                                                                                               |
   | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `GET /encounters`                                         | `GET /api/v1/staff/encounters?page=&pageSize=100` (paginate all pages); v1 needs full `Encounter` objects with items/ledger, so also `GET /api/v1/staff/encounters/:id` for each (or for the visible ones). Watch performance; cache. |
   | `GET /encounters/:id`, `/ledger`                          | `GET /api/v1/staff/encounters/:id` (shape: `EncounterDetail` in `apps/web/src/lib/types.ts`)                                                                                                                                          |
   | `GET /encounters/physicians`                              | `GET /api/v1/staff/directory/physicians`                                                                                                                                                                                              |
   | `POST /encounters` (admit)                                | `POST /api/v1/staff/encounters` body `AdmitBody` (needs patientId, bedId, attendingPhysicianId, diagnosis, icd10). Patients: `GET/POST /api/v1/staff/patients`.                                                                       |
   | `POST /encounters/:id/charges`                            | `POST /api/v1/staff/encounters/:id/charges` (`AddChargeBody`, cents)                                                                                                                                                                  |
   | `DELETE /charges/:id`                                     | `POST /api/v1/staff/encounters/:encId/charges/:chargeId/remove` with `{ reason }` (min 5 chars). v1 has no reason field → add a reason prompt.                                                                                        |
   | `PATCH /charges/:id` (edit)                               | NOT in v2 (edit = remove + re-add). Hide edit or implement as remove+add with a reason.                                                                                                                                               |
   | `/doctor/sign`                                            | `POST .../discharge/sign-pf` (`SignPfBody`)                                                                                                                                                                                           |
   | `/pharmacy/clear-rts`                                     | `POST .../discharge/clear-pharmacy`                                                                                                                                                                                                   |
   | `/hmo/final-loa`                                          | `POST .../discharge/final-loa` (`FinalLoaBody`)                                                                                                                                                                                       |
   | `/advance-stage`                                          | v2 has explicit steps: `discharge/declare-mgh`, `discharge/start`, then the ones above. Map by current stage.                                                                                                                         |
   | `/finalize-bill`, `/send-bill`                            | `POST .../bill/finalize`, `POST .../bill/send`                                                                                                                                                                                        |
   | `/payments`                                               | `POST .../payments` (`StaffPaymentBody`, rails CASH/CARD_TERMINAL/BANK_TRANSFER/GCASH/MAYA/QR_PH, Idempotency-Key header REQUIRED)                                                                                                    |
   | `/promissory-notes`                                       | `POST .../promissory-notes` (`PromissoryBody`)                                                                                                                                                                                        |
   | `/encounters/:id/disputes`                                | `POST .../disputes` (`FileDisputeBody`)                                                                                                                                                                                               |
   | `/disputes/:id/supervisory-waive`                         | `POST /api/v1/staff/disputes/:id/resolve` `{ decision: 'WAIVE'                                                                                                                                                                        | 'UPHOLD', note }` (filer can't resolve own; >₱5,000 needs CFO) |
   | `/gate-pass`                                              | `GET .../gate-pass`                                                                                                                                                                                                                   |
   | `/discharge/passes/verify`                                | `POST /api/v1/staff/gate-passes/verify` `{ passNumber, pin }` (PIN is 6 digits)                                                                                                                                                       |
   | `/beds`, `/beds/:id/status`                               | `GET /api/v1/staff/beds`, `PATCH /api/v1/staff/beds/:id`                                                                                                                                                                              |
   | `/claims/:id/esoa-xml`                                    | `GET /api/v1/staff/encounters/:id/esoa.xml`; list `GET /api/v1/staff/claims`                                                                                                                                                          |
   | `/analytics/rcm-metrics`                                  | Only `GET /api/v1/staff/analytics/summary` exists. Compute what you can client-side from encounters (v1 did this in `src/utils/rcmAnalyticsCalculations.ts`), show "not available yet" for the rest. Do NOT invent numbers.           |
   | `/notifications*`, `/notify-patient-sms`, `/nudge-doctor` | NOT in v2. Return empty lists / show "not available yet".                                                                                                                                                                             |
   | `/ai/*`                                                   | NOT in v2. Return 503 → v1 shows its own "AI unavailable" state.                                                                                                                                                                      |
   | `/auth/switch-role`                                       | Remove the feature.                                                                                                                                                                                                                   |

   Disabled/unavailable features must look disabled with a short note, never fake success.

5. Staff permissions: v2 returns `permissions` from `/auth/staff/me`. Hide v1 nav items/actions the user can't use (e.g. lobby role only sees gate-pass verify) — v2 will 403 anyway.
6. Keep the v2 pages for things v1 didn't have but v2 needs: Staff accounts (`staff/pages/Users.tsx`, invitations), Audit log (`staff/pages/AuditLog.tsx`), My Account / MFA (`staff/pages/Account.tsx`), Patients registry (`staff/pages/Patients.tsx`). Add them to the v1 sidebar under "Governance & Admin" with the v1 sidebar styling.
7. Types: v1 used React 18 types; web is React 19. Fix type errors minimally. If strict flags (`noUncheckedIndexedAccess`, `noImplicitOverride`) cause hundreds of errors in v1 code, relax them in `apps/web/tsconfig.json` like I did for mobile (comment why). ESLint: add an `apps/web/src/v1/**` override similar to the mobile one (classic hook rules, `no-explicit-any` warn). Keep the existing `localStorage` ban for credentials — v1 code that stores tokens in localStorage must be removed (v2 uses HttpOnly cookies).
8. Vite: v1 used alias `@/` → `src/`. The current web vite config already maps `@` → `./src`. If you put v1 in `src/v1`, rewrite `@/` imports to `@/v1/` (sed) or add a second alias.
9. Logo: v1 references `/logo/MedCore_Badge_Logo.png` (public path). Either copy `logo/MedCore_Badge_Logo.png` to `apps/web/public/logo/` or import `src/assets/logo-badge.png`.
10. Verify in the browser at `http://localhost:5174` (sign in as cfo): every sidebar page renders with real v2 data, no console errors, actions hit v2 and return 2xx (watch Terminal A log). Compare with `UI_SCREENSHOTS/dashboard/*.png`.
11. `npm run check`, `npm run format:check`, `npm run build` must pass. Commit.

### 5.3 Don'ts for the dashboard

- Don't bring back v1 login, demo personas, prefilled credentials, role switching, or mock data as real data.
- Don't change `apps/api` security (CSRF, cookies, MFA, rate limits, idempotency). If you truly need a new API endpoint, add it in `apps/api` with a zod contract in `packages/domain/src/contracts.ts`, permission check, audit row and a test in `apps/api/test`, and note it in `docs/v2/API_GAPS.md`. Prefer not to.
- Don't edit `main` or the `main` checkout.

---

## 6. Things already committed on `rebuild/mobile-v2` (context)

`git log --oneline main..rebuild/mobile-v2` shows: v2 mobile app, web logo, merge of medcore-v2, v1-look restyle of web, `@medcore/icons`, mobile restyle, discharge board/estimator/rules pages, updates screen, docs (`docs/v2/API_GAPS.md`, README run steps). The web pages `staff/pages/DischargeBoard.tsx`, `Estimator.tsx`, `Rules.tsx` were v2 approximations of v1 pages; once the real v1 pages are ported you can delete them (and their routes in `apps/web/src/router.tsx` / `staff/routes.ts`) if unused.

---

## 7. Finishing up (commits and branch update)

1. Commit messages: imperative, explain why, end with a blank line and
   `Co-Authored-By: <your model> <noreply@...>` if your tool adds one. Two commits: mobile (§4.3 step 6), dashboard (§5.2 step 11).
2. Update brain docs (short, factual):
   - `.brain/CHANGELOG.md`: new top entry "[2026-10-17] Original v1 UI restored on v2" (mobile via `src/lib/v2Bridge.ts`, dashboard via its bridge, dashboard keeps v2 login).
   - `.brain/DECISIONS.md` (v2 section): "[DECISION] Both apps use the original v1 UI over the v2 API through a client-side v1→v2 bridge; the dashboard keeps the v2 staff login (MFA)."
   - `.brain/TODO.md` §0: mark mobile/dashboard restored; keep the API gaps item.
   - `README.md` "Run it locally": mention the mobile sign-in is "Link your hospital stay" (MRN + DOB).
3. Fast-forward the user's v2 branch (only if `rebuild/medcore-v2` hasn't moved; the command refuses otherwise — then STOP and tell the user):
   ```bash
   cd /Users/mclein/Documents/Developer/Personal_Projects/MedCore1/.claude/worktrees/medcore-v2
   git status --short            # must be empty; if not, STOP and ask the user
   git merge --ff-only rebuild/mobile-v2
   npm install
   ```
   The user's dev servers running from that folder (API 8790, web 5173) will hot-reload the web; restart them if needed.
4. Stop your own servers (8788, 5174, 8081). Don't stop the user's (8790, 5173, 8787).
5. Tell the user, in plain words: what works, what is not available (API gaps), and the exact run commands (`npm run dev` at the repo root for API+dashboard, `npm run ios -w @medcore/mobile` for the app; port notes).

---

## 8. Files to read first (in this order)

1. `apps/mobile/src/lib/v2Bridge.ts` — the pattern to copy for the dashboard.
2. `apps/mobile/test/v2Bridge.test.ts` — how to test a bridge.
3. `apps/web/src/lib/api.ts`, `apps/web/src/lib/types.ts`, `apps/web/src/staff/StaffLayout.tsx`, `apps/web/src/router.tsx`.
4. `apps/api/src/routes/staffEncounters.ts`, `staffOperations.ts`, `staffAuth.ts`.
5. `packages/domain/src/contracts.ts`, `access.ts`, `discharge.ts`, `money.ts`.
6. `git show main:apps/dashboard/src/context/MedCoreContext.tsx`, `main:apps/dashboard/src/api/client.ts`, `main:apps/dashboard/src/api/*.ts`, `main:apps/dashboard/src/types/domain.ts`.
7. `docs/v2/API_GAPS.md`.
