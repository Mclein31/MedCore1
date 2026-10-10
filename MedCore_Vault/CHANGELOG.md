# CHANGELOG.md — MedCore Vault Revision History

> **Epistemic Status**: Immutable System Audit Log  
> **Knowledge Layer**: Product Intelligence Vault (`MedCore_Vault/`)  
> **Standards Compliance**: Keep a Changelog & Semantic Versioning

## [1.25.0] — 2026-10-11

### Performance, Reliability & Data Sync Refactor: Persistent DB Pooling, Census Optimization, AI Latency & Deadlines, Dashboard Code-Splitting, SWR Hydration, and Mobile Polling Tuning

#### Changed
- [DATABASE CONNECTION MANAGEMENT] **Persistent Node.js Database Pooling (`apps/server/src/index.ts`, `apps/server/src/db/index.ts`)**:
  - Replaced per-request connection instantiation and teardown (`createDbConnection` and `await pool.end()`) with persistent cached pool reuse in Node.js runtime.
  - Tuned pool parameters (`idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 10000`) to preserve warm TCP/TLS connections to remote PostgreSQL. Preserved Cloudflare Workers isolate cleanup via execution context `waitUntil`.
- [BACKEND CENSUS & QUERY ENGINE] **Concurrent Census Hydration & Query Invalidation Cache (`apps/server/src/routes/encounters.ts`)**:
  - Replaced 250-element `inArray` queries with indexed inner joins on `encounters.facility_id` for full facility census fetches.
  - Consolidated 7 child entity queries from sequential batches into a single concurrent `Promise.all`.
  - Added a 10-second TTL facility census cache (`censusCache`) with deterministic mutation-triggered cache invalidation (`invalidateEncountersCache`). Dropped warm census latency to 234ms (>98% speedup).
- [AI SERVICES & TIMEOUT DEADLINES] **Bounded Timeout Deadlines, Fast-Fail & Context Pruning (`apps/server/src/services/ai/geminiClient.ts`, `apps/server/src/services/ai/executiveBriefingService.ts`, `apps/dashboard/src/components/ai/ExecutiveAiBriefingCard.tsx`)**:
  - Added explicit 15-second timeout deadline (`AbortSignal.timeout(15000)`) and immediate fast-fail for permanent client 4xx HTTP errors (400, 401, 403, 404).
  - Pruned unused statutory waterfalls, PhilHealth claims, and HMO authorization queries from executive briefing compilation.
  - Implemented 5-minute facility-scoped TTL cache (`briefingCache`) and dashboard card module-level caching with user force refresh support.
- [DASHBOARD STARTUP & RESILIENCE] **Removal of Fatal First-Open Screen, Error Boundaries & Code-Splitting (`apps/dashboard/src/app/App.tsx`, `apps/dashboard/src/context/MedCoreContext.tsx`)**:
  - Replaced premature fatal screen on empty initial encounters with an animated non-blocking synchronization layout.
  - Added top-level React `ErrorBoundary` with reload and retry recovery.
  - Code-split 8 operational pages via `React.lazy` and `Suspense`, reducing main entry bundle from 809 kB to 504 kB.
  - Implemented Stale-While-Revalidate (SWR) `sessionStorage` caching for instant encounter census hydration, decoupled session verification from census loading, and eliminated redundant sequential notification hydration loops.
- [MOBILE CLIENT POLLING] **Demographic Caching & Relaxed Polling Interval (`apps/mobile/src/hooks/PatientProvider.tsx`)**:
  - Cached patient demographic profile (`cachedPatient`) across polling ticks to eliminate redundant `api.getMe()` round-trips.
  - Relaxed background polling from 5s to 12s, reducing idle mobile battery and network request volume by 58%.

## [1.24.0] — 2026-10-10

### MedCore AI Feature Delivery: Cora Concierge, Forensic Scrubber, HMO Appeal Drafter, Executive Briefing & Multimodal OCR

#### Added
- [AI FOUNDATION & SECURITY GUARDRAILS] **Zero PHI Leakage Bidirectional Sanitizer & Offline Mock Resilience (`apps/server/src/config/aiConfig.ts`, `apps/server/src/services/ai/phiScrubber.ts`, `apps/server/src/services/ai/geminiClient.ts`)**:
  - Implemented bidirectional ephemeral de-identification (`scrubPatientData` and `rehydrateText`) compliant with RA 10173 (Data Privacy Act of 2012). Masks patient names, MRNs, PhilHealth PINs, mobile/landline numbers, room/bed numbers, and doctor credentials into ephemeral tokens kept exclusively in transient memory during requests.
  - Implemented Google AI Studio REST client (`gemini-2.5-flash` default, `gemini-1.5-pro-latest` escalation) with exponential backoff retries (3 attempts on HTTP 429/503), structured JSON mode (`responseMimeType: "application/json"`), and deterministic typed offline mock fallbacks ensuring 100% test continuity when `GEMINI_API_KEY` is unset or `NODE_ENV === 'test'`.
  - Added PostgreSQL Drizzle audit logging tables `ai_conversations` and `ai_audit_logs` tracking inference latency, risk scores, models used, and non-blocking telemetry.
  - Codified prompt architectures and Zod validation schemas (`coraPrompts.ts`, `scrubberPrompts.ts`, `appealPrompts.ts`, `briefingPrompts.ts`, `ocrPrompts.ts`).
- [STAFF DASHBOARD AI] **Clinical Claims Forensic Scrubber & RTH Risk Gauge (`apps/dashboard/src/components/ai/ClaimsPreflightScrubberModal.tsx`, `apps/dashboard/src/pages/ClaimsEsoaPage.tsx`)**:
  - Integrated pre-flight forensic claims auditor analyzing CF4 clinical narratives against ICD-10 diagnostic classifications and chargemaster feeds prior to PhilHealth XML submission.
  - Generates numerical RTH risk score (0.00–1.00), risk tier badge, discrepancy flags with regulatory citations, clean claim readiness score, and 1-click suggested doctor addendum copy to preempt Return-to-Hospital rejections. Respects PhilHealth Circulars 2024-0021 and 2025-0015 regarding abolition of the 90-day Single Period of Confinement (SPC) penalty.
- [STAFF DASHBOARD AI] **Automated HMO Medical Necessity Appeal Drafter (`apps/dashboard/src/components/ai/HmoAppealGeneratorModal.tsx`, `apps/dashboard/src/pages/DisputesExceptionsPage.tsx`, `apps/dashboard/src/pages/CoverageApprovalsPage.tsx`)**:
  - Built medico-legal reconsideration letter generator citing RA 11765 (Financial Products and Services Consumer Protection Act) and Insurance Commission Executive Order No. 192 (s. 2015).
  - Integrates with print engine (`HMO_APPEAL_LETTER` print template in `PrintDocumentContainer.tsx` and `printEngine.ts`), providing live editable markdown, letterhead preview, copy-to-clipboard, and formal physician conforms.
- [STAFF DASHBOARD AI] **Executive RCM Telemetry Briefing (`apps/dashboard/src/components/ai/ExecutiveAiBriefingCard.tsx`, `apps/dashboard/src/pages/CommandCenterPage.tsx`, `apps/dashboard/src/pages/RcmAnalyticsPage.tsx`)**:
  - Synthesizes 3-minute executive C-suite briefing on hospital census, departmental dwell times (Doctor PF sign-off, Pharmacy RTS credit, HMO LOA turnaround, Cashier settlement), reclaimed bed-hours, trapped capital, and top 3 strategic recommendations.
  - Mounted at top of Hospital Operations Home and Executive RCM Analytics.
- [PATIENT MOBILE AI] **Cora Multilingual Billing Concierge (`apps/mobile/src/components/CoraAssistantModal.tsx`, `apps/mobile/src/components/CoraFloatingPill.tsx`, `apps/mobile/src/services/aiApi.ts`)**:
  - Developed conversational patient advocate modal supporting Taglish (`fil`), English (`en`), and Ilocano (`ilo`).
  - Presents grounded statutory waterfall summary guaranteed with Zero Centavo Drift ($\Delta = ₱0.00$), ensuring generative models never mutate or calculate financial balances.
  - Integrated speech-to-text (Web Speech API) with graceful fallback and contextual suggested action chips that navigate directly to billing, payment, coverage, and dispute screens.
  - Triggered via floating Cora pill FAB on `HomeScreen.tsx`, hero card action on `BillScreen.tsx`, coverage action on `CoverageScreen.tsx`, and charge explanation action on `RecordDetailScreen.tsx`.
- [PATIENT MOBILE AI] **Multimodal Benefit Card & Gov ID Scanner (`apps/mobile/src/components/BenefitCardScannerModal.tsx`, `apps/mobile/src/screens/CoverageScreen.tsx`)**:
  - Multimodal Gemini vision scanner extracting PhilHealth PINs, Senior Citizen OSCA ID control numbers, PWD IDs, PhilSys National IDs, and commercial HMO card certificates.
- [SYSTEM VERIFICATION] **Service Verification Suite (`apps/server/__tests__/aiServices.test.ts`, `package.json`)**:
  - Added `npm run test:ai` test suite certifying: Zero PHI leaks, 100% bidirectional rehydration fidelity, offline mock schema conformance across all 5 schemas, Zero Centavo Drift invariant, security role-gating (401 enforcement), and live Hono API route integration (14/14 tests pass).

#### Changed
- [SECURITY & ROUTING] **Staff AI Route Authentication & Patient Access (`apps/server/src/routes/ai.ts`, `apps/server/src/middleware/access.ts`)**:
  - Mounted `/api/v1/ai` router under `aiApp`. Protected staff audit endpoints with `requireAuth` and `requireRole(['BILLING_SPECIALIST', 'CLAIMS_ENCODER', 'HOSPITAL_CFO', 'HMO_COORDINATOR'])`. Granted `PATIENT_GUARANTOR` role access to Cora chat and card OCR endpoints.
- [COMMAND PALETTE] **Staff AI Query Integration (`apps/dashboard/src/components/layout/SearchModal.tsx`)**:
  - Added instant navigation shortcuts for AI Claims Scrubber, HMO Appeal Drafter, Executive Briefing, and Statutory Deductions Verification into the `Cmd+K` command palette.

## [1.23.0] — 2026-10-10

