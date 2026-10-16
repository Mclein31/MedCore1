# AQROMED / MedCore: Project Context (Operational Brain)

> Last synchronized: 2026-10-16. Read this first, then follow the links. The previous 2,540-line file was split into the files below.

## 1. Identification
- **Project:** AQROMED (formerly MedCore / MedCore1), an intelligent financial reconciliation and patient engagement platform for Philippine hospitals. Demo prototype, not production.
- **Workspace:** `/Users/mclein/Documents/Developer/Personal_Projects/MedCore1`
- **Knowledge layers:** this `.brain/`, the Obsidian vault `MedCore_Vault/` (README index inside), `docs/media/production/` (final product video and script only).

## 2. Mission and scope
MedCore is not an HIS or EMR. It is the financial middleware between hospital systems, payers (PhilHealth, HMOs) and patients. It applies the statutory deduction waterfall (VAT exemption, Senior/PWD discount, PhilHealth, HMO) to the centavo, validates claims before submission, runs discharge clearance in under 45 minutes, and gives patients a plain-language bill, payment, promissory note (RA 9439, 0% interest) and exit pass on their phone. Generative AI explains and drafts; it never computes money.

## 3. Product surfaces
- **Dashboard** (`apps/dashboard`, Vercel): hospital Command Center with Home, Discharge Clearance, Encounters & Ledgers, Approvals & Disputes, Claims & eSOA, RCM Analytics, Settings.
- **Mobile** (`apps/mobile`, Expo): patient companion with bills, coverage, simulated payments, documents, Cora AI concierge.
- **API** (`apps/server`, Hono on Cloudflare Workers) and **shared** code (`apps/shared`).
- Five AI features: claims preflight scrubber, HMO appeal drafter, executive briefing, Cora, OCR scanner. SMS is a sandbox only.

## 4. Current state (2026-10-16)
- Hosted demo: Vercel dashboard + Cloudflare Worker + Neon Postgres in **Singapore** (project `medcore-sg`). Branch `production` = schema only; branch `demo` = all fictional demo data, used by the hosted app. Moved from Ohio on 2026-10-16: `docs/production/NEON_REGION_MIGRATION.md`.
- Financial engine verified on 250/250 fixtures with zero centavo drift. Payments are simulated by design (university presentation).
- **2026-10-16 security and architecture audit** found 3 critical and 10 high issues (shared seed password prefilled in the login, patient registration without proof of possession, no rate limiting, and more). Nothing is fixed yet. Report: `docs/audits/2026-10-16/SECURITY_AND_ARCHITECTURE_AUDIT.md`. Implementing it is the next major work.
- Known gaps: migration drift (D12), unverified official PhilHealth DTD conformance, no signed native builds, product video not yet rendered. See `TODO.md`.
- Seed accounts take their password from `SEED_PASSWORD`; never record the value in the brain.

## 5. Milestone
PGC Digital Innovation Challenge presentation on 2026-12-10 (Tuguegarao City).

## 6. Links
| File | Contents |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, topology, domain engine, schema, API, AI pipeline |
| [DECISIONS.md](DECISIONS.md) | Every `[DECISION]`, newest first |
| [TODO.md](TODO.md) | Audit remediation phases, DB, release gates, verification gaps |
| [CHANGELOG.md](CHANGELOG.md) | Condensed dated history |
| [NOTES.md](NOTES.md) | Baselines, regulation, positioning, demo data, environments, doc pointers |
