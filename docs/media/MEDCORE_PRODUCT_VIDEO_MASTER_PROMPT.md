# MedCore product video — complete production prompt

You are a product-film director, motion designer, editor, screen-capture artist, and sound designer. Create a finished, polished product video for **MedCore**, covering both its hospital dashboard and patient mobile app. Execute the production with the assets and tools available to you; deliver the video, not just a concept or rewritten storyboard. If your environment cannot render video, state that limitation and deliver the complete editable production package instead of claiming that a video was rendered.

## 1. The assignment

Produce **“MedCore — Clear the Way for Care”**, a **4 minute 30 second** product film. The source storyboard is `story-board-v1.pdf`, a four-page, eight-scene plan for a hopeful, inspirational, all-English prototype presentation. Follow its narrative order. The user's latest direction replaces human voice-over and on-camera speaking with **AI narration**. Show both real interfaces prominently, with clean, enjoyable animation and enough time to understand the interactions.

Target viewers: innovation judges, hospital administrators, CFOs, billing personnel, potential pilot partners, and Filipino patients and families. Make the film understandable to someone who has never heard of revenue-cycle management. Explain the problem through people’s experience, demonstrate the solution through real screens, and close with the team and the proposed Cagayan Valley pilot.

The tone is warm, credible, optimistic, clear, and lightly playful. Create enjoyment through rhythm, satisfying progress, precise visual transformations, and small moments of relief. Treat hospital costs and patient anxiety with respect.

The primary cut must run **04:30**, including the closing hold. A timing adjustment within **04:15–04:45** is acceptable only when needed for natural AI speech; preserve the final four-second end card. Do not produce a short teaser in place of the full film. Do not shorten below **03:30**. If a later approved script establishes another duration within the storyboard’s 3–5 minute intention, use that approved duration.

## 2. Context you must understand

MedCore is a **financial intelligence and multi-payer reconciliation platform for Philippine healthcare**. It coordinates the financial picture among the hospital, PhilHealth, private HMOs, and the patient. Its intended role is a layer alongside existing hospital systems such as **BizBox, Comlogik, and Medsys**; it does not replace clinical hospital software.

The central problems are:

- Patients do not clearly understand their charges, benefits, exclusions, and remaining responsibility.
- Billing staff reconcile fragmented hospital records, insurer portals, authorization information, and professional fees.
- Discharge becomes a chase for clearances, bill corrections, insurance authorization, and settlement.
- Unexplained exclusions and fee differences cause disputes and distress.
- Errors and incomplete claim packages can delay reimbursement, creating administrative work and financial pressure.

The product story is **GUIDE → VERIFY → REWARD → REPORT → IMPROVE**, with **ClaimReady** as the explanatory name for the claims/eSOA pre-flight capability. Translate each pillar into a benefit immediately:

- GUIDE: understand estimated costs and room choices early.
- VERIFY: organize eligibility, coverage, authorization, and exceptions.
- REWARD: make settlement and approved payment arrangements easier.
- REPORT: see clearances, financial bottlenecks, and claim readiness.
- IMPROVE: identify recurring issues and support better future decisions.

The dashboard is a React/Vite staff application. The mobile app is implemented in React Native/Expo. They use a shared Hono API and PostgreSQL backend. A simple technical card may say **“Hono + PostgreSQL • One shared source of truth.”** Avoid turning the film into an architecture lecture.

Use **MedCore** consistently. Some older operational notes use AQROMED, and older vault pages describe a future native app or a mobile-web-only experience. The provided storyboard, current screen captures, and current mobile brand component use MedCore, and the native app implementation now exists. Follow current implementation and supplied assets when historical notes disagree.

## 3. Source and asset priority

If repository access is available, the project root is:

`/Users/mclein/Documents/Developer/Personal_Projects/MedCore1`

Read the storyboard, then use these sources as needed:

- `.brain/PROJECT_CONTEXT.md`: read the opening product context and the latest October 2026 implementation updates; it is a chronological file with historical material.
- `MedCore_Vault/PROJECT.md` and `MedCore_Vault/PRODUCT/{problems,users,workflows,value_proposition,vision}.md`.
- `MedCore_Vault/SYSTEM/architecture.md` and `MedCore_Vault/DECISIONS/{product_decisions,technical_decisions}.md`; verify older specifications against code.
- `MedCore_Vault/REQUIREMENTS/mvp_scope.md`: distinguish planned capabilities from current features.
- `MedCore_Vault/RESEARCH/market.md` and `MedCore_Vault/BUSINESS/`: context for the market segment, with the market-definition caveat below.
- `UI_SCREENSHOTS/`: actual dashboard and mobile UI images; check that files exist rather than trusting every old index entry.
- `docs/implementation/simulated-payments.md`, `docs/validation/sms-sandbox/README.md`, `docs/validation/cora-language/README.md`, and `apps/mobile/validation/apple-ui/README.md`.
- Actual components under `apps/dashboard/src/`, `apps/mobile/src/`, `apps/server/src/`, and `apps/shared/`.