### Promissory Note Settlement State Machine & Native Mobile Font Typography Alignment

#### Changed
- [STATE SYNCHRONIZATION] **Promissory Note Automatic Settlement on Paid Encounters (`apps/server/src/routes/payments.ts`, `apps/server/src/routes/patient.ts`, `apps/server/src/routes/encounters.ts`, `apps/server/src/routes/promissory.ts`)**:
  - Automatically transitions active RA 9439 promissory notes (`promissory_notes.status = 'SETTLED'`) whenever encounter balances reach ₱0.00 (`isFullySettled` / `remainingBalance <= 0`).
  - Auto-reconciles promissory note query endpoints (`GET /api/v1/patient/me/promissory-notes` and `GET /api/v1/promissory-notes`) to ensure notes associated with paid encounters immediately reflect `SETTLED` in responses and database records.
- [MOBILE UI REFINEMENT] **Payment Plans Settled Badge and Subtitle Presentation (`apps/mobile/src/screens/PaymentsScreen.tsx`)**:
  - Updated patient mobile payment plans list to recognize settled encounter and note statuses, rendering `✓ Settled` badge with green tone and `X months · ₱Y/mo · Settled` subtitle rather than displaying completed plans as active.
- [DASHBOARD TYPOGRAPHY] **Web Dashboard Font Stack Alignment with Mobile Native Typography (`apps/dashboard/tailwind.config.js`, `apps/dashboard/index.html`, `apps/dashboard/src/index.css`)**:
  - Updated Tailwind `fontFamily.sans` to use native Apple system typography (`-apple-system`, `BlinkMacSystemFont`, `"SF Pro Text"`, `"SF Pro Display"`, `"SF Pro"`, `system-ui`) matching the iOS/macOS mobile experience.
  - Removed Google Fonts `Inter` stylesheet dependency and Inter-specific `cv02-cv11` character variant settings from `index.css`, allowing the dashboard to render crisp, native San Francisco system typography while preserving strict financial tabular numerals.
- [DASHBOARD PROMISSORY REGISTER] **Disputes & Discharge Radar Settled Note Representation (`apps/dashboard/src/pages/DisputesExceptionsPage.tsx`, `apps/dashboard/src/features/discharge/components/ActiveDischargeRadar.tsx`)**:
  - Replaced hardcoded `Active Guaranteed` badge with dynamic status rendering, presenting `Settled (Paid in Full)` for fulfilled statutory notes.
- [PHILHEALTH COVERAGE HARMONIZATION] **PhilHealth-First Statutory Claim Status Resolution (`apps/mobile/src/lib/format.ts`, `apps/mobile/src/screens/CoverageScreen.tsx`)**:
  - Resolved status mismatch where PhilHealth showed "In review" even when benefits were verified and the HMO eLOA was approved.
  - Aligned `describeClaimStatus` for pre-flight `CLEAN` claims to display `Verified & applied` with `ok` (green checkmark) tone and clear explanation that the statutory Case Rate benefit has been verified and deducted from the bill.

## [1.22.0] — 2026-10-09

### Harmonized Gender & Development Guidelines (HGDG 3rd Edition) Regulatory Architecture Integration

#### Added
- [KNOWLEDGE COMPENDIUM] **Harmonized Gender & Development Guidelines (HGDG) Compendium (`MedCore_Vault/RESEARCH/gad_hgdg_guidelines.md`)**: Synthesized the official NEDA, PCW, and ODA-GAD Network HGDG (3rd Edition, 2019) guidelines into the research vault. Documented the Sara Longwe 5-level empowerment framework, 10 Core GAD Elements, 20-point Box 7 assessment scoring scale, Health Sector (Box 13) and ICT Sector (Box 19) checklists, and statutory anchors under RA 7192, RA 9710 (Magna Carta of Women), and NEDA ICC Policy (2016).
- [STATUTORY REGISTRATION] **GAD & Magna Carta of Women Codification (`MedCore_Vault/RESEARCH/regulations.md`, `MedCore_Vault/RESEARCH/sources.md`)**: Codified Republic Act No. 7192, Republic Act No. 9710, and NEDA ICC HGDG submission rules into the legal compendium and bibliographic citations.
- [ONTOLOGY EXPANSION] **GAD & Sex-Disaggregated Data Lexicon (`MedCore_Vault/ONTOLOGY.md`)**: Formally defined canonical domain entries for Harmonized Gender and Development Guidelines (HGDG), Gender Mainstreaming, and Sex-Disaggregated Data (SDD).

#### Changed
- [PRODUCT ROADMAP & BRAIN ALIGNMENT] **Provincial Governance & Public Hospital GAD Qualification (`.brain/PROJECT_CONTEXT.md`)**: Mapped MedCore's architecture to qualify as "Gender-Responsive" ($\ge 15.0/20.0$ on HGDG Box 7), unlocking provincial LGU GAD budget attribution under RA 9710 (5% statutory allocation) for public hospital rollouts and the PGC Digital Innovation Challenge.
- [RESEARCH PROPOSAL SYNCHRONIZATION] **Detailed Research Proposal Full Sync & Proposal Future Tense Alignment (`docs/this one.docx`, `docs/MedCore_Detailed_Research_Proposal_REVISED.docx`)**: Synchronized the detailed capstone proposal Word documents and markdown mirrors with the project Brain and Vault. Comprehensively expanded Section III (RRL) to cover the private HMO landscape (Insurance Commission regulation under EO 192, ₱61.05B claims paid in 2024, the "PhilHealth-First" coordination rule, the 2–4 hr final LOA adjudication bottleneck, and consumable exclusions). Formally integrated the 4 AI modules (Cora Multilingual Concierge Chatbot, Clinical Claims Forensic Pre-Flight Scrubber & RTH Predictor, Automated HMO Medical Necessity Appeal Drafter, Executive Command Telemetry Briefing) and the 5-Pillar closed-loop operating architecture (GUIDE, VERIFY, RECONCILE, REWARD/SETTLE, REPORT, IMPROVE) using the paper's original scholarly academic perspective and future tense active proposal voice ("will implement", "will deploy", "will operationalize"). Mirrored verified `.docx` and `.zip` files to user's `Downloads/` directory under `this one.docx` and `this one.zip`.

## [1.21.0] — 2026-10-02

### Brand Restoration, Design Token Primitives, UX Overhaul & PostgreSQL 17 Backend Hardening

#### Added
- [FEATURE] **Design System Control Primitives Library (`src/components/common/`)**: Created unified UI control primitives: `Button.tsx`, `IconButton.tsx`, `SearchInput.tsx`, `Select.tsx`, `SegmentedTabs.tsx`, and `controlTokens.ts`. Standardized sizing scale (`sm` = 32px / `h-8`, `md` = 36-40px / `h-9`-`h-10`, `lg` = 44px / `h-11`), border radius (`rounded-lg`), font typography, and accessibility attributes across the entire product.
- [FEATURE] **Unified "Approvals & Disputes" Workstation (`src/pages/ApprovalsDisputesPage.tsx`, `src/components/layout/SidebarNav.tsx`)**: Merged split coverage approvals and billing exceptions into a unified page featuring `DualOperationalPipelines` with a 3-way subview switcher (`Dual Pipelines`, `HMO Gateway Roster`, `Disputes & Promissory`) and consolidated sidebar attention badge count.
- [FEATURE] **Discharge Radar Queue Collapse & Statutory Audit Clearance (`src/features/discharge/components/ActiveDischargeRadar.tsx`)**: Introduced `isQueueCollapsed` toggle (`PanelLeftClose`/`PanelLeftOpen`) enabling 100% full-width detail view for clinical coordinators. Eliminated whitespace void in `[CLEARANCE]` tab by embedding the 45-minute statutory SLA Turnaround Clock, Philippine Statutory Compliance audit cards (RA 9439, RA 9994/10754, Circular 2024-0037), and Out-of-Pocket breakdown snapshot.

#### Changed
- [BRANDING] **Restored Official MedCore Identity**: Reverted all legacy AqroMed text, alt tags, and logo instances across headers, navigation, print templates, and document engines using official assets from `logo/` (`MedCore _Symbol_logo.png`, `MedCore_Text_logo.png`, `public/logo.png`).
- [UX] **Navigation & Layout Simplification (`src/components/layout/SidebarNav.tsx`, `src/pages/CommandCenterPage.tsx`)**: Renamed primary navigation link to "Home", decoupled patient triage queue from executive command center, and converted all ad-hoc buttons/filters to standardized design token primitives.

#### Fixed
- [SECURITY & STABILITY] **Disputed Chargemaster Deletion Restriction Guard (`server/routes/charges.ts`)**: Added pre-deletion validation checking against `billing_disputes`. Prevents unhandled PostgreSQL foreign key violation (`onDelete: 'restrict'`), returning clean HTTP 400 `ITEM_HAS_DISPUTES`.
- [DATA INTEGRITY] **Atomic Database Transaction for Promissory Note Execution (`server/routes/promissory.ts`)**: Wrapped promissory note insertion, gate pass issuance, bed status housekeeping transition, encounter stage advancement, and audit logs inside atomic `await db.transaction()`.
- [DATA INTEGRITY] **Foreign Key Correction in Supervisory Waiver Audit Log (`server/routes/disputes.ts`)**: Fixed audit log mapping to use `user.facilityId` rather than assigned user UUID, eliminating foreign key violation on `system_audit_logs_facility_id_facilities_id_fk`.
- [IDEMPOTENCY] **Discharge Exit Pass Verification Idempotency Guard (`server/routes/gatePass.ts`)**: Preserves original `verifiedAt` timestamp and returns `passAlreadyVerified: true` without redundant database writes when verifying an already cleared pass.

## [1.20.0] — 2026-09-26

### Systemic Code Audit & Comprehensive Defect Resolution

