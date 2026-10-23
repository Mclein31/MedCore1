# AQROMED / MedCore: Notes (Operational Brain)

Reference facts and research that are still true but are not decisions or tasks. Never put passwords, tokens or connection strings here.

## 1. Mission and objectives
MedCore resolves seven billing conflicts among patients, hospitals and insurers: unclear patient responsibility; discharge billing disputes; delayed payments and slow reimbursements; heavy billing admin burden; siloed HMO portals; legacy hospital systems that do not talk to modern platforms; fragmented payment channels needing in-person cashier visits. Intended outcomes: transparent bills with zero surprise fees, no discharge billing confrontations, faster collections and reimbursements, less clerical work, one view over many HMO portals, middleware over existing systems, phone payments (e-wallets, bank transfer, QR Ph, digital promissory notes), and discharge in under 45 minutes. Outputs: optimized electronic claim packages (primary and secondary case rates plus HMO), an itemized patient statement sent to the phone, a hospital dashboard of real-time ledgers and reports.

## 2. Macro baselines (PSA, DOH, PHIC)
- Current health expenditure: ₱1.44 T (2023) and ₱1.56 T (2024). Household out-of-pocket: 44.4% (2023), 42.7% (2024).
- Government and compulsory financing 42.6% of CHE (2023). PhilHealth 10.2% (down from 13.4% in 2022); voluntary health insurance rose 44.6% to 13.0% (₱161.35 B), passing PhilHealth.
- PhilHealth case rates: +30% (Circular 2024-0001) and a further +50% on about 9,000 rates (Circular 2024-0037, effective 2025-01-01).
- HMO industry 2024: ₱979.8 M net income (after a ₱4.27 B loss in 2023), ₱79.37 B revenue, ₱61.05 B claims paid, 25 licensed HMOs (Insurance Commission).
- Researched: PHAPi reports ₱4–10 B in delayed, RTH or denied claims (2023–2024); 15–20% of private hospital claims historically RTH; discharge takes 4–8+ hours in tertiary private hospitals (2.5–4.5 hours rural); IC complaints against HMOs rose 33.8% (234 in 2022 to 313 in 2023).

## 3. Regulation
- RA 9439 anti-detention (patients leave on a promissory note, 0% interest). RA 10932 anti-deposit (pre-admission estimates are non-binding orientation). RA 11223 UHC (electronic claims standards). RA 11765 consumer protection for financial products, with IC EO 192 (s. 2015). RA 10173 Data Privacy Act. RA 9994 and 10754 (Senior and PWD 20% discount plus 12% VAT exemption).
- PhilHealth: Circular 2019-0002 (CF4 mandatory), 2023-0026 and eClaims 3.0 (eSOA XML only, scanned SOAs phased out), 2024-0006 (DRG shadow billing, CF5), 2024-0037 (+50% ACR), 2024-0021 (Single Period of Confinement abolished from 2024-10-01) and 2025-0015 (retroactive refiling to 2019-02-20). 60-day filing cutoff; amber alerts at days 31–60.
- GAD: RA 7192, RA 9710 and NEDA-PCW HGDG 3rd Edition (2019). Projects scoring 15.0 or more of 20 are Gender-Responsive; MedCore targets Box 13 (Health) and Box 19 (ICT), which lets the Provincial Government allocate its 5% GAD funds. Compendium: `MedCore_Vault/RESEARCH/gad_hgdg_guidelines.md`.
- Government ID formats: `MedCore_Vault/RESEARCH/government_id_formats.md`.