Use this priority when conflicts arise: **latest user direction → actual implementation/current verified capture → storyboard narrative and specified figures → recent operational notes → older vault specifications**. Preserve the storyboard’s important numbers with truthful labels; do not silently convert projections into achieved results.

For an AI editor without filesystem access, use the attached storyboard, screenshots, logos, and any supplied recordings. Do not pretend that a local path is accessible. Complete everything possible with the provided files and identify any missing capture explicitly.

### Real UI treatment

Use real screen recordings where available. Otherwise, animate the original PNG screenshots as intact, sharp image layers with deliberate crops, pans, focus highlights, and gentle zooms. At least **60% of the final film** should visibly feature real dashboard/mobile UI, including UI in split screens, explanatory diagrams, or the background of supporting cards. Give the mobile app at least **70 seconds of meaningful screen time**, including split-screen shots, rather than using it only as a decorative phone.

Do not ask a generative video model to redraw the interface. Composite real UI into video so labels, amounts, typography, icons, and controls stay accurate. Generated footage may provide abstract backgrounds or brief environmental shots, but never the dashboard, phone screen, logo, text, QR code, or financial values.

Keep the existing MedCore badge and wordmark intact:

- `logo/MedCore_Badge_Logo.png`
- `logo/MedCore_Text_logo.png`
- Equivalent current copies under `apps/mobile/assets/brand/`.

Use simple, slim device frames only when they help comprehension. Make desktop interfaces large enough to read. Never shrink an entire dense dashboard into a tiny laptop screen for a long feature explanation. Use an establishing full view, then a close crop of the specific action.

The source screenshots were captured with synthetic fixtures at **1440×1000 for dashboard** and **390×900 for mobile**. Mobile images are web-preview renders of the React Native app, not physical-device captures. Preserve aspect ratios; recapture at higher resolution if needed. Do not claim screenshot zooming is an actual interactive recording.

## 4. Visual direction and animation

Use the product’s current visual language: generous spacing, rounded white cards, crisp typography, a navy foundation, accessible teal, and restrained blue accents.

Suggested surrounding graphics palette, taken from the app theme:

- Background: `#F5F6F8`
- White surfaces: `#FFFFFF`
- Ink: `#0F172A`
- Navy: `#0F2A4A`
- Teal: `#11806D`
- Teal tint: `#E7F4F0`
- Blue: `#0284C7`
- Success: `#047857`
- Amber: `#B45309`
- Borders: `#E2E6EB`

Favor clean typography, a consistent grid, soft shadows, and depth through overlapping cards. Use the real UI’s own fonts inside screenshots. For surrounding titles use a compatible modern sans serif such as Inter or an available system font.

Animation should have purpose:

- Let a tangled paperwork line become one smooth connector into the reconciled ledger.
- Let five pillar labels illuminate in sequence, then become a small progress ribbon.
- Use a ledger-to-phone match cut to express one financial picture for staff and patient.
- Let the existing success checkmark or approved badge provide a small, satisfying payoff.
- Finish with calm, resolved movement rather than more visual complexity.

Use approximately **250–450 ms** for small emphasis moves and **500–900 ms** for major reveals. Use smooth ease-out curves or restrained springs with very little overshoot. Default UI camera moves should stay near 100–115% scale; use a separate sharp crop for 140–170% detail shots. Stop camera motion while viewers read amounts or instructions.

Hold key figures and actions for **3–5 seconds**. Vary composition about every **4–8 seconds**, but let more complex UI demonstrations breathe for **8–12 seconds**. Favor match cuts, clean slides, and brief dissolves. No incessant zooming, spinning devices, glitch transitions, flashing charts, exaggerated bounce, neon cyberpunk, fake holograms, or confetti over patients’ bills.

Keep one clear focal point per shot. Use short callouts, usually **2–6 words**. Show no more than two callouts at once. The cursor should move deliberately and pause before a click. A subtle tap ripple is fine; random cursor travel is not.

Render editorial titles and figures as native vector/text layers, not generated text pixels. Spell **PhilHealth, GCash, Maya, QR Ph, eLOA, eSOA, ClaimReady, MedCore**, and team names correctly.

## 5. AI voice-over and sound