#### Fixed
- [BUGFIX] **Financial Settlement Balance Clearing & Trapped Revenue KPI (`src/types/domain.ts`, `src/context/MedCoreContext.tsx`, `src/components/dashboard/ActiveDischargeRadar.tsx`)**: Resolved defect where recording patient payments left `waterfall.netPatientDue` unchanged. Added `patientPaid` tracking, set `netPatientDue = 0` on payment settlement, advanced stage to `CLEARED_GATE_PASS`, updated Command Center Trapped Revenue KPI, and replaced payment trigger with a disabled `✓ Settled & Cleared (Gate Pass Issued) - ₱0.00 DUE` badge.
- [BUGFIX] **Cross-Patient Action Synchronization in Active Discharge Radar (`src/components/dashboard/ActiveDischargeRadar.tsx`)**: Resolved cross-patient mutation risk by synchronizing `selectEncounter(enc.id)` before opening any modal (Doctor Quick-Sign, Gate Pass, Promissory Note) or resolving stage blockers.
- [BUGFIX] **Standalone Promissory Note Selector & Zero-Balance Dead-End Elimination (`src/components/actions/DigitalPromissoryModal.tsx`, `src/context/MedCoreContext.tsx`)**: Replaced the terminal zero-balance dialog with an active encounter dropdown selector listing all eligible inpatients with balances. Added an in-situ encounter switcher inside the general promissory note form, and updated `openPromissoryModal()` to auto-select an encounter with positive patient due when called without an ID.
- [BUGFIX] **Mobile/Tablet Viewport Adaptation for Active Discharge Radar (`src/components/dashboard/ActiveDischargeRadar.tsx`)**: Added responsive segmented pane switching (`QUEUE` | `DETAIL`) for viewports `< lg` (< 1024px) with a "← Back to Patient Queue" navigation button.
- [BUGFIX] **Dynamic Attention Badges Decrement on Supervisory Waiver (`src/components/layout/SidebarNav.tsx`, `src/components/kanban/DischargeMissionControl.tsx`)**: Updated dispute filtering across SidebarNav and Kanban filter counters to exclude waived items and resolved/waived disputes, decrementing attention badges immediately upon waiver.
- [BUGFIX] **Dynamic All-Payer HMO Coverage Filter (`src/views/CoverageApprovalsView.tsx`)**: Dynamically derived `availablePayers` from the encounter dataset, enabling filtering and badge counts across all 8 Philippine HMO carriers (Maxicare, Intellicare, Medicard, Pacific Cross, PhilCare, Etiqa Philippines, Caritas Health Shield, Insular Health Care).
- [BUGFIX] **Natural-Language "Why Do I Owe This?" Supervisory Waiver Recognition (`src/components/ledger/WhyDoIOweThisDrawer.tsx`)**: Handled waived items in line-item adjudication drawer: overrides `netPatientDue = 0`, injects "Less: Supervisory Goodwill Waiver" deduction row, renders green waiver confirmation banner, and replaces action buttons with disabled `✓ Waived by Supervisor (₱0.00 Due)`.

## [1.19.0] — 2026-09-26

### Disputes Table Viewport Space Maximization via Row Padding Calibration

#### Changed
- [FEATURE] **Disputes Table Row Padding Calibration (`DisputesExceptionsView.tsx`)**: Addressed empty void highlighted in Screenshot `11.08.26.png`. Increased row cell vertical padding from `py-2.5` (10px) to `py-3.5` (14px) and table header cells from `py-2.5` to `py-3` (12px) across both Tab 1 (Active Chargemaster Disputes) and Tab 2 (Statutory Promissory Undertakings RA 9439). Adds +88px across 11 visible rows, expanding the table downward to fill the ~80-90px empty void above the screen bottom without triggering viewport overflow or page scrollbars.

## [1.18.0] — 2026-09-26

### Disputes & Exceptions Table Sizing & Padding Tuning

#### Changed
- [FEATURE] **Disputes & Exceptions Table Row Count & Padding Tuning (`DisputesExceptionsView.tsx`)**: Reduced pagination page size from 12 to 11 visible rows (`pageSize = 11`) and trimmed row cell vertical padding from `py-4` (16px) to `py-2.5` (10px) and header cells from `py-3.5` to `py-2.5` exclusively within the disputes table. Eliminates vertical overflow against 100vh bounds while preserving full dataset integrity, layout, and search filtering.

## [1.17.0] — 2026-09-26

### Viewport Space Maximization: Command Center Pipelines & Disputes Table Lengthening

#### Changed
- [FEATURE] **Command Center Screen 2 Pipelines Viewport Space Maximization (`DualOperationalPipelines.tsx`)**: Resolved the ~250px dead space beneath Screen 2 pipelines (Screenshot `10.53.07.png`).
  - **Payer Coverage & Authorizations**: Expanded pagination size from 8 to 11 visible rows (`payerPageSize = 11`), increased row height to `h-[60px] px-4 py-2.5 rounded-xl`, scaled patient name to `text-base font-bold`, secondary coverage to `text-xs sm:text-sm`, amount to `text-base font-mono font-bold`, search input to `py-2 text-xs sm:text-sm pl-9 pr-3.5 w-56`, and "Approve" button to `px-4 py-2 text-xs font-bold`.
  - **Unresolved Billing Exceptions**: Expanded pagination size from 6 to 8 visible rows (`exceptionsPageSize = 8`), increased row height to `h-[60px] px-4 py-2.5 rounded-xl`, scaled contested charge description to `text-base font-bold`, amount to `text-base font-mono font-bold text-rose-700`, action buttons to `py-1.5 px-3/px-3.5 text-xs font-semibold/bold`, and exposure card padding to `p-4 space-y-2` with `text-base font-bold text-rose-700` exposure total.
  - Both cards expand to ~790px total height, seamlessly meeting the trailing `VelocityRecoveryPulse` without empty dead space.
- [FEATURE] **Disputes & Exceptions Table Lengthening via Additional Rows (`DisputesExceptionsView.tsx`)**: Resolved the ~300px empty space beneath the table (Screenshot `10.55.03.png`). Maintained existing font sizes and element dimensions in accordance with user requirements, and increased pagination page size from 8 to 12 rows (`pageSize = 12`). Page 1 displays 12 records, utilizing the empty vertical space cleanly.

## [1.16.0] — 2026-09-26

### Global Search Removal & Architecture Shift: Scroll-Through Lists to Searchable Paginated Tables

#### Changed
- [FEATURE] **Decommissioned Top Global Search Bar (`GlobalCommandBar.tsx`, `App.tsx`, `MedCoreContext.tsx`)**: Removed the top global command bar search input and ⌘K trigger modal. Shifted search architecture entirely to in-situ, contextual search controls within specific operational views.
- [FEATURE] **Encounters & Ledgers Header Patient Switcher Refinement (`TripartiteWorkbench.tsx`)**: Cleaned patient identity badges on the left by removing `< 4 of 250 >` button group. Moved the direct patient select dropdown to the right action area and enlarged the font and element sizing of the dropdown, search bar, and action buttons.
- [FEATURE] **Disputes & Exceptions Search & Paginated Tables (`DisputesExceptionsView.tsx`)**: Added contextual search input filtering contested charges and promissory notes. Converted continuous scrolling to 8-row fixed pagination with Previous / Next navigation controls in the docked footer.
- [FEATURE] **Command Center Payer Coverage Search & Paginated Navigation (`DualOperationalPipelines.tsx`)**: Removed 760px list scrolling and converted to fixed 8-row pagination with dedicated search input and Previous / Next navigation controls in the footer.
- [FEATURE] **Command Center Unresolved Exceptions Search & Paginated Navigation (`DualOperationalPipelines.tsx`)**: Removed 632px list scrolling and converted to fixed 6-row pagination with dedicated search input, Previous / Next navigation controls, and statutory exposure summary in the footer.
- [FEATURE] **Claims & eSOA XML Paginated Pre-Flight Audit Table (`ClaimsEsoaView.tsx`)**: Converted continuous table scrolling to fixed 8-row pagination with full-dataset search filtering and docked Previous / Next footer controls.

## [1.15.0] — 2026-09-26

### Dashboard Polish, Search Bar Alignment, Viewport Sizing & Sticky Header Hardening

#### Fixed
- [BUGFIX] **Encounters & Ledgers In-Situ Patient Navigation & Search Bar (`TripartiteWorkbench.tsx`)**: Resolved navigation friction where switching patients required leaving the ledger view (Screenshot `09.57.10.png`). Added `<` and `>` patient cycling buttons (`ChevronLeft` / `ChevronRight`) with dynamic index counter (`${currentIndex + 1} of ${encounters.length}`) and quick select dropdown directly adjacent to the patient identity badges. Integrated an in-situ search bar on the right side of the header with real-time dropdown filtering by patient name, encounter ID, and room/bed.
- [BUGFIX] **Discharge Workstation Viewport Height Preservation (`ActiveDischargeRadar.tsx`)**: Resolved viewport clipping where the bottom border and shadow of the workstation were cut off (Screenshot `10.00.18.png`). Compacted vertical padding across Demographics, Milestones, Blocker/Net Due/Quick Actions, and Sign-offs/Audit, saving ~70px vertically, and removed the trailing `mb-2` margin.
- [BUGFIX] **Command Center Dual Operational Watch Sizing & Space Utilization (`DualOperationalPipelines.tsx`)**: Eliminated dead empty space at the bottom of the Screen 2 pipeline cards (Screenshot `10.01.50.png`). Increased Left Pipeline row height to 56px (`h-[56px] px-4 py-2`), container height to 760px, upgraded typography to `text-sm font-bold`, and enlarged action buttons. Sized Right Pipeline to 56px rows (632px for 10 rows) and expanded the statutory compliance footer to `min-h-[120px] mt-2.5 p-3.5` to balance the cards at 760px with zero empty space.
- [BUGFIX] **Search Input Left-Padding & Icon Collision Fix (`ActiveDischargeRadar.tsx` & `CoverageApprovalsView.tsx`)**: Resolved placeholder text colliding into the search icon (Screenshots `10.03.01.png`, `10.03.46.png`, `10.04.42.png`). Replaced invalid Tailwind utility class `pl-8.5` (which was dropped by Tailwind, computing as `0px` left padding) with standard `pl-8` (32px left padding) and centered the magnifying glass icon with `left-2.5 top-1/2 -translate-y-1/2 pointer-events-none`.
- [BUGFIX] **Sticky Table Header Seam Gap & Row Bleed Prevention (`ClaimsEsoaView.tsx`, `CoverageApprovalsView.tsx`, `DisputesExceptionsView.tsx`)**: Resolved sticky table header gap where scrolled rows peeked through behind/above the header cells (Screenshot `10.06.50.png`). Replaced `border-collapse` with `border-separate border-spacing-0` and applied `sticky top-0 bg-slate-50 z-20 border-b border-slate-200` directly to each `<th>` element across all tables.

