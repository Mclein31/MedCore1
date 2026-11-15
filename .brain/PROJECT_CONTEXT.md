# AQROMED / MedCore: Project Context (Operational Brain)

> Last verified against the code and git log: 2026-11-15. Read this first, then follow the links. The previous 2,540-line file was split into the files below.

## 1. Identification
- **Project:** AQROMED (formerly MedCore / MedCore1), an intelligent financial reconciliation and patient engagement platform for Philippine hospitals. Demo prototype, not production.
- **Workspace:** `/Users/mclein/Documents/Developer/Personal_Projects/MedCore1`
- **Repository:** `github.com/Mclein31/MedCore1` (branch `main`; v2 since 2026-10-17).
- **Knowledge layers:** this `.brain/`, the Obsidian vault `MedCore_Vault/` (README index inside), `docs/media/production/` (final film, V7, promo and script).
- **Related projects:** `MedCore-Website` (sibling folder, repo `bizzurp/MedCore-Website`) is the static marketing page (Vite + vanilla JS) whose CTAs link to the dashboard `https://med-core1.vercel.app/`; it has no brain and no code dependency on this repo. `AdvanCare` is the source of the patient email-code sign-in pattern (ADV-AUTH-001) and shares the Cloudflare account and the CSU/Cagayan context. `MedRecord_App` (MedRec) is a separate personal-health-records app on a similar stack; no code or data is shared (its R2 bucket `medrec-vault` is unrelated).

## 2. Mission and scope
MedCore is not an HIS or EMR. It is the financial middleware between hospital systems, payers (PhilHealth, HMOs) and patients. It applies the statutory deduction waterfall (VAT exemption, Senior/PWD discount, PhilHealth, HMO) to the centavo, validates claims before submission, runs discharge clearance in under 45 minutes, and gives patients a plain-language bill, payment, promissory note (RA 9439, 0% interest) and exit pass on their phone. Generative AI explains and drafts; it never computes money.

## 3. Product surfaces
- **Dashboard** (`apps/web`, Vercel): hospital Command Center with Home, Discharge Clearance, Encounters & Ledgers, Approvals & Disputes, Claims & eSOA, RCM Analytics, Settings.
- **Mobile** (`apps/mobile`, Expo SDK 58): patient companion with bills, coverage, simulated payments, documents, exit pass, Cora AI concierge.
- **API** (`apps/api`, Hono + Drizzle on Cloudflare Workers, Neon Postgres 17 via Hyperdrive) and **shared** code (`packages/domain`, `packages/icons`).
- Five AI features: claims preflight scrubber, HMO appeal drafter, executive briefing, Cora, OCR scanner. SMS is a sandbox only.

## 4. Current state (2026-11-15)
- **Code:** v2 rebuild merged into `main` and deployed 2026-10-17; both apps run the original v1 UI over the v2 API. Last commits 2026-11-13 (demo-readiness fixes, native Release builds). Use `README.md`, `DEPLOY.md` and `TESTING_GUIDE.md` for current behavior. Note: the root README still opens with "This branch (`rebuild/medcore-v2`)…" wording from before the merge.
- **Hosted demo:** dashboard `https://med-core1.vercel.app` (Vercel, `/api` proxied same-origin) + Worker `https://medcore-backend.mcleinonza0531.workers.dev` + Neon `medcore-sg` (Singapore) branch `demo` (fictional data); branch `production` = schema only. Moved from Ohio 2026-10-16.
- **Pending deploy:** the hosted Worker was last deployed 2026-10-28 (rate limits, cooldown, 3.1 primary); migrations `0002`–`0003` and the 2026-10-28 / 2026-11-13 API changes await the owner (TODO "Demo readiness").
- **Mobile runtime:** Expo SDK 58 / React Native 0.88 / React 19.3.0 (shared with the dashboard through root overrides). Demo from standalone Release builds, not Expo Go. Set `EXPO_PUBLIC_API_BASE_URL`, not `EXPO_PUBLIC_API_URL`; unset means the hosted Worker.
- **AI:** Gemini `gemini-3.1-flash-lite` primary, `gemini-3.5-flash-lite` backup, through the Interactions API on the free tier (15 RPM); billing still to be set up.
- Financial engine is centavo-exact (v1 verified 250/250 fixtures with zero drift; v2 has property tests in `packages/domain`). Payments are simulated by design (university presentation).
- Patients sign in with a 6-digit email code sent from `medcore1.noreply@gmail.com` (Gmail App Password in Worker secrets). Demo patient emails are `+` aliases of the owner's Gmail. Staff sign in with password + mandatory TOTP.
- Known gaps: unverified official PhilHealth eSOA DTD conformance, no signed store builds, no refunds flow. See `TODO.md`.
- Seed accounts take their password from `SEED_PASSWORD`; never record the value in the brain.

## 5. Milestone
PGC Digital Innovation Challenge presentation on 2026-12-10 (Tuguegarao City).

## 6. Links
| File | Contents |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, topology, domain engine, schema, API, AI pipeline |
| [DECISIONS.md](DECISIONS.md) | Current `[DECISION]`s, newest first; v1-era periods in `archive/` |
| [TODO.md](TODO.md) | Demo readiness, open product/security/DB items, verification gaps, done |
| [CHANGELOG.md](CHANGELOG.md) | Condensed dated history |
| [NOTES.md](NOTES.md) | Baselines, regulation, positioning, demo data, environments, doc pointers |
| [archive/](archive/) | v1 architecture, v1-era changelog and decisions (verbatim) |