Use **one AI narrator for the entire film**, including the team introduction. Choose a warm, articulate adult voice with natural Filipino English or clear international English, gentle confidence, and conversational phrasing. A warm female voice is the default; a similarly natural male voice is acceptable if the tool’s female options sound artificial. No cloned celebrity voice, impersonation, robot monotone, exaggerated sales delivery, or artificial emotional distress.

All narration is English. The real Cora UI may display its supported language choices: **English, Taglish, Tagalog, and Ilokano**. For the main demonstration select English where an authentic capture is available.

Aim for roughly **120–140 spoken words per minute**, adjusting by scene. Time the rendered audio, including pauses and name pronunciations. Do not use a word-count estimate as the final timing check. Allow a breath after the hook, a two-second quiet beat after the problem, and clean gaps for feature clicks. Do not stretch speech mechanically to fill the timeline.

Pronunciation guidance:

- MedCore: “med-core.”
- PhilHealth: “fil-health.”
- HMO, QR, PIN, DTI, MIT: letters where appropriate; PIN may be pronounced “pin.”
- eLOA: introduce as “electronic letter of authorization,” then use “E L O A” if needed.
- eSOA: say “electronic statement of account”; do not make viewers decode it.
- DAR: say “days in accounts receivable.”
- POS: say “point-of-service collections.”
- ₱: say “pesos”; read currency amounts naturally, with figures preserved in the written graphics.
- Audition Cagayan Valley, Calabarzon, Cebu, and team names before final synthesis. Use a pronunciation dictionary or phoneme override when needed; do not invent confident pronunciations for unfamiliar names.

Music: a licensed or original instrumental with a soft pulse, warm keys, light percussion, and an optimistic melodic lift. Start restrained, brighten when the solution appears, and give the payment/pass sequence a small musical payoff. Keep narration clearly above the music. Use subtle clicks, taps, a gentle processing pulse, and one soft clearance chime. Leave the two-second problem-to-solution pause mostly quiet.

For the master, target about **−16 LUFS integrated**, with true peak below **−1 dBTP**, without audible pumping. Export narration, music, and effects separately. Make accurate English captions from the final synthesized audio; keep them below the focal UI area, within safe margins, and no more than two lines.

## 6. Exact narrative and timing

Use the narration below as the production script. Minor pronunciation, breathing, and transition edits are allowed; preserve meaning, specified figures, and honest qualifications. Text in quotation blocks is spoken; directions and overlays are not.

### Scene 1 — Hook | 00:00–00:15 | 15 seconds

**Purpose:** identify the product immediately and establish the discharge ambition.

**AI voice-over — speak verbatim:**

> MedCore clears the hospital money maze. Our goal: discharge in under forty-five minutes, not eight hours. One clear financial picture, for the hospital and the family waiting to go home.

**Shots:**

- 00:00–00:04: navy opening; a thin clock arc resolves into the MedCore badge. Reveal “Clear the Way for Care.” Avoid a long logo intro.
- 00:04–00:10: large real dashboard crop with a real mobile Home screen arriving beside it. An editorial “8 hours” resolves to “Under 45 minutes,” with a readable **“Discharge target”** label.
- 00:10–00:15: settle into a clean two-platform hero. Callout: “Clarity for staff. Confidence for families.”

No team faces here. Music establishes a pulse and ducks under the first line.

### Scene 2 — Problem with emotion | 00:15–00:55 | 40 seconds

**Purpose:** make the problem tangible through the storyboard’s reported patient experience.

**AI voice-over — speak verbatim:**

> Consider the experience behind our storyboard: a senior citizen, a PhilHealth member for thirty-nine years, also covered by a private HMO. A thirty-eight-thousand-peso outpatient procedure came with an unexpected eight-thousand-three-hundred-peso personal bill. After the hospital reviewed it, that amount became one thousand three hundred. The family’s question was simple: why was the balance unclear in the first place? Meanwhile, staff chase approvals, recheck charges, and explain bills across disconnected systems.

**Shots:**

- 00:15–00:25: faceless, original motion illustration of a bill and two coverage cards. Use abstract paper shapes and an anonymous person icon, no patient photograph.
- 00:25–00:38: clean amount sequence: **₱38,000 procedure → ₱8,300 initially quoted → ₱1,300 after review**. Label **“Reported experience from the storyboard • Illustrative visuals.”** Hold each amount long enough to read.
- 00:38–00:48: three tidy fragments labeled “Hospital,” “PhilHealth,” and “HMO,” with repeated paper/call icons showing reconciliation effort. Titles: “Unclear balance,” “Disconnected approvals,” “Discharge friction.”
- 00:48–00:53: quiet hospital-door silhouette and a paused clock; return to the question, “Why is this still unclear?”
- 00:53–00:55: two-second quiet beat before the solution.