## [1.14.0] — 2026-09-26

### Active Multi-Payer Inpatient Roster Sizing & Patient Navigation Controls

#### Fixed
- [BUGFIX] **Active Multi-Payer Inpatient Roster Y-Axis Overflow Elimination (`CoverageApprovalsView.tsx`)**: Reduced visible table rows per page from 13 to 12 (`pageSize = 12`). Eliminates vertical y-axis overflow, allowing the entire table, gateway status row, filter bar, and pinned pagination controls to fit cleanly within the viewport without vertical scrolling.
- [BUGFIX] **Patient-Specific Next and Previous Navigation Controls (`CoverageApprovalsView.tsx`)**: Enhanced pagination controls with `tableContainerRef` scroll-reset, `type="button"`, and explicit patient navigation labels (`aria-label` and `title` for navigating previous/next patients), ensuring Next/Prev buttons strictly navigate between patient records without page displacement.

## [1.13.0] — 2026-09-26

### Scroll Chaining Elimination & Non-Scrollable Discharge Clearance Additional Data Section

#### Fixed
- [BUGFIX] **Universal Card Scroll Containment & Zero Scroll Bubbling (`src/index.css`)**: Prevented card scroll propagation to the main dashboard page using CSS `overscroll-behavior: contain`. Applied globally in `src/index.css` to all overflow containers and explicitly via `.overscroll-contain` on every scrollable card, table, drawer, and modal across all 8 dashboard views (`ActiveDischargeRadar.tsx`, `DualOperationalPipelines.tsx`, `TripartiteWorkbench.tsx`, `EncountersLedgerView.tsx`, `DisputesExceptionsView.tsx`, `ClaimsEsoaView.tsx`, `CoverageApprovalsView.tsx`, `RcmAnalyticsView.tsx`, `WhyDoIOweThisDrawer.tsx`, `ContextualActionDrawer.tsx`, `PatientClarifyDrawer.tsx`, `DischargeDossierDrawer.tsx`, `SearchModal.tsx`, `SidebarNav.tsx`). Reaching top or bottom of a card's scroll area strictly halts scrolling without jerking or moving the underlying dashboard page.
- [BUGFIX] **Discharge Clearance Workstation Right Section Non-Scrollable Layout (`ActiveDischargeRadar.tsx`)**: Completely removed `overflow-y-auto` and bottom padding (`pb-6 sm:pb-8`) from the right Additional Data section of the Discharge Clearance Workstation. Refactored into a clean, zero-scrollbar flex container (`min-h-0 flex flex-col justify-between overflow-hidden`) where all 4 operational cards (Sign-Offs, Chargemaster Audit, Total Net Patient Due, Quick Action Console) fit cleanly within the viewport. Eliminates double scrollbars while keeping left patient queue independently scrollable.

## [1.12.0] — 2026-09-26

### Command Center Dual Operational Watch Container-Level Sizing & Sticky Headers

#### Fixed
- [BUGFIX] **Payer Coverage Fixed 12-Row Sizing & Dataset Integrity (`DualOperationalPipelines.tsx`)**: Sized the Payer Coverage table/container to display exactly 12 visible rows by default (`height: 664px`, `maxHeight: 664px`). Preserved the complete 250-encounter dataset (removed `.slice(0, 35)` limitation), making encounters 13 through 250 smoothly accessible via internal vertical scrolling (`overflow-y-auto`). Added a sticky table header with left-aligned columns (`Patient & Bed`, `Payer & Benefit Coverage`, `Adjudication`, `Action`).
- [BUGFIX] **Unresolved Billing Exceptions 10-Row Sizing & Space-Occupying Footer (`DualOperationalPipelines.tsx`)**: Sized the exceptions table/container to display exactly 10 visible rows by default (`height: 552px`, `maxHeight: 552px`) with internal vertical scrolling for remaining records. Added a dedicated operational footer (`flex-1 min-h-[104px] mt-2`) that productively occupies the remaining vertical space below the 10-row table, displaying total contested exposure (`formatPhp(totalContestedAmount)`), exception count, statutory RA 9439/RA 9994 compliance notice, and a direct link to the Disputes Workbench.
- [BUGFIX] **Container-Level Layout Integrity & Zero Page-Level Overflow (`CommandCenterView.tsx`)**: Removed artificial `overflow-hidden` clipping from Screen 2 in `CommandCenterView.tsx`, resolving the layout at the container and table level. Both pipeline cards and trailing `VelocityRecoveryPulse` remain naturally within the Command Center viewport without creating page-level overflow.

## [1.11.0] — 2026-09-26

### Universal Table Left-Alignment, Dual Pipeline Viewport Bounds & Elimination of Wasted Space

#### Fixed
- [BUGFIX] **Universal Table Left-Alignment Across Codebase**: Enforced strict, consistent left-alignment across all 8 tables in the application. Every table header (`<th>`) and data cell (`<td>`) is now explicitly `text-left`. Converted currency amounts, quantities, codes, status badges, and action buttons (`justify-start`) across:
  - **Encounters & Ledgers (`EncountersLedgerView.tsx` & `TripartiteWorkbench.tsx`)**: Pre-admission intake and 8-column itemized chargemaster running bill.
  - **Disputes & Exceptions (`DisputesExceptionsView.tsx`)**: Active Chargemaster Disputes and RA 9439 Promissory Notes Register.
  - **Claims & eSOA XML (`ClaimsEsoaView.tsx`)**: Inpatient Pre-Flight Audit Worklist.
  - **RCM Analytics (`RcmAnalyticsView.tsx`)**: Commercial HMO Carrier Performance Matrix.
  - **Coverage & Approvals (`CoverageApprovalsView.tsx`)**: Commercial HMO & PhilHealth Adjudication Worklist.
  - **Discharge Clearance (`ActiveDischargeRadar.tsx`)**: Discharge Clearance Table View mode.
- [BUGFIX] **Command Center Screen 2 Viewport Bounds & Dual Pipeline Scrolling (`CommandCenterView.tsx` & `DualOperationalPipelines.tsx`)**: Addressed issue from `Screenshot 2026-09-26 at 03.46.03.png`. Converted Screen 2 to `h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] overflow-hidden flex flex-col justify-between pb-3 sm:pb-4`. Removed hardcoded `min-h-[520px]` and `min-h-[480px]` from pipeline cards, enabling internal list scrolling with `overflow-y-auto` and ensuring the UI does not touch the screen bottom.
- [BUGFIX] **Discharge Clearance Right Workspace Wasted Space (`ActiveDischargeRadar.tsx`)**: Addressed issue from `Screenshot 2026-09-26 at 03.47.10.png`. Removed `flex flex-col justify-between` from the right workspace container, removed `flex-1 min-h-0` stretching from Section 3, and removed `flex-1 flex flex-col justify-between` and `h-full flex flex-col justify-between` from the Net Patient Due card and Quick Action Console. Both cards now maintain compact, cohesive spacing (`space-y-2.5`) with zero empty voids.
- [BUGFIX] **Coverage Approvals Table Whitespace (`CoverageApprovalsView.tsx`)**: Increased `pageSize` from 12 to 13 rows, cleanly utilizing remaining vertical table space above the docked pagination controls.

## [1.10.0] — 2026-09-26

### Patient Queue Scrollability, Viewport Height Bounds, Bottom Margins & Table Row Expansion

#### Fixed
- [BUGFIX] **Command Center Patient Queue Scrollability (`CommandCenterView.tsx`)**: Replaced unconstrained `min-h-[calc(100vh-56px)]` on Screen 1 with strict `h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] overflow-hidden flex flex-col`. Bounded container height re-activates `flex-1 min-h-0 overflow-y-auto` in `ActiveDischargeRadar.tsx`, transforming the previously 10,000px unscrollable 200-patient list into a sleek, independently scrollable queue.
- [BUGFIX] **Command Center & Discharge Workstation Bottom Margin (`CommandCenterView.tsx`, `DischargeClearanceView.tsx`, `ActiveDischargeRadar.tsx`)**: Added `pb-3 sm:pb-4` on page containers, `pb-6 sm:pb-8` to the right workspace pane, and `mb-2` beneath the bottom chargemaster audit & sign-offs grid. The UI on the right side no longer touches the bottom edge of the screen flush, establishing a clean 24–32px visual buffer.
- [BUGFIX] **Discharge Clearance 100vh Viewport Constraint & Full Right Column Utilization (`DischargeClearanceView.tsx` & `ActiveDischargeRadar.tsx`)**: Set `h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] overflow-hidden pb-3 sm:pb-4` on `DischargeClearanceView`. Configured Section 3 (`grid-cols-1 lg:grid-cols-12`) with `flex-1 min-h-0 items-stretch`, allowing the Blocker Box, Net Patient Due card, and Quick Action Console to flexibly utilize the entire height of the right column without dead whitespace. Added `pb-6` to the patient queue list.
- [BUGFIX] **Coverage & Approvals Table Whitespace (`CoverageApprovalsView.tsx`)**: Increased `pageSize` from 11 to 12 rows, comfortably filling the remaining whitespace above the docked pagination footer while maintaining complete 250-record dataset integrity.

## [1.9.0] — 2026-09-26

### Discharge Clearance Zero-Scroll Layout & Coverage Approvals Table Volume Optimization

#### Fixed
- [BUGFIX] **Discharge Clearance Right Workspace Vertical Overflow (`ActiveDischargeRadar.tsx`)**: Compacted right workspace elements by 40–50% so that the entire operational surface (including Itemized Chargemaster Audit and Discharge Clearance Sign-Offs) fits directly onto standard 670–750px viewports with **zero scrolling required**.
- [BUGFIX] **Blocker Action Bar & Sign-Offs Header Spacing (`ActiveDischargeRadar.tsx`)**: Added intentional internal padding (`px-4 py-3`), clear alert icon container (`w-8 h-8 rounded-lg`), and crisp action buttons, resolving the cramped layout highlighted in `Screenshot 2026-09-26 at 03.28.01.png`.
- [BUGFIX] **Patient Queue Card Proportions (`ActiveDischargeRadar.tsx`)**: Scaled down left queue cards from `p-4` to `px-3.5 py-2.5` with tighter metadata spacing, enabling 10–11 patients to fit comfortably in the left column simultaneously without excessive scrolling.
- [BUGFIX] **Coverage Approvals Dead Space (`CoverageApprovalsView.tsx`)**: Resolved the large ~240px empty space beneath table row 6 highlighted in `Screenshot 2026-09-26 at 03.29.43.png` by expanding `pageSize` from 6 to 11 (+5 rows), cleanly filling the card height down to the pinned pagination footer.