## 4. Competition and positioning
- PGC Digital Innovation Challenge (Provincial Government of Cagayan, Provincial Administrators' Office). Presentation 2026-12-10, SP Session Hall, Capitol Compound, Tuguegarao City. Academic partner Cagayan State University (CICT and Engineering). EGAY pillars: good governance, youth and elderly welfare, GAD. Deck: `MedCore_Presentation_Deck.pptx` (12 slides, presenter notes).
- Quadrants: outpatient and telehealth (NowServing, KonsultaMD, Flywire); legacy hospital ERPs (BizBox, Comlogik, SAP Healthcare PH); B2B HMO switches (MediLink, PayLink); MedCore alone in high patient UX with deep multi-payer inpatient adjudication. ERRC: eliminate system replacement and discharge delay; reduce clerical overhead (40%) and RTH (to under 2%); raise bed turnover (+300 bed-hours/day); create the statutory waterfall engine and a real-time patient app.
- Olive AI (liquidated October 2023, over $900 M raised, $4 B valuation) failed through brittle RPA scraping, black-box claims versus deterministic reality, and unfocused sprawl. See the decision on safeguards.
- Demo economics quoted in analytics: +₱31.4M/yr for a 250-bed hospital; 24-hour averages such as 34.2 min TAT versus a 4.8 h baseline are legacy demo values.

## 5. Demo dataset (`apps/server` seed and `apps/dashboard/src/data`)
250 encounters (15 handcrafted flagship cases plus 235 generated), 200 beds on 6 floors, 13 attending doctors, 8 HMO carriers (Maxicare, Intellicare, Medicard, Pacific Cross, PhilCare, Etiqa, Caritas Health Shield, Insular). Totals: gross ₱12,268,905.00; PhilHealth ₱7,500,900.00; HMO ₱3,089,537.13; net patient out-of-pocket ₱1,785,411.57; 8 promissory notes; 15 disputed items (₱50,670.00); 83 gate passes. Problem mix: clean 49.2%, HMO verification 18.0%, missing documentation 9.2%, coding mismatch 7.2%, PhilHealth coverage issues 6.4%, billing discrepancies 6.0%, incomplete requirements 5.2%, denied or returned 3.6%, in review 1.2%. Archetype cases include `enc-1049` (HMO final LOA delay), `enc-5521` (RTH, CF4 incomplete), `enc-4552` (promissory note), `enc-8812` (seed encounter at `HMO_FINAL_LOA`). The hosted `demo` branch currently holds 248 encounters. Audit-aligned personas: Carlos (physician), Kristine, and Juan (linked MRN, doctor-pending).

## 6. Hosted and local environments
- Hosted: Vercel dashboard + Cloudflare Worker + Neon `demo` branch (Singapore). Local: `npm run dev` runs server on 8787 and Vite on 5173; Expo Metro 8081, web preview 8082.
- Local and hosted accounts do not sync; reseeding wipes locally created accounts. Credentials are not stored in the brain: seed accounts use `SEED_PASSWORD`, and any ad hoc test account was delivered to the user directly.
- Publishing the Worker (`wrangler deploy`) is separate from `git push`; pushing the frontend does not publish backend routes. Worker secrets: `GATE_PASS_SECRET`, `GEMINI_API_KEY`, plus the DB via Hyperdrive.
- Hyperdrive caching must stay disabled (no read-after-write consistency). After changing the Hyperdrive origin run `npx wrangler deploy` from `apps/server` so every isolate picks it up.
- Do not use `.neon` or `.env*` files in commits. `.wrangler/` is git-ignored.

## 7. Documentation pointers
- Audit 2026-10-16: `docs/audits/2026-10-16/SECURITY_AND_ARCHITECTURE_AUDIT.md`. Earlier audits: `docs/audits/2026-10-09/`, `docs/audits/2026-10-10/`.
- Singapore database: `docs/production/NEON_REGION_MIGRATION.md`. Simulated payments: `docs/implementation/simulated-payments.md`. Mobile admin: `docs/implementation/mobile-admin-demo.md`. Government IDs: `docs/implementation/government-id-validation.md`.
- Validation evidence: `docs/validation/{cora-language,ai-cache,sms-sandbox,sms-clean-presentation,ui-polish,cora-mascot}/`, `apps/mobile/{AUDIT.md,README.md,validation/*}`, `apps/dashboard/validation/*`.
- Product: `MedCore_Vault/` (README index, `ONTOLOGY.md`, `BUSINESS/competitive_landscape.md`, `RESEARCH/market.md`, `RESEARCH/mobile_ui_patterns.md`, `RESEARCH/mobile_reference_mapping.md`, `DECISIONS/product_decisions.md` including ADR-008).
- Media: `docs/media/` (V3 prompt, README, assets), `SCREEN_RECORDING_GUIDE.md`, `docs/media/assets/ui/` (screenshots), `docs/media/assets/logos/` (brand sources, `CORA_MASCOT.md`).