This case predates the product demonstration. Do not depict MedCore as having caused the bill adjustment, state that any policy guarantees 90% coverage, or imply that personal connections are a required step. No crying actors or invented testimonials.

### Scene 3 — Solution promise | 00:55–01:20 | 25 seconds

**Purpose:** introduce the reconciliation layer and five pillars before the detailed demo.

**AI voice-over — speak verbatim:**

> MedCore adds a reconciliation layer alongside existing hospital systems. It brings hospital charges, eligible discounts, PhilHealth benefits, and HMO approvals into one explainable ledger. Guide. Verify. Reward. Report. Improve. And ClaimReady helps staff review claims before submission. The same financial picture reaches the patient’s phone.

**Shots:**

- 00:55–01:01: transition from tangled lines to a simple three-party diagram. Small text-only labels: **BizBox / Comlogik / Medsys**. Caption: **“Designed to complement existing hospital systems.”** These are ecosystem examples, not partnership badges.
- 01:01–01:10: actual Encounters & Ledgers view. Reveal an explanatory waterfall beside it: gross charges → eligible adjustments → PhilHealth → approved HMO coverage → patient responsibility. Keep that sequence correct; do not calculate discounts on every item indiscriminately.
- 01:10–01:16: **GUIDE → VERIFY → REWARD → REPORT → IMPROVE** appears as a progress ribbon. “ClaimReady” is a separate supporting label, not a sixth pillar.
- 01:16–01:20: match cut between the real ledger and real mobile Bill screen. Only imply they describe the same patient if the captured identity and values genuinely match.

Brighten the palette from this point forward.

### Scene 4 — GUIDE + VERIFY, dashboard to patient | 01:20–02:20 | 60 seconds

**Purpose:** show early financial orientation, organized approvals, and how patients understand their bill.

**AI voice-over — speak verbatim:**

> Guide starts with an estimate, so room choices and expected personal costs are visible early. It supports financial orientation, not a demand for an emergency deposit. Verify brings coverage and authorization information into one worklist. Staff can review approved amounts, track pending letters of authorization, and investigate exclusions. In this prototype, an approval action takes seconds; the goal is to replace hours of follow-up. On mobile, patients see their remaining balance, their bill, and their coverage in a few clear taps. Cora, the billing assistant, helps explain recorded charges and benefits. It supports English, Taglish, Tagalog, and Ilokano, so financial information is easier to understand.

**Shots:**

- 01:20–01:30: real **Pre-admission cost estimator** under Encounters & Ledgers. Focus on procedure selection, estimated charges, coverage deductions, and estimated out-of-pocket. Callout: “Know the estimate early.” Use actual captured values; the storyboard’s room-price examples are optional, not a reason to overwrite UI numbers.
- 01:30–01:39: real **Approvals & Disputes → HMO Gateway Roster** / `CoverageApprovalsPage`. Show PhilHealth PEC and eLOA labels as present in the source, then the patient worklist. Caption: **“Prototype coverage workflow.”**
- 01:39–01:46: actual eligible staff approval and confirmed Approved state if a recording exists. Supporting card: **“Prototype action: seconds”** versus **“Storyboard comparison: 2–4 hours of calls.”** Small qualification: **“External payer turnaround not measured.”** Static images may show recorded states but must not invent a live click-to-approval.
- 01:46–01:56: phone becomes dominant. Real mobile **Home → Bill**, focusing on “Remaining hospital balance,” “Final bill ready,” and the itemized breakdown. Show total charges, deductions, and remaining balance without rushing the scroll.
- 01:56–02:04: real **Coverage** screen showing recorded PhilHealth and HMO benefit information. Callout: “See what is covered.”
- 02:04–02:14: real **Cora AI** sheet, a real question such as “Why do I still have a balance?”, the current pulsing typing dots, and a genuine recorded response. Show language chips briefly. Prefer English for the response. Do not write an invented answer into a captured screen.
- 02:14–02:20: mobile Documents/receipts or hospital updates, then a short dashboard-and-phone composition. Callout: “One clearer experience.”

Cora is a billing/coverage assistant grounded in the selected account’s recorded financial data. Do not present it as a diagnostic, treatment, legal-advice, or unrestricted chatbot. If only the supplied Cora still is available, show it as an existing captured conversation; do not fake a new exchange or relabel a mixed-language conversation as all-English.

### Scene 5 — REWARD + REPORT + CLAIMREADY + IMPROVE | 02:20–03:35 | 75 seconds