## [1.8.0] — 2026-09-26

### Command Center Viewport Rhythm, Expanded Patient Intelligence & Docked Coverage Pagination

#### Fixed
- [BUGFIX] **Command Center Viewport Overflow & Element Cutoff (`CommandCenterView.tsx`)**: Replaced uncoordinated vertical heights that caused the bottom cards of the Discharge Clearance Workstation to be cut off and the top of Dual Operational Pipelines to peek awkwardly into view. Structured Command Center into two discrete full-height screens (`min-h-[calc(100vh-56px)] shrink-0`): Screen 1 encapsulates Priority Action Strip and Active Discharge Radar cleanly, while Screen 2 dedicates the full viewport height to Dual Operational Pipelines and trailing KPIs on the next scroll.
- [BUGFIX] **Dual Operational Pipelines 340px Sizing Limit (`DualOperationalPipelines.tsx`)**: Replaced restrictive `h-[340px] max-h-[340px]` containers with full-height responsive cards (`h-full min-h-[480px]`) featuring internal scrollable lists (`flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1.5`), expanding visible authorization items from 15 to 35+ and ensuring both pipelines command the entire screen on scroll.
- [BUGFIX] **Discharge Clearance Right Pane Empty Space (`ActiveDischargeRadar.tsx`)**: Completely eliminated the large empty white space at the bottom of the right workspace pane highlighted in `current_problems/Pasted 2026-09-26 at 3.10.40 AM.png`.
- [BUGFIX] **Coverage & Approvals 100vh Viewport Compliance (`CoverageApprovalsView.tsx`)**: Enforced strict `h-full min-h-0 overflow-hidden` wrapper ensuring table never exceeds 100vh. Pinned pagination bar permanently at the bottom of the card (`shrink-0 border-t border-slate-200 bg-white px-6 py-2.5`), ensuring the Next and Previous buttons remain immediately visible on screen without requiring the user to scroll down.

#### Added
- [FEATURE] **Enlarged Patient Demographic & Clinical Intelligence Banner (`ActiveDischargeRadar.tsx`)**:
  - Expanded patient avatar (`w-16 h-16 rounded-2xl` with bold initials and vibrant gradient).
  - Prominent title typography (`text-2xl font-black text-slate-900 tracking-tight`).
  - Demographic badges: Age & Gender, Senior Citizen (RA 9994), PWD (RA 10754), and PhilHealth PEC 3.0 Verified.
  - High-density 8-card metadata matrix: Encounter Reference, Room/Bed & Ward Class, Attending Specialist (PRC & Specialty), Admitting Diagnosis (ICD-10), Primary HMO (MBL Remaining), PhilHealth ACR Benefit, MGH Declaration Timestamp, and Discharge Stage.
  - Action utility buttons for Patient Clarify, Itemized Ledger, and Print eSOA.
- [FEATURE] **Itemized Statutory Deduction Reconciliation Strip (`ActiveDischargeRadar.tsx`)**: Added 4-step reconciliation breakdown inside the Total Net Patient Due card: $\text{Gross Total} - \text{PhilHealth ACR} - \text{HMO Approved} - \text{Senior/PWD/VAT} = \text{Net Patient Due}$.
- [FEATURE] **Chargemaster Audit Snapshot & Discharge Clearance Sign-Offs Grid (`ActiveDischargeRadar.tsx`)**: Added two high-density operational cards utilizing the lower workspace area:
  - Itemized Chargemaster Audit with category breakdown (Room & Board, Pharmacy, Supplies, PF).
  - Discharge Clearance Sign-Offs checklist with live verification badges (Specialist PF, Pharmacy RTS, PhilHealth PEC, HMO LOA).
- [FEATURE] **Prominent High-Contrast Pagination Controls (`CoverageApprovalsView.tsx`)**: Redesigned pagination bar with bold, high-contrast "Next" button (`bg-blue-600 hover:bg-blue-700 text-white font-bold`) and "Previous" button with `ChevronLeft` and `ChevronRight` icons, maintaining `pageSize = 6` across all 250 records.

## [1.7.0] — 2026-09-26

### Universal Table Architecture, Command Center Layout & Supervisory Waive Resolution

#### Fixed
- [BUGFIX] **Disputes & Exceptions Courtesy "Waive" Functionality (`MedCoreContext.tsx`, `DisputesExceptionsView.tsx`, `DualOperationalPipelines.tsx`)**: Resolved bug where waiving a contested chargemaster item only changed status string without updating `isDisputed: false`, leaving it flagged in active queues. `supervisoryWaiveItem` now clears `isDisputed`, sets `patientOop: 0`, removes dispute reason, updates `enc.disputes` status to `'SUPERVISOR_WAIVED'`, adjusts `unreturnedMedsCount`, and invokes `recalculateWaterfall` to deduct the waived item from gross hospital charges and net patient due. Waived items are now immediately excluded from active dispute rosters.
- [BUGFIX] **Command Center Split-Pane Bottom Edge Misalignment (`ActiveDischargeRadar.tsx`)**: Replaced uncoordinated column heights with `grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch`. Blocker Action Box and Net Patient Due Box (`lg:col-span-8 flex flex-col gap-4`) now match the height of the Quick Action Console (`lg:col-span-4 h-full flex flex-col justify-between`) pixel-for-pixel, eliminating uneven card bottoms.
- [BUGFIX] **Dual Operational Pipelines Vertical Bloat (`DualOperationalPipelines.tsx`)**: Capped height of Payer Coverage and Unresolved Exceptions cards to `h-[340px] max-h-[340px]` with internal scrollable lists (`flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1.5`), maintaining a compact, balanced viewport footprint.
- [BUGFIX] **Floating Pagination Trailing Bug (`CoverageApprovalsView.tsx` & `ClaimsEsoaView.tsx`)**: Relocated pagination control bars from inside scrollable table containers to docked bottom card footers (`border-t border-slate-200 bg-white shrink-0`), ensuring navigation controls remain consistently visible.

#### Added
- [FEATURE] **Universal Table Architecture Across Application**: Enforced consistent enterprise table architecture across all 7 views:
  - **Static / Sticky Headers**: `sticky top-0 bg-slate-50 z-10 border-b border-slate-200`.
  - **Scrollable Bodies**: Bounded height viewports (`max-h-[...] min-h-[300px] overflow-y-auto overflow-x-auto`).
  - **Enterprise Typography**: High-contrast, bold uppercase headers (`text-xs font-bold uppercase tracking-wider text-slate-600`).
  - **Strict Left-Alignment**: Text, clinical, and status columns strictly left-aligned with headers (`text-left`); currency amounts right-aligned with matching right-aligned headers (`text-right`).
- [FEATURE] **Interactive Discharge Clearance Table View Mode (`ActiveDischargeRadar.tsx`)**: Added full-width interactive Table mode alongside Master/Detail Workspace and Cards, allowing operators to triage all 250 patients with static sticky headers, left-aligned columns, SLA badges, and quick-action buttons.
- [FEATURE] **Intentional Workstation Viewport Height (`CommandCenterView.tsx`)**: Allocated `h-[72vh] min-h-[580px] max-h-[840px]` responsive viewport height to the Discharge Clearance Workstation, establishing clear operational visual hierarchy.

## [1.6.0] — 2026-09-26

### Statutory Deduction Reconciliation, Dispute Promissory Desk, & Enterprise UI Hardening

#### Fixed
- [BUGFIX] **Encounters & Ledgers Deduction Calculation Engine (`WhyDoIOweThisDrawer.tsx` & `TripartiteWorkbench.tsx`)**: Fixed deduction calculation to ensure all statutory deductions (12% VAT exemption and 20% Senior/PWD discount under RA 9994/RA 10754) are deducted from the patient's out-of-pocket responsibility. For chargemaster line item `item-101` (Gross: ₱12,000.00, VAT: ₱1,285.71, SC/PWD: ₱2,142.86, HMO: ₱6,000.00), resolved previously displayed ₱6,000.00 down to the exact statutory balance of **₱2,571.43** ($\text{₱12,000} - \text{₱9,428.57 deductions}$).
- [BUGFIX] **Disputes & Exceptions / Promissory Note Installment Inflation (`DigitalPromissoryModal.tsx`)**: Replaced global encounter balance fallback with item-specific liability financing. When clicked from a disputed chargemaster item (e.g. Suction Catheter `item-104` with ₱1,928.57 patient balance), the promissory note accurately executes at 0% statutory interest:
  - 3 Months: **₱642.86 / month** (Schedule: [642.86, 642.86, 642.85])
  - 6 Months: **₱321.43 / month** (Schedule: [321.43, 321.43, 321.43, 321.43, 321.43, 321.42])
  - 12 Months: **₱160.71 / month** (Schedule: [160.71 × 11, 160.76])
- [BUGFIX] **Demographic Consistency in Handcrafted Inpatient Case (`mockData.ts`)**: Corrected `enc-4552` (Rolando Gutierrez, ₱24,600 non-senior promissory note) where `patient.isSeniorCitizen` was set to `true` while the waterfall was correctly configured for non-senior terms. Realigned demographic fields to match the 0% statutory calculation.
- [BUGFIX] **Static Sidebar Layout & Independent Viewport Scrolling (`App.tsx` & `SidebarNav.tsx`)**: Eliminated body scrolling issue where the sidebar scrolled out of view on long content pages. Set root container to `h-screen overflow-hidden` with a fixed `h-full shrink-0` sidebar and independently scrollable content containers.
- [BUGFIX] **Settings & Rules Width & Navigation Iconography (`SidebarNav.tsx` & `ConfigurationView.tsx`)**: Replaced `Sliders` with standard Lucide `Settings` (gear icon) in the navigation bar. Removed restricting `max-w-4xl` from `ConfigurationView` and expanded into a full-width, responsive multi-column layout covering HIS CDC Connectors, PhilHealth HITP credentials, HMO payer networks, and statutory SLA thresholds.