**Purpose:** deliver the most satisfying product demonstration: payment or arrangement, recorded outcome, clearance, and staff oversight.

**AI voice-over — speak verbatim:**

> When the final bill is ready, Reward makes the next step clear. The mobile flow offers GCash, Maya, QR Ph, cards, and bank options, with a review before confirmation. This demonstration uses simulated payments. A successful transaction produces a receipt and updates the recorded balance. An approved zero-interest payment arrangement provides another supported path. Once the required clearances are complete, a digital discharge pass brings together a QR code and private exit PIN. Behind that experience, Report keeps staff focused on clearance stages and bottlenecks. Our illustrative scorecards show the goals: receivable days from seventy-five to twenty-one point four, collections up forty percent, and claim returns below two percent. ClaimReady checks the electronic statement of account before submission. Improve helps teams see recurring issues and strengthen the next review.

**Shots:**

- 02:20–02:31: real mobile **Continue to Payment → payment methods**. Show GCash, Maya, QR Ph, and briefly card/bank options. Pick one main route, preferably QR Ph, rather than completing every method.
- 02:31–02:40: real review → processing → success → receipt. Hold amount and transaction reference. Place an editorial label outside the device: **“Simulated payment • No real funds transferred.”** Do not remove existing UI or fabricate provider authorization.
- 02:40–02:47: mobile payment-plan preview/review and recorded arrangement. Explain visually: **“0% interest • Approved arrangement.”** Treat this as a separate branch; a payment plan is not cash received. Never cut a small partial-payment success directly to full clearance.
- 02:47–02:56: real mobile discharge pass beside the dashboard’s cleared state. Show **QR + private exit PIN** using a synthetic, nonproduction pass. Required clearances must genuinely be complete in the captured fixture. Retain the real QR image without generative distortion.
- 02:56–03:05: real **Discharge Clearance** queue/pipeline. Focus on stages and the countdown. Callout: “See the blocker. Move the next step.” Avoid claiming settlement itself grants medical clearance.
- 03:05–03:15: real **RCM Analytics** underneath three separate editorial KPI cards. Main figures: **DAR 75d → 21.4d**, **POS collections +40%**, **RTH 20% → <2% (illustrative 1.2%)**. Clearly title the cards **“Illustrative impact goals — not measured pilot outcomes.”** Do not replace the screenshot’s own metrics with these figures. Hold the cards at least five seconds.
- 03:15–03:27: real **Claims & eSOA XML** worklist → selected claim/checklist → AI scrub or run audit → XML/export as actually captured. Editorial title: **“ClaimReady — review before submission.”** Highlight issues and a genuinely recorded ready state when available; no invented red-to-green result.
- 03:27–03:35: analytics exceptions/denial patterns or disputes worklist. Animate an external connector back to GUIDE/VERIFY as the product’s improvement concept. Small card: **“Hono + PostgreSQL • One shared source of truth.”** Do not imply autonomous rule deployment has been demonstrated.

Throughout Scene 5 keep a discreet lower-third: **“LIVE PROTOTYPE — med-core1.vercel.app”** for authentic live-site captures. For local or still-only footage use **“PROTOTYPE DEMO — med-core1.vercel.app”** so “live” does not misdescribe the capture. Keep **SAMPLE DATA** visible on all UI footage.

### Scene 6 — Market + ecosystem | 03:35–03:55 | 20 seconds

**Purpose:** establish opportunity and ecosystem fit without displacing product time.

**AI voice-over — speak verbatim:**

> Built for patients, billing teams, doctors, and hospital leaders. Our starting focus is NCR, Calabarzon, Cebu, and Cagayan Valley. The storyboard’s market model frames the opportunity. MedCore complements existing hospital software with clearer three-way financial coordination.

**Shots:**

- 03:35–03:39: retain real UI in the background; show short audience labels and a simple Philippine map with the named focus regions. These are intended focus areas, not active customer locations.
- 03:39–03:47: one clean market card, held fully readable for at least five seconds:
  - **TAM: ₱4.564B • 1,260 hospitals**
  - **SAM: ₱2.738B • 454 hospitals**
  - **SOM: approximately ₱1.35B**
  - Footer: **“Founder/storyboard market model • Estimates; methodology to validate.”**
- 03:47–03:55: simple stack: **“Existing hospital systems” → “MedCore financial coordination” → “Staff dashboard + patient app.”** Text-only examples: BizBox / Comlogik / Medsys. Keep both real interface images visible.