#### Added
- [FEATURE] **PhilHealth Circular 2023-0026 XML Inspector Modal (`ClaimsEsoaView.tsx`)**: Linked the "Inspect XML →" table action to an interactive modal viewer displaying formatted, syntactically styled eSOA XML payloads with pre-flight checklist verification (CF1, CF2, CF4), one-click clipboard copying, and `.xml` file downloads.
- [FEATURE] **Comprehensive Categorical Financial Audit Runner (`scripts/auditFinancials.ts`)**: Expanded audit runner to test all 250 patients across 12 discrete accounting categories, outputting clean zero-error tallies across Gross, VAT, SC/PWD, PhilHealth, HMO, Total Deductions, Patient Responsibility, Outstanding Balance, Promissory Notes, and 3/6/12-Month Installments.

## [1.5.0] — 2026-09-26

### 100% Financial Calculation Audit & Multi-Payer Waterfall Reconciliation

#### Fixed
- [BUGFIX] **Resolved Double-Counting in Statutory Waterfall Engine (`src/utils/waterfall.ts`)**: Eliminated systemic flaw where non-covered patient items (`roomUpgradeExcess`, `excludedConsumables`, `doctorExcessPf`) were added twice to `netPatientDue` after already being present in `grossTotal`. Refactored `recalculateWaterfall` to enforce the fundamental healthcare revenue cycle identity:
  $$\text{Gross Total} \equiv \text{VAT Exemption} + \text{Senior/PWD Discount} + \text{PhilHealth Benefit} + \text{HMO Approved} + \text{Net Patient Due}$$
  Achieved 100% centavo-exact reconciliation across all 250 records in the dataset (0 errors, 0 drift).
- [BUGFIX] **Eliminated Inflated Installment Calculations**: Replaced ad-hoc component-level divisions with single source of truth `calculateInstallmentPlan` in `src/utils/financing.ts`. Reconciled all 3, 6, and 12-month repayment schedules:
  $$\text{Total Repayment} \equiv \text{Financed Amount} + \text{Financing Fee (0% under RA 9439)}$$
  $$\sum \text{Schedule Payments} \equiv \text{Total Repayment}$$
  Monthly installments now mathematically reconcile with the patient's actual out-of-pocket balance (e.g. ₱6,000 balance cleanly produces ₱2,000/mo for 3 mos, ₱1,000/mo for 6 mos, ₱500/mo for 12 mos).
- [BUGFIX] **Encounter Context Desynchronization in Modals**: Fixed issue where `DigitalPromissoryModal` displayed stale global encounter balances due to unlinked modal openers. All triggers across `ActiveDischargeRadar`, `DualOperationalPipelines`, `DischargeCard`, `ContextualActionDrawer`, `DischargeDossierDrawer`, `PatientClarifyView`, and `DisputesExceptionsView` now pass the specific encounter ID and synchronize state.
- [BUGFIX] **Promissory Note Principal Realignment**: Realigned handcrafted cases `enc-4552` (₱24,600.00) and `enc-6624` (₱11,200.00), and updated `patientDatasetGenerator.ts` to strictly derive promissory note principals from actual `waterfall.netPatientDue`.
- [BUGFIX] **Trapped Capital Double-Counting**: Removed duplicate `enc.doctorExcessPf` addition in `PriorityActionStrip.tsx` metric calculations.

#### Added
- [FEATURE] **Single Source of Truth Financial Engine (`src/utils/financing.ts`)**: Standardized 10-step financial pipeline: `Hospital Bill -> PhilHealth Coverage -> HMO Coverage -> Other Adjustments -> Patient Responsibility -> Outstanding Balance -> Financed Amount -> Financing Fee -> Total Repayment -> Monthly Installment`.
- [FEATURE] **CLI Audit Verification Script (`scripts/auditFinancials.ts`)**: Automated test runner evaluating all 250 patients individually with detailed pass/fail diagnostics.

## [1.4.0] — 2026-09-25

### Full Information Architecture (IA) Overhaul & 5-Level Operational Cockpit

#### Changed
- [DECISION] **Purged 5-Pillar Vendor Mnemonic as Visible Navigation**: Decommissioned `GUIDE`, `VERIFY`, `REWARD`, `REPORT`, and `IMPROVE` from sidebar navigation and top-level cards. Retained calculation and validation algorithms strictly under the hood.
- [DECISION] **Eliminated "Reward" as Category**: Completely removed confusing consumer-style terminology for patient collections and promissory notes.
- [FEATURE] **8 Task-Oriented Operational Routes**:
  1. `COMMAND_CENTER` (`/app/command`): 5-Level Operational Cockpit answering "What needs attention right now?"
  2. `DISCHARGE_CLEARANCE` (`/app/discharge`): 45-minute statutory MGH queue manager with 6-stage Kanban board.
  3. `ENCOUNTERS_LEDGER` (`/app/encounters`): Master inpatient running bill + Pre-Admission Intake & Cost Estimator.
  4. `COVERAGE_APPROVALS` (`/app/coverage`): Real-time PhilHealth PEC/MDR and commercial HMO eLOA monitoring.
  5. `DISPUTES_EXCEPTIONS` (`/app/exceptions`): Contested chargemaster items and RA 9439 Promissory Note Register.
  6. `CLAIMS_ESOA` (`/app/claims`): PhilHealth eClaims 3.0 pre-flight scrubber, CF1–CF4 cross-auditor, and live eSOA XML generator.
  7. `RCM_ANALYTICS` (`/app/analytics`): Executive CFO suite with Denial Pareto and 250-bed economic impact ROI model.
  8. `CONFIGURATION` (`/app/settings`): HIS read-replica CDC adapters, PhilHealth HITP credentials, and SLA alarm timers.
- [FEATURE] **Decoupled Patient Clarify PWA**: Mobile web preview drawer accessible on demand via SMS/WhatsApp magic link generation, decoupled from hospital staff navigation.
- [FEATURE] **5-Level Operational Hierarchy in Command Center**:
  - *Level 1*: Global Context Bar (St. Jude Medical Manila, PST clock, 7-role switcher, ⌘K search).
  - *Level 2*: Priority Action Strip (4 Bento cards: SLA Breaches, HMO LOA Delays, High-Risk Claims, Trapped Capital).
  - *Level 3*: Active Discharge Radar (High-density 45m SLA table with countdowns, bottleneck chips, and instant actions).
  - *Level 4*: Dual Operational Pipelines (Payer Coverage Watch on left; Unresolved Disputes & Delayed Lines on right).
  - *Level 5*: Velocity & Recovery Pulse (Trailing 24h metrics: 34.2m Avg TAT, 28.5 Bed-Hours Reclaimed, 96.4% Clean Claims, ₱384k Digital POS, 88.2% RA 9439 Recovery).
- [FEATURE] **Slide-Over Patient Dossier Drawer (600px width)**: Triggered directly from table row click without losing queue position, displaying Three-Driver Out-of-Pocket Breakdown (Room Differential, Consumables, Excess PF) and statutory waterfall deductions.

## [1.3.0] — 2026-09-25

### Working Frontend Prototype Implementation (MedCore Command Center)

#### Added
- [FEATURE] **4-Tier Command Center**: Built interactive production frontend prototype with Global Command Bar (Tier 1), 5-Pillar Telemetry (Tier 2), Primary Operational Workspace (Tier 3), and Contextual Action Drawer & Modals (Tier 4).
- [FEATURE] **Discharge Clearance Mission Control**: Built 6-stage Kanban board (`MGH_DECLARED`, `DOCTOR_PF_PENDING`, `PHARMACY_RTS_AUDIT`, `HMO_FINAL_LOA`, `PENDING_SETTLEMENT`, `CLEARED_GATE_PASS`) tracking operational SLA timers, warnings (>25m), and breaches (>40m).
- [FEATURE] **Tripartite Reconciled Ledger Workbench**: Built continuous financial adjudication workbench displaying interactive deduction waterfall (`Gross -> 12% VAT Exemption -> 20% SC/PWD Discount -> PhilHealth ACR -> HMO Approved LOA -> Net Patient Due`) with exact centavo precision and zero floating-point drift.
- [FEATURE] **"Why Do I Owe This?" Explainer Drawer**: Natural-language translation of cryptic hospital chargemaster line items into plain English/Tagalog with statutory and policy citations (RA 9439, RA 9994/10754, PhilHealth Circular 2024-0037).
- [FEATURE] **Contextual Action Modals**:
  - `DoctorQuickSignModal`: Attending physician 15-minute quick-sign portal with automated HMO accredited schedule ceiling fallback to protect patients against unbudgeted excess PF.
  - `DigitalPromissoryModal`: Republic Act No. 9439 (Anti-Hospital Detention Law) statutory promissory note guarantee with PhilSys National ID capture and 3/6/12-month interest-free amortizations.
  - `DigitalGatePassModal`: Cryptographic HMAC-SHA256 QR discharge clearance slip with real-time lobby exit security verification.
- [FEATURE] **Full Navigation Engine**: 10 operational routes (`COMMAND_CENTER`, `GUIDE`, `VERIFY`, `RECONCILE`, `REWARD`, `REPORT`, `IMPROVE`, `DISPUTE_DESK`, `PATIENT_CLARIFY`, `SETTINGS`), plus universal Cmd+K fast patient search palette.
- [VERIFICATION] Confirmed `npx tsc --noEmit` clean exit (0 errors) and `npx vite build` successful production bundle compilation.

---

## [1.2.0] — 2026-09-25

### Dashboard Redesign and Documentation Alignment

#### Added
- [DECISION] **The 5-Pillar Value Engine**: Formally synthesized and standardized the product lifecycle around the canonical pillars:
  $$\mathbf{GUIDE} \longrightarrow \mathbf{VERIFY} \longrightarrow \mathbf{REWARD} \longrightarrow \mathbf{REPORT} \longrightarrow \mathbf{IMPROVE}$$
  with **`RECONCILE`** serving as the continuous intra-care tripartite ledger workbench.