Preserve these storyboard figures, but do not present them as independently verified research, current revenue, signed customers, or a deployed network. The vault’s larger billing-volume market estimates describe another market definition; do not mix those values with this card. Avoid dismissive competitor comparisons and unauthorized partner logos.

### Scene 7 — Team near the ending | 03:55–04:15 | 20 seconds

**Purpose:** introduce the real people behind the prototype while keeping AI narration.

**AI voice-over — speak verbatim:**

> Created by Marc, McLein, and Micoh, with Professor Fernando Jaminola. A student team building for Filipino families, and for the hospital staff who help them. Our work brings product thinking, financial clarity, and patient dignity together.

**Shots:**

- 03:55–04:03: one real supplied team photograph or silent real team clip; subtle slow push. This is the first point where identifiable people may appear.
- 04:03–04:11: beautifully spaced credits, preferably two balanced columns or two sequential cards, with full exact names:
  - **Marc Andre Nicolas M. Callueng — Student**
  - **McLein Jei G. Onza — Student**
  - **Micoh Jeremy C. Montenegro — Student**
  - **Prof. Fernando M. Jaminola Jr., MIT — Coach**
- 04:11–04:15: return to the real dashboard/phone pair or a real hands-on-laptop team cutaway.

If no real team images are supplied, use a polished typographic team card with abstract shapes and the two product screens. Do not synthesize their faces, fabricate team footage, animate lips, or use human-recorded narration. The full names belong on screen even if the narrator uses shortened names for natural timing.

### Scene 8 — Traction + close | 04:15–04:30 | 15 seconds

**Purpose:** finish with reported recognition, pilot intent, and a clear invitation.

**AI voice-over — speak verbatim:**

> DTI Be Your Own Boss. Best Pitch, Pitch Perfect. A Cagayan Valley pilot-ready prototype. Reclaim beds. Recover cash. Release patients with dignity. MedCore.

**Shots:**

- 04:15–04:20: supplied award photograph/document if available; otherwise an elegant text card reading **“DTI Youth Entrepreneurship Program — Be Your Own Boss / Best Pitch (Pitch Perfect).”** Use the storyboard’s founder-reported recognition; do not fabricate a certificate, event photo, seal, endorsement, or award logo.
- 04:20–04:26: clean product pair and **“Cagayan Valley pilot-ready prototype.”** Supporting text: **“Proposed pilot • Validate discharge time, billing clarity, and claim readiness.”** This is a pilot proposition, not a production certification or proof of deployment. Narration ends by 04:26.
- 04:26–04:30: hold an unchanging navy end card for four full seconds:
  - Original MedCore badge and wordmark
  - **Clear the Way for Care**
  - **Explore the prototype**
  - **med-core1.vercel.app**

Let the music resolve. Keep the URL legible. End on the product invitation, not another statistics slide.

## 7. Capture plan and available screenshot map

Use the route/subview names in the current product, rather than exposing source-code filenames to viewers.

| Story beat | Preferred real source | Screenshot fallback, relative to `UI_SCREENSHOTS/` |
|---|---|---|
| Dashboard hero | Overview / Command Center | `dashboard/01-overview.png` |
| Shared financial picture | Encounters & Ledgers | `dashboard/03-encounters-ledgers.png` |
| GUIDE estimate | Encounters & Ledgers → Pre-admission cost estimator | `dashboard/03b-pre-admission-estimator.png`, associated scroll capture |
| VERIFY workflow | Approvals & Disputes → Dual Pipelines / HMO Gateway Roster | `dashboard/04-approvals-disputes.png`, `dashboard/04b-hmo-gateway-roster.png` |
| Disputes/arrangements | Approvals & Disputes → Disputes & Promissory | `dashboard/04c-disputes-promissory.png` |
| Clearance | Discharge Clearance / pipeline | `dashboard/02-discharge-clearance.png`, `dashboard/02b-discharge-pipeline.png` |
| ClaimReady | Claims & eSOA XML | `dashboard/05-claims-esoa.png`, `dashboard/05-claims-esoa-scroll-01.png` |
| REPORT/IMPROVE | RCM Analytics | `dashboard/06-rcm-analytics.png`, `dashboard/06-rcm-analytics-scroll-01.png` through `-04.png` |
| Mobile first impression | Launch / Home | `mobile/00-launch.png`, `mobile/07-home.png` |
| Bill transparency | Bill / itemized breakdown | `mobile/08-bill.png`, `mobile/08-bill-scroll-01.png` |
| Benefit visibility | Coverage | `mobile/09-coverage.png`, associated scroll capture |
| Cora | Real recorded chat and language selector | `mobile/16-cora-assistant.png` |
| Methods | Payment flow | `mobile/payment-flow/01-amount.png`, `02-methods.png`, `02-methods-scroll-01.png` |
| QR Ph route | Payment flow | `mobile/payment-flow/03-qr-ph.png`, `04-qr-review.png`, `05-processing.png` |
| Success/receipt | Payment flow / payments history | `mobile/payment-flow/06-success.png`, `07-receipt.png`, `mobile/10b-payments-recorded.png` |
| Wallet options | Payment flow | `mobile/payment-flow/08-gcash-details.png`, `08-gcash-review.png`, `09-maya-details.png`, `09-maya-review.png` |
| Other payment options | Payment flow | `mobile/payment-flow/10-card-review.png`, `11-bank-review.png` |
| Payment arrangement | Payment flow | `mobile/payment-flow/12-payment-plan-details.png`, `12-payment-plan-review.png`, `13-payment-plan-recorded.png` |
| Records/documents | Documents / Claims / hospital updates | `mobile/13-documents.png`, `mobile/12-insurance-claims.png`, `mobile/15-hospital-updates.png`, `mobile/13b-documents-with-receipt.png` |
| Digital discharge pass | Authentic mobile Documents pass + staff pass modal | Requires a supplied or fresh synthetic capture; no dedicated gate-pass PNG is listed in the current root set |