- [FACT] **PhilHealth Rate Increases (2024–2025)**: Recorded **Circular No. 2024-0001** (+30% across the board in Feb 2024) and **Circular No. 2024-0037** (+50% across ~9,000 medical and procedural case rates effective January 1, 2025) in `DOMAIN/philhealth.md` and `.brain/PROJECT_CONTEXT.md`.
- [FACT] **Single Period of Confinement (SPC) Abolition & Retroactive Claims**: Updated SPC from "suspended" to permanently **abolished under Circular No. 2024-0021** (effective October 1, 2024). Recorded **Circular No. 2025-0015** authorizing retroactive processing and refiling of denied SPC claims back to February 20, 2019. Refactored `ClaimReady` module to include an automated retroactive claim package compiler.
- [FACT] **HMO Industry Financial Rebound (2024)**: Recorded official Insurance Commission data confirming the HMO industry returned to profitability with **₱979.8 Million in net income** (reversing a ₱4.27 Billion loss in 2023) on revenues of **₱79.37 Billion**, with **₱61.05 Billion** paid in claims, while active licensed HMOs consolidated from 29 to 25.
- [DECISION] **Olive AI Competitor Post-Mortem & Architectural Guardrail**: Formally registered the October 2023 collapse of Olive AI ($4B valuation, $900M raised) in `RESEARCH/competitors.md`. Mandated strict anti-patterns: MedCore strictly prohibits brittle RPA screen-scraping and black-box generative AI for deterministic billing math, utilizing CDC database read-replicas and centavo-accurate audit trails.
- [DECISION] **Operational Dashboard Blueprint**: Adopted the 4-tier operational cockpit architecture, 6-stage Discharge Clearance Kanban with 45-minute SLA countdown, Tripartite Reconciled Ledger Workbench with "Why Do I Owe This?" explainers, Interactive Dispute Desk, RA 9439 Digital Promissory Note Authoring Modal, and ClaimReady eSOA XML/CF4 Pre-Flight Scrubber.

---

## [1.1.0] — 2026-09-25

### Formal Project Objectives (Input, Process, Output, Outcome Framework)

#### Added
- [DECISION] Formalized the canonical **General Objective** and **Specific Objectives** structured under the Input, Process, Output, Outcome (IPOO) framework.
- [DECISION] Explicitly mirrored the seven core billing pain points in the General Objective (unclear patient responsibility, billing disputes, delayed payments, administrative burden, siloed portals, legacy hospital systems, and multiple payment channels) into positive, dispute-free operational transformations in the Outcome.
- [DECISION] Integrated Cedar-inspired clinical and financial categorization principles into the database and deduction engine architecture while maintaining independent, generalizable domain terminology.
- [DECISION] Enforced fully expanded terminology (zero abbreviations or percent symbols) in both the Project Operational Brain (`.brain/PROJECT_CONTEXT.md`) and Product Intelligence Vault (`MedCore_Vault/PROJECT.md`).
- [DECISION] Enhanced the Output deliverables to actively maximize statutory benefits and insurance coverage by coordinating Philippine Health Insurance Corporation case rates with private health maintenance organization policies, capturing all eligible reimbursements, and preventing underclaiming.

---

## [1.0.0] — 2026-09-25

### Genesis: Project Intelligence Vault Creation

#### Added
- [DECISION] Initialized `MedCore_Vault/` as the canonical, persistent, single-source-of-truth knowledge vault covering strategic direction, domain research, and market and regulatory findings.
- [DECISION] Established the **Project Memory Model** architecture across 8 directory subsystems:
  - `PRODUCT/`: Vision, Problems, Users, Value Propositions, Product Model, and Workflows.
  - `DOMAIN/`: PhilHealth, HMOs, Hospital Billing, Patient Financial Responsibility, Insurance Reconciliation, and Billing Disputes.
  - `RESEARCH/`: Market, Competitors, Cedar Model Translation, Statistics, Regulations, and Sources.
  - `BUSINESS/`: Business Model, Revenue Model, Stakeholders, and Competitive Landscape.
  - `SYSTEM/`: Architecture, Entities, Sequence Workflows, Integrations, and Data Models.
  - `DECISIONS/`: Product Decisions, Technical Decisions, and Pilot Assumptions.
  - `REQUIREMENTS/`: Functional Specifications, Non-Functional Guardrails, and MVP Release Scope.
  - Root: `README.md`, `PROJECT.md`, `ONTOLOGY.md`, and this `CHANGELOG.md`.
- [FACT] Codified verified Philippine health expenditure metrics from PSA PNHA 2023–2024:
  - Total Current Health Expenditure: ₱1.44T (2023) / ₱1.56T (2024).
  - Out-of-Pocket (OOP) Burden: 44.4% (2023) / 42.7% (2024).
  - Voluntary Health Insurance (HMO/Private): 13.0% (₱161.35B in 2023; ₱61.05B benefits paid in 2024).
  - Social Health Insurance (PhilHealth): 10.2% of CHE.
- [FACT] Formally codified statutory deduction cascade order pursuant to RA 9994, RA 10754, RA 11223, and DOH/BIR guidelines:
  $$\text{Net Due} = \left(\left(\text{Gross Charges} - \text{12\% VAT Exemption} - \text{20\% SC/PWD Discount}\right) - \text{PhilHealth ACR/DRG}\right) - \text{HMO Approved LOA}$$
- [FACT] Documented PhilHealth technical circulars: Circular 2019-0002 (CF4 mandatory clinical abstract), Circular 2023-0026 & eClaims 3.0 (XML eSOA mandate; scanned PDF deprecation), and 60-day filing rule.
- [FACT] Recorded Anti-Hospital Detention Law (RA 9439), Anti-Hospital Deposit Law (RA 10932), Universal Health Care Act (RA 11223), Consumer Protection Act (RA 11765), and Data Privacy Act (RA 10173).

#### Resolved Contradictions
- [DECISION] **Core Operating Loop Nomenclature**: Reconciled historical notes (`Guide → Verify → Reward → Report → Improve`) with the strategic specification. Established **`GUIDE → VERIFY → RECONCILE → APPROVE → IMPROVE`** as the canonical 5-stage loop. Mapped "Reward/Report" into Stage 4 (settlement incentives) and Stage 5 (executive telemetry).
- [DECISION] **Discharge Turnaround Time SLA**: Reconciled empirical baseline (4 to 8+ hours in tertiary private hospitals) with target goals. Codified primary operational threshold as **< 45 minutes**, with optimal performance target **< 30 minutes**.
- [DECISION] **Single Period of Confinement (SPC)**: Reconciled the 90-day monitoring requirement with the finding of PhilHealth's October 1, 2024 policy suspension. Configured SPC as a dynamic policy toggle within `ClaimReady` to handle audit compliance and regulatory re-imposition without code changes.
- [ASSUMPTION] **Payment Processing Take-Rate**: Reconciled the 1.2%–1.8% convenience fee estimate with the researched 1.5%–2.5% take-rate band. Codified commercial baseline as a **1.2% to 2.5% variable band** depending on payment rail (QR Ph / e-wallets vs. credit/debit cards).

#### Operational Guidelines
- All future development work must reference `MedCore_Vault/` as immutable shared state.
- Statutory algorithms must not be altered and arbitrary PhilHealth/HMO deduction rules must not be invented.
- Operational brain state synchronized with `.brain/PROJECT_CONTEXT.md`.

---

### [2026-09-25] — Frontend Cockpit Prototype & Enterprise Visual System Redesign

#### Implementation Highlights
- **Architecture & Routing**: Decommissioned the abstract 5-pillar mnemonic (`GUIDE`, `VERIFY`, `REWARD`, `REPORT`, `IMPROVE`) from visible UI navigation. Built 8 task-oriented operational routes: `COMMAND_CENTER`, `DISCHARGE_CLEARANCE`, `ENCOUNTERS_LEDGER`, `COVERAGE_APPROVALS`, `DISPUTES_EXCEPTIONS`, `CLAIMS_ESOA`, `RCM_ANALYTICS`, and `CONFIGURATION`.
- **Decoupled Patient Clarify PWA**: Implemented a standalone patient mobile portal simulator with magic link and SMS generation, decoupled from the clinical staff navigation.
- **Enterprise Visual Language Overhaul**:
  - Eliminated artificial "AI dashboard" styling: removed neon card borders, ubiquitous pill badges, miniature cards, loud icon backgrounds, and tiny uppercase labels.
  - Adopted Inter as the universal UI font hierarchy; restricted monospace strictly to technical and financial tokens (MRNs, encounter IDs, claim codes, PST timestamps, centavo-accurate amounts).
  - Scaled up typography: body/table cell text (14–15px), secondary metadata (13–14px), section headings (15–18px), page titles (20–28px), and numeric values (20–28px).
  - Re-architected `GlobalCommandBar`, `SidebarNav`, `PriorityActionStrip`, `ActiveDischargeRadar`, `DualOperationalPipelines`, `VelocityRecoveryPulse`, `DischargeDossierDrawer`, `WhyDoIOweThisDrawer`, and all action modals.
- **Verification**: Zero TypeScript compilation errors (`tsc -b && vite build` built in 798ms). Verified active local HTTP dev server on port 5173.

---

### [2026-09-25] — Light Mode Mandate, Master/Detail Discharge Workspace & Intentional Color System

#### Implementation Highlights
- **100% Light Mode Mandate**: Completely eradicated dark mode from MedCore. Removed dark mode toggle buttons, theme switching logic, dark CSS variables, and all `dark:` classes across the entire codebase. Guaranteed light theme on root mount (`document.documentElement.classList.remove('dark')`).
- **Intentional Operational Color System**: Preserved MedCore's clinical color palette without resorting to monochromatic gray or AI-style neon accents:
  - **MedCore Blue**: Primary stage advances, navigation states, command actions.
  - **Emerald Green**: Positive approvals, clearances, settlements, gate passes.
  - **Amber Orange**: Bottlenecks, SLA warnings, tariff ceiling breaches, pending signatures.
  - **Rose Red**: Blocked discharges, high RTH risks, disputed charges.
  - **Purple**: RA 9439 statutory promissory note undertakings.
  - **Bold Semantic Status Indicators**: Replaced weak outlined pill badges with bold semantic text + colored pulse dots / icons (`✓ Ready for Exit`, `● In Review`, `! At Risk · 13m left`).
  - **Colorful High-Affordance Action Buttons**: Replaced generic gray buttons with purposeful semantic buttons.
- **Discharge Clearance Master / Detail Workspace**: Replaced the 7-column horizontal spreadsheet table with an ergonomic split workstation:
  - **Left Queue**: Quick-scanning patient list with room/bed, HMO, bold SLA countdowns, and net due amounts.
  - **Right Action Station**: Active case banner, 6-stage SLA progression tracker, prominent "What is Blocking Discharge Right Now?" alert box with narrative explainer and 1-click action triggers, 3-Driver Out-of-Pocket breakdown (Room Differential, Consumables Excluded, Excess Doctor PF), and immediate action buttons.
  - **View Flexibility**: Maintained 1-click toggle between Master / Detail Workspace, 6-Stage Kanban Pipeline (`DischargeMissionControl`), and Full Card Grid view.
- **Top Summary Area Normalization**: Replaced separate AI widgets in `PriorityActionStrip` with a unified 4-segment command summary strip featuring 24–28px bold numbers, 14–15px clear titles, and 13px descriptions.
- **Verification**: `npx tsc -b && npm run build` passed with zero errors in 790ms. Local dev server verified active on `http://localhost:5173` returning HTTP 200 OK.

---

### [2026-09-25] — Inspiration-Based Dashboard Visual & Architectural Overhaul (`dashboard_inspos/`)

#### Implementation Highlights
- **Design Inspiration Integration**:
  - **Inspo 1 (Comlogik HIMS)**: Integrated the Philippine hospital billing system paradigm into `ActiveDischargeRadar` and `TripartiteWorkbench`: patient demographic header banner (Patient ID, Name, Room/Bed, Age/Sex, Attending Doctor, HMO Payer), prominent **Net Balance Due** callout box (`₱ 12,450.00`), and dedicated right-hand **Quick Action Console Pad** with high-contrast, tactile operational buttons (`Record Payment / QR Ph`, `Apply Tariff Ceiling`, `Doctor QuickSign Portal`, `Execute RA 9439 Note`, `Issue Digital Gate Pass`, `Generate Official eSOA`).
  - **Inspo 2 (MediKit)**: Upgraded `PriorityActionStrip` with 4 clean metric cards featuring soft circular icon backdrops (rose, amber, blue, emerald), bold 26–28px figures, clear titles, subtitle context, and direct navigation links.
  - **Inspo 3 (MediCore AI)**: Redesigned `SidebarNav` with natural unnumbered groupings (`Operations & Workspaces` and `Statutory & Compliance`), solid royal blue active highlight (`bg-blue-600 text-white font-semibold shadow-xs`), bottom Patient Clarify utility card, and enhanced `GlobalCommandBar` with brand mark, facility subtitle, live calendar date + PST clock, universal search bar with `⌘K`, unread notification bell badge, and user role profile.
  - **Inspo 4 (Medicare Doctor Admin)**: Implemented 6-step discharge milestone progress bar with clear visual status indicators and clean worklist tags.
- **Verification**:
  - `npx tsc -b && npm run build` compiled cleanly in 849ms with 0 errors.
  - Verified local dev server active on `http://localhost:5173` returning HTTP 200 OK.

---

### [2026-09-25] — Full Demo Data & Realistic Philippine Hospital Simulation Overhaul

#### Implementation Highlights
- **Interconnected Inpatient Data Architecture (`src/data/mockData.ts`, `src/types/domain.ts`)**:
  - Extended core types with `EncounterTimelineEvent`, detailed HMO authorization statuses (`AWAITING_CODE`, `DISALLOWED_ITEMS`), PhilHealth pre-flight statuses (`INTERCEPTED`, `RETURNED`, `APPROVED`), claim aging days, assigned auditors, and operational dispute metadata.
  - Authored **15 comprehensive, realistic, fully interconnected inpatient encounters** covering all clinical disciplines (Internal Medicine, General Surgery, Orthopedics, OB-GYN, Nephrology, Cardiology, Pediatrics) and ward/private beds.
  - Full itemized chargemaster per patient with realistic clinical codes, supply line items, doctor fees, PhilHealth/HMO splits, patient OOP balances, and plain-language explanations.
  - Centavo-accurate statutory waterfall verification via `recalculateWaterfall` adhering to RA 9994/RA 10754 VAT exemptions and PhilHealth Circular 2024-0037.
  - Full chronological operational audit logs / event timelines for every patient.
- **Codified Philippine Hospital Archetypes**:
  - *Clean Fully Covered*: Miguel Santos (Dengue, Ward NBB, Medicard, ₱0 OOP balance).
  - *HMO Final LOA Bottleneck*: Juan Dela Cruz (Maxicare final eLOA code delayed 32m, contested catheter supplies).
  - *PhilHealth Documentation Deficiency / RTH Pre-Flight*: Arthur Alcantara (Lap Chole, CF4 vitals/operative notes missing, RTH score 0.78, SLA breached).
  - *Unclear Patient OOP Breakdown*: Teresa Dimaculangan, Ramon Castillo, and Lourdes Villanueva with 3-driver breakdown (Room Differential, Consumables Excluded, Excess Doctor PF).
  - *Active Chargemaster Disputes*: Maria Clara Bautista (contested ₱12,500 assistant surgeon PF); Juan Dela Cruz (contested ₱1,928 catheter); Lourdes Villanueva (₱6,071 disallowed bone cement); Eduardo Garcia (₱2,400 unreturned IV sets).
  - *Statutory Promissory Note Register under RA 9439*: Rolando Gutierrez (`PN-2026-089` for ₱24,600 stroke balance after Medicard MBL exhaustion); Ramon Castillo (`PN-2026-090` for ₱11,200).
  - *Pre-Flight Claim Interception*: Teresa Dimaculangan (MDR maiden name discrepancy caught prior to transmission).
  - *Cleared Cases with Digital HMAC Gate Passes*: Corazon Mendoza (`PASS-MC-88319`, Dialysis); Ferdinand Navarro (`PASS-INT-99120`, Femur ORIF cleared via QR Ph).
- **View Overhauls & Enrichments**:
  - `CoverageApprovalsView.tsx`: Multi-tier search, status pills (`All`, `Approved`, `Awaiting Code`, `Disallowed Supplies`, `Draft`), HMO carrier dropdown, MBL remaining, and turnaround time metrics.
  - `ClaimsEsoaView.tsx`: Master Pre-Flight Inpatient Worklist across all 15 claims, dynamic RTH risk score badges, CF4 clinical integrity dots (vitals, ward course, labs), status chips, and real-time PhilHealth Circular 2023-0026 conforming eSOA XML generator.
  - `RcmAnalyticsView.tsx`: 30-Day Discharge Turnaround Time (TAT) Descent visual chart, Trapped Capital Pareto by friction source, AR Aging Profile, and Multi-Payer Performance & Turnaround Matrix.
  - `DischargeDossierDrawer.tsx`: Live chronological Operational Timeline / Audit Log rendering timestamps, actors, and status pills.
  - `DisputesExceptionsView.tsx`: Active Chargemaster Disputes triage with 1-click supervisory waiver/promissory triggers, and RA 9439 Promissory Note Register with executed installment agreements.
  - `EncountersLedgerView.tsx` & `PatientClarifyView.tsx`: Synchronized across all 15 patients.
- **Verification**:
  - `npx tsc -b && npm run build` successfully passed with 0 errors in 817ms.
  - Local Vite dev server active on `http://localhost:5173` returning HTTP 200 OK.

---

### [2026-09-26] — Realistic 250-Patient Level 3 Philippine Hospital Dataset Expansion

#### Implementation Highlights
- **Deterministic Dataset Generator (`src/data/patientDatasetGenerator.ts`)**:
  - Zero-dependency Lehmer PRNG algorithm generating **235 additional realistic inpatient records** seamlessly joined with the 15 handcrafted flagship encounters in `mockData.ts` for a total of **250 patient records**.
  - Distributed across a realistic Level 3 tertiary hospital structure: Surgical & OB-GYN (73), Internal Medicine & Cardiology (41), Orthopedics & Pediatrics (40), Telemetry & Step-Down (37), Private Deluxe (18), Executive Suites (13), Emergency Department (10), Intensive Care (ICU/NICU/PICU, 14), and Ambulatory Hemodialysis (4).
  - 13 attending physicians with verified PRC license formats and specialty acronyms (FPCP, FPCS, FPOA, FPOGS, FPPS, FPCC, FPNA, FPCR).
  - 8 accredited HMO carriers (Maxicare, Intellicare, Medicard, Pacific Cross, PhilCare, Etiqa, Caritas, Insular Health).
  - 10 codified PhilHealth & HMO problem categories: Clean Ready (123), Missing Docs (23), Coding Mismatch (18), Incomplete Req (13), PH Benefit/Aging (16), HMO Authorization Issues (45), Billing Discrepancies (15), Pending Review (3), Denied/RTH (9), Discharge Blocking (111).
  - Centavo-accurate statutory deduction waterfalls (`recalculateWaterfall`) yielding ₱12.27M gross charges, ₱7.50M PhilHealth coverage, ₱3.09M HMO coverage, and ₱1.79M patient OOP due.
  - 8 executed promissory notes under RA 9439 and 15 active chargemaster disputes totaling ₱50,670.
- **UI Scalability & Pagination Adjustments**:
  - `CoverageApprovalsView.tsx`: 20-row client-side pagination with clean controls preventing DOM overload.
  - `ClaimsEsoaView.tsx`: 15-row pagination for pre-flight audit worklist with instant eSOA XML preview updates.
  - `EncountersLedgerView.tsx`: Upgraded patient selection with a compact search bar, full `<select>` dropdown, and top 8 quick chips.
  - `SearchModal.tsx`: Sliced matches to top 15 results for responsive keyboard navigation.
  - `PatientClarifyView.tsx`: Added room/bed prefixes to patient dropdown options.
- **Verification**:
  - `npx tsc -b && npm run build` successfully compiled in 868ms with 0 errors.
  - Vite dev server verified responsive on `http://localhost:5173` returning HTTP 200 OK.