Asset realities you must handle:

- Some Overview/Analytics screenshots show **“AI is unavailable in this synthetic screenshot fixture.”** A useful crop may focus on another real panel, or collapse/recapture that section through the real UI. Do not paint in a fabricated executive AI answer.
- The main estimator screenshot predates the latest sandbox SMS UI and shows SMS unavailable. Omit that peripheral action if it is irrelevant. If SMS appears, use the newer `dashboard/sms-sandbox/` captures and label it simulated; no cellular messages are delivered.
- The saved mobile QR success is a **₱500.05 partial payment**, and the arrangement screenshot records **₱50.05**. These are valid separate fixture examples, not proof that the original **₱18,450.00** balance has been fully settled. Reuse them only with honest standalone framing, or record one coherent complete synthetic flow for the film.
- Staff and mobile captures do not all show the same account or hospital labels. Do not match-cut them as a single patient journey unless source identity, bill, amounts, and status actually match.
- `dashboard/08-patient-portal.png` appears in an old index but is absent from the current image folder. The dashboard’s old staff-facing patient-preview actions were removed. Show the actual mobile app rather than inventing that dashboard route.

If fresh recording is supported, prefer this coherent path:

1. Use a dedicated synthetic facility, staff account, and patient account. Use no production patient or financial data.
2. Establish a named synthetic patient/bill with a consistent financial breakdown and pending clearances.
3. Record staff estimator/ledger/coverage views and approval confirmation through existing authorized controls.
4. Record the same patient’s mobile Home, Bill, Coverage, Cora, and Documents. Verify amounts before recording.
5. Record the main payment route using the currently simulated processor, then the issued receipt and changed balance.
6. For the clearance shot, complete all required stages in the synthetic fixture and obtain its genuine active pass. Do not infer clearance from the partial-payment screenshot.
7. Record a payment arrangement as a clearly separate alternative branch; verify its principal and schedule.
8. Record dashboard discharge/claims/analytics views with the same synthetic state where the story calls for continuity.

Capture with a clean browser/application window, no desktop clutter, secret values, console overlays, developer menus, exposed credentials, or personal notifications. Record stable holds before and after clicks. Never stage a real payment, real SMS, hospital record mutation, or production pass for this film. If only stills are available, make a polished still-based demonstration and identify it as such in the production notes.

## 8. Accuracy rules for this specific prototype

These are part of the production brief because older product plans and some on-screen labels are more ambitious than the implemented prototype:

- **Discharge under 45 minutes:** an operational target. The film must not claim it has been achieved in a measured hospital pilot.
- **eLOA in seconds:** show the prototype’s staff workflow speed. External payer adjudication and live PhilHealth eligibility are not proved by an Approved badge or a hardcoded gateway-status label.
- **DAR 75d → 21.4d, POS +40%, RTH 20% → <2% / 1.2%:** storyboard-prescribed illustrative impact figures, not independently validated outcomes. Keep the qualification close to the figures. Some dashboard scorecards/footer values are legacy examples.
- **Payments:** the current processor is simulated in local and hosted builds. Brand artwork and a success screen do not establish a live provider connection or transfer of funds.
- **SMS:** the current engine is permanently sandbox-only. Do not add a scene of a supposedly delivered patient SMS or a working magic-link onboarding service.
- **Hospital/payer integrations:** represent the intended middleware fit. Do not claim deployed adapters, official certification, partnerships, or production connections to BizBox, Comlogik, Medsys, PhilHealth, or HMOs based on architecture notes alone.
- **ClaimReady:** show pre-flight review, recorded audit results, and XML generation/export. A prepared export is not a submitted, accepted, paid, or guaranteed-clean claim. Human review remains visible in the workflow.
- **IMPROVE:** demonstrate identifying patterns and supporting review. Do not show unverified autonomous deployment of new rules or promise that an error can never recur.
- **Discounts:** show eligible adjustments accurately. Do not imply every patient receives Senior/PWD discounts or that each charge is eligible.
- **Promissory/payment plans:** show supported approved arrangements and 0% interest as implemented. Do not claim loan approval, instant legal entitlement for every accommodation, guaranteed recovery, or that financed principal is collected cash.
- **Discharge pass:** use a genuine synthetic pass and recorded clearance status. Do not manufacture the QR payload/PIN, show a real usable credential, or equate financial settlement with medical permission to leave.
- **Market figures:** use the storyboard’s estimates with their label and source. They are neither measured revenue nor current customer counts.
- **Traction/team:** preserve the storyboard’s names and reported award. Use real supplied evidence or text. Do not invent endorsements or replace the people with AI-generated portraits.

Maintain a discreet **SAMPLE DATA** tag on all UI shots. Keep simulation/target labels legible, close to the relevant scene, and out of the actual screenshot pixels. There is no need for a large disclaimer slate; use concise, integrated wording that viewers can read.

## 9. Production workflow

1. Inventory the storyboard, logos, screenshots, recordings, team/award assets, and tool capabilities. Verify filenames and identify missing shots.
2. Assemble the 04:30 timeline above. Decide where authentic recordings are available and where intact screenshot animation is required.
3. Synthesize the narration scene by scene, audition pronunciation, and measure actual durations. Keep all spoken lines inside their scene windows, the problem pause intact, and Scene 8 silent from 04:26 onward except music.
4. Build the real-UI edit first. Layer callouts, progress ribbons, diagrams, and device frames around it. Use generative imagery only for appropriate supporting visuals.
5. Add the music, subtle effects, captions, and honest prototype labels. Check the full film with sound and again with captions only.
6. Inspect at full resolution and at a typical laptop presentation size. Check financial continuity, typography, cropped controls, safe margins, intelligibility, animation pacing, and the closing hold.
7. Export, then play the exported file end to end. Confirm audio/video duration and synchronization. Do not report success based only on preview rendering.

Do not redesign the applications or change production code to make footage look better. Any synthetic capture setup should remain separate from application data. If this is implemented with an animation framework, deterministic compositing is preferable to generative redrawing of screens; the tool choice is yours.

## 10. Deliverables and acceptance

Deliver:

- **`MedCore_Clear_the_Way_for_Care_04m30s.mp4`**, 16:9, 1920×1080 minimum, 30 fps, H.264, high-quality AAC stereo. A 3840×2160 master is welcome when real source resolution supports it.
- An editable project/timeline or reproducible render source containing the eight scenes, all UI assets, editorial text, and animation settings.
- Final narration transcript, generated narrator WAV, and separate music/effects tracks where the tool supports them.
- Accurate English `.srt` subtitles. Provide a captioned viewing export as well as the clean master when possible.
- A concise asset/source manifest stating which visuals are real captures, still animations, generated supporting graphics, and supplied team/award material.
- A short completion note with actual runtime, export settings, any missing authentic shot, and any substituted capture. Do not call an unrendered package a completed MP4.

The film passes only when it:

- Follows all eight storyboard scenes in order, ending with four seconds of a stable URL card.
- Gives substantial, readable attention to both the dashboard and mobile app.
- Includes GUIDE, VERIFY, REWARD, REPORT, IMPROVE, ClaimReady, estimator, coverage/authorization, mobile bill/coverage/Cora, payment review/receipt, arrangement option, discharge pass, staff clearance, claims, and analytics.
- Uses AI narration throughout, with no required human speaking segment.
- Looks clean, lively, and polished without rushing the UI or trivializing the patient story.
- Keeps actual UI artwork and financial facts accurate, with coherent account/balance continuity or clearly separated example flows.
- Preserves the storyboard’s important figures and founder details with the qualifications specified above.
- Contains no fabricated UI, illegible generated text, false live payment/SMS claims, invented integrations, or unqualified outcome guarantees.

Make the final experience feel like a thoughtful product launch: viewers understand the pain, see the real product doing meaningful work, and leave with a clear reason to explore MedCore.
