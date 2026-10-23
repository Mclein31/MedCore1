# MedCore — "Clear the Way for Care" — Prototype Demonstration Script V4

Updated 2026-10-22, rev. B: every shot now matches the final recordings in `../footage/` (dashboard re-shot, iPhone shot on a Release build). Replaces the V3 narration (`docs/media/MEDCORE_AI_VOICEOVER_SCRIPT.txt`, now archived).

**Story thread in the footage:** the product scenes follow one fictional patient, **Grace Reyes** (Room 404, PhilCare HMO). Her bill is ₱21,700 gross − ₱13,000 PhilHealth − ₱5,000 PhilCare = **₱3,700** to pay. The hospital sees her on the dashboard (S5, S8), and her family sees the same bill, asks Cora, pays and gets the exit pass on the phone (S5, S9).

**Structure rule:** every pain point is immediately answered by the screen that solves it. Pain → Fix → Proof, five times.

Competition checklist (prototype video, 3–5 min): Problem statement ✔ S1–S3 · Proposed solution ✔ S4 · Functional prototype ✔ S4–S10 (≈2:50 of real UI, 58 % of runtime) · Target users / market ✔ S12 · Existing solutions ✔ S12 · Team ✔ S13 · Traction ✔ S14.

## Direction in one paragraph

The film is in two moods. **Pain** (S1–S3, and the 1.5-second pain cards before each fix) is cool, tight and slightly uncomfortable: a low pulse, ticking clock, desaturated navy and a warm red accent (`#E5484D`) used only for problem numbers. **Solution** (S4 onward) opens up: bright `#F5F6F8` canvas, teal accent (`#11806D`), driving four-on-the-floor music at 120 BPM, with the real product shown large in a **desktop frame** (dashboard) and an **iPhone 17 Pro frame** (mobile). Transitions are medium-fast slides of 380–450 ms with an expo-out ease (`cubic-bezier(0.16, 1, 0.3, 1)`). Shots last 3–6 s and are never longer than 8 s without visible motion. In the product recordings a visible cursor travels to every target (520 ms ease-in-out) before each click. On the iPhone that cursor is a touch dot.

## Cast (see `../characters/CHARACTERS.md`)

- **Tatay Ramon** (68): senior citizen, PhilHealth member for 39 years, with a private HMO.
- **Mara** (35): his daughter and the family's guarantor. She carries the folder of papers.
- **Lina** (31): billing officer. She is overworked, not the villain; she is stuck too.

---

## ACT I — THE PAIN

### S1 · Cold open: "Not for care. For the bill." · 00:00–00:14 (14 s)

| Time | Visual | On-screen text | Sound |
|---|---|---|---|
| 00:00 | Black. A wall clock fades up, its second hand ticking. | — | Clock tick (dry, close), low sub drone |
| 00:02 | Slide right → illustration: Ramon dressed and sitting on a made hospital bed, bag packed. | `Discharge order · 8:02 AM` (slides in from left) | Whoosh-in |
| 00:06 | Clock hands spin fast (time-lapse, 2 s), the room light shifts from morning to afternoon. | Counter rolls `8:02 → 4:12 PM` | Rising tick roll, whoosh |
| 00:09 | Mara at the billing window, Lina on the phone behind the glass. | `Still waiting.` | Tick stops. Hard cut to near-silence |
| 00:12 | Title punches in. | **The care was done. The bill wasn't.** | Low boom + paper flick |

**VO:** "The doctor said Tatay could go home at eight in the morning. At four in the afternoon, we were still waiting. Not for care. For the bill."

### S2 · The family story · 00:14–00:44 (30 s)

| Time | Visual | On-screen text | Sound |
|---|---|---|---|
| 00:14 | Ramon and Mara on the bench (`characters/waiting.png`), slow 1.04× push-in. Two coverage cards slide in from the right. | `PhilHealth · 39 years` / `Private HMO` | Card pop ×2 |
| 00:20 | Bill paper slides up from the bottom. | `Quoted bill ₱36,500` | Paper slide |
| 00:24 | Mara reads the bill (`question.png`). A red number stamps in. | `"Your share": ₱8,300` (red) | Stamp thud |
| 00:28 | Montage, 1 s each, sliding left: Lina on the phone with the HMO · a calculator · a stack of forms · Mara asking again. | `Ask. Wait. Ask again.` | Phone ring, calculator clicks, paper (fast, layered) |
| 00:34 | Review (`review.png`). The ₱8,300 strikes through and ₱1,300 slides in teal. | `After manual review: ₱1,300` | Strike swipe → soft positive pluck |
| 00:39 | Hold on Mara's relieved but tired face. | **The coverage was there. The explanation wasn't.** | Music drops out |

**VO:** "Tatay Ramon had paid into PhilHealth for thirty-nine years. He also had a private HMO. The quoted bill: thirty-six thousand five hundred pesos. The share we were told to pay: eight thousand three hundred. It took hours of asking, waiting, and asking again before a manual review brought it down to one thousand three hundred. The coverage was there all along. What was missing was the explanation."

> Source: founder-reported family experience, illustrated with fictional characters. ₱36,500 / ₱8,300 / ₱1,300 are the founder's figures. Times in S1 are illustrative and sit inside the researched 4–8+ hour range.

### S3 · It isn't one family: the five pain points · 00:44–01:14 (30 s)

A fast **pain map**: five cards slide in from the right, one every ~4.5 s, and stack into a column. Each card has a red stat, a short label and a Solar icon. Every card stays on screen, so by 01:07 all five are visible.

| Time | Card | Stat (red) | Source | Sound |
|---|---|---|---|---|
| 00:44 | **1 · "Why do I owe this much?"** Bills nobody can explain | **42.7 %** of health spending is paid out of pocket | PSA 2024 | Whoosh + pop |
| 00:49 | **2 · Approvals lost between portals** HMO LOAs by portal, phone, fax | **+33.8 %** Insurance Commission complaints against HMOs | IC 2022→2023 | Whoosh + pop |
| 00:54 | **3 · Claims sent back** missing CF4 details, coding mismatches | **15–20 %** of private-hospital claims returned (RTH); **₱4–10 B** delayed, returned or denied (2023–24) | PHAPi | Whoosh + pop |
| 00:59 | **4 · Hours to leave** clearance runs desk to desk | **4–8+ hours** discharge in private tertiary hospitals | Researched baseline (`.brain/NOTES.md` §2) | Whoosh + pop |
| 01:03 | **5 · The cashier queue** pay in person before you can leave | **1 window**, cash or card, at the end of an 8-hour day | Founder experience | Whoosh + pop |
| 01:07 | The five cards collapse into one line, and the title slides up. | **Five pain points. One root cause: nobody can see the money clearly.** | Riser starts |

**VO:** "And it isn't one family. Filipino households still pay over forty percent of health costs out of pocket. HMO approvals are scattered across portals and phone calls. Up to one in five claims is returned to the hospital. Discharge can take four to eight hours. And at the very end, families still line up at a cashier. Five pain points, one root cause: nobody can see the money clearly."

---

## ACT II — THE SOLUTION

### S4 · Meet MedCore · 01:14–01:30 (16 s)

| Time | Visual | On-screen text | Sound |
|---|---|---|---|
| 01:14 | The riser peaks. White flash wipe, then the MedCore badge scales from 0.9 to 1.0 with a light ring pulse. | **MedCore** | Impact + music drop (120 BPM groove starts) |
| 01:16 | The desktop frame slides in from the left (`dash-overview`, first 3 s) and the iPhone frame from the right (`mob-bill`, first 2 s: Grace's Home). Both settle at the same time. | `For the hospital` · `For the family` | Double whoosh, soft land |
| 01:20 | Diagram, built left to right: `Hospital systems (BizBox · Medsys · Comlogik)` → **MedCore ledger** → `PhilHealth` · `HMOs` · `Patient's phone`. | `One explainable ledger, to the centavo` | Three ticks on the beat |
| 01:26 | Small badge: | `AI explains and drafts. It never computes the money.` | Soft chime |

**VO:** "So we built MedCore: a financial clarity layer on top of the hospital systems already in place. It connects charges, PhilHealth, HMOs, and the patient's phone in one explainable ledger, calculated to the centavo. AI explains and drafts. It never decides the money."

---
## ACT III — PAIN → FIX (the working prototype)

Every segment follows the same grammar:

1. **Pain card** (1.5 s): navy slab slides in from the right, showing the red pain number and its quote. Sound: short whoosh plus a low thud.
2. **Fix** (most of the segment): the pain card slides off to the left as the device frame slides in. The real recording plays, a cursor or touch dot moves to each target, and every click makes a click sound.
3. **Proof chip** (last 2 s): a teal chip pops in at the bottom-left with the result. Sound: bright pop or pluck.

Clip names refer to `../footage/` (recordings) and `../screenshots/` (stills).

### S5 · Pain 1 → A bill anyone can follow · 01:30–02:08 (38 s)

| Time | Frame | Action (recorded) | On-screen text | Sound |
|---|---|---|---|---|
| 01:30 | Pain card | — | **1 · "Why do I owe this much?"** | Whoosh + thud |
| 01:31.5 | Desktop | `dash-ledger`: the universal search types **Grace Reyes** → her encounter opens → tab **Itemized Charges & Waterfall** | `Statutory waterfall, applied in legal order` | Typing ticks, click, panel slide |
| 01:38 | Desktop (zoom 1.4× on the formula bar) | The cursor walks the formula: **Gross ₱21,700 − PhilHealth ₱13,000 − HMO ₱5,000 − Relief ₱0 = ₱3,700**, then the cards below (Room diff · Excluded sundry ₱350 · Excess PF) | Each term lights as the cursor reaches it | Tick per term on the beat |
| 01:45 | iPhone slides in from the right; the desktop slides out to the left | `mob-bill`: Home (₱3,700 balance) → tap **Bill** → **Your bill breakdown**: Total ₱21,700 · VAT exemption · Senior/PWD · PhilHealth −₱13,000 · HMO −₱5,000 · **Remaining ₱3,700** → scrolls on to the itemized categories | `Same ledger. On the family's phone.` | Tap, whoosh |
| 01:53 | iPhone | `mob-cora`: tap the Cora mascot on Home → the chat opens in Taglish → tap **Ilokano** (the greeting switches) → the question types out: *"Apay nga adda pay nabati a balance?"* → typing dots → Cora's answer, with **Kitaen ti bill** shortcuts | `Cora · English · Taglish · Tagalog · Ilokano` (no subtitles; the VO carries the meaning) | Tap, soft keyboard clicks, typing-dots blip, answer chime |
| 02:02 | iPhone | `mob-question`: Bill → **Medicines** → **IV fluids** line opens its share (Charged ₱1,700 · PhilHealth ₱1,035.13 · HMO ₱398.13 · **Your share ₱266.74**) → **Question this charge** → the sheet slides up → **Wrong quantity** → Cancel (nothing is sent) | `Every line shows who pays what` · `Question a charge in two taps` | Tap, sheet swoosh, tap |
| 02:06 | Proof chip | — | ✔ **Every peso explained** | Bright pop |

**VO:** "Pain one: nobody can explain the bill. In MedCore, every encounter has a live ledger. VAT exemption, senior and PWD discounts, PhilHealth case rates and HMO approvals are applied in legal order, so the patient's share is never a guess. The same ledger reaches the family's phone, itemized and in plain language. Still confused? Cora, our AI assistant, explains their own bill in English, Taglish, Tagalog, or Ilokano. And if a charge looks wrong, they can question it in two taps."

### S6 · Pain 2 → One roster for every HMO · 02:08–02:32 (24 s)

| Time | Frame | Action (recorded) | On-screen text | Sound |
|---|---|---|---|---|
| 02:08 | Pain card | — | **2 · Approvals lost between portals** | Whoosh + thud |
| 02:09.5 | Desktop (zoom 1.2× on the roster table) | `dash-hmo`: **Approvals & Disputes** → tab **HMO Gateway Roster** → one table of every inpatient by PhilHealth benefit, HMO policy, LOA reference and status (Grace Reyes: PhilCare LOA ₱5,000 **Approved**; others *Pending carrier code*) → scrolls | `Every LOA, one roster` | Click, list cascade (soft ticks) |
| 02:17 | Desktop | `dash-appeal`: tab **Disputes & Promissory** → **Draft Appeal** on a disputed IV-fluids charge (₱1,700, *"I only received one IV bag, not two"*) → the AI letter appears on letterhead with reference number, physician and response deadline → scrolls to the itemized dispute | `AI-drafted appeal · staff review before sending` | Click, processing shimmer, paper-out swoosh |
| 02:30 | Proof chip | — | ✔ **From scattered portals to one worklist** | Pop |

**VO:** "Pain two: HMO approvals scattered across portals and phone calls. MedCore puts every pending letter of authorization into one roster, by carrier and status. And when an HMO disputes a charge, AI drafts the appeal letter from the recorded facts, for staff to review and send."

### S7 · Pain 3 → Claims that go out right the first time · 02:32–02:54 (22 s)

| Time | Frame | Action (recorded) | On-screen text | Sound |
|---|---|---|---|---|
| 02:32 | Pain card | — | **3 · Claims sent back (15–20 % RTH)** | Whoosh + thud |
| 02:33.5 | Desktop | `dash-claims`: **Claims & eSOA XML** → the pre-flight worklist (CF4 integrity and RTH risk per claim) → **AI Scrub** on a community-acquired pneumonia claim (J18.9) → *PhilHealth eClaims 3.0 Clinical Forensic Scrubber* opens and audits (≈10 s of loading in the raw clip: cut to 1.5 s of the scan) | `ClaimReady pre-flight` · `Every claim scored` | Click, scan sweep |
| 02:39 | Desktop (zoom 1.3× on the score) | **RTH Risk Score: CRITICAL (50 %)** · *Action required* | `Caught before submission` | Alarm blip (soft), pop |
| 02:43 | Desktop (zoom on findings) | Finding: *Diagnostic discrepancy: the primary RVS surgical code holds the ICD-10 value J18.9*, with a remediation and a ready-to-copy **chart addendum for the attending physician** | `Exact fix, not just a flag` | Ticks |
| 02:52 | Proof chip | — | ✔ **Target: RTH under 2 %** | Pop |

**VO:** "Pain three: returned claims. Before anything is submitted, ClaimReady scores every claim for return risk. Here, the AI audit catches a coding mismatch, explains the fix, and drafts the note for the doctor, while it is still easy to fix."

### S8 · Pain 4 → See every discharge, stage by stage · 02:54–03:22 (28 s)

| Time | Frame | Action (recorded) | On-screen text | Sound |
|---|---|---|---|---|
| 02:54 | Pain card | — | **4 · Hours to leave (4–8+ h)** | Whoosh + thud, one clock tick |
| 02:55.5 | Desktop | `dash-clearance`: **Discharge Clearance** → **6-Stage Pipeline**: *1 MGH Declared · 2 Doctor PF · 3 Pharmacy RTS · 4 HMO eLOA · 5 Settlement · 6 Gate Pass*, each card with its live minutes (4–28 min) | Stage names highlight in sequence · `Target: under 45 min` | Click, six quick ticks on the beat |
| 03:03 | Desktop (zoom 1.4× on column 4) | The one red card: **Ramon Santos**, waiting on the HMO's final LOA for 72 min. The breach is flagged the moment it happens | `Breach flagged: HMO final LOA` | Low alarm blip |
| 03:08 | Desktop | **Master / Detail Queue** → click **Grace Reyes** → milestone bar at *Step 5 of 6: Patient Settlement*, blocker card **Patient out-of-pocket balance: ₱3,700**, turnaround clock *29 of 45 min* | `Who is blocked, and why` | Click, panel slide, tick |
| 03:20 | Proof chip | — | ✔ **Target: discharge under 45 minutes** | Pop |

**VO:** "Pain four: the long wait to leave. The Discharge Clearance board tracks every patient through six stages, from the discharge order to the gate pass, with live timers. A late HMO approval is flagged the moment it breaches, and staff see exactly who is blocked and why, down to the last balance to settle."

### S9 · Pain 5 → Pay and leave from the phone · 03:22–03:52 (30 s)

| Time | Frame | Action (recorded) | On-screen text | Sound |
|---|---|---|---|---|
| 03:22 | Pain card | — | **5 · The cashier queue** | Whoosh + thud |
| 03:23.5 | iPhone | `mob-pay`: Home → **Pay balance** → *Full settlement* ₱3,700 → **Continue to payment method** → the method list (GCash · Maya · QR Ph · Debit / Credit · Bank Transfer · RA 9439 Note) | `Pay from anywhere` | Tap, list cascade |
| 03:29 | iPhone | **QR Ph** → the payment QR (labelled *Demonstration QR only*) → **Review payment** → **Confirm payment · ₱3,700** → **Payment Successful** → **View Receipt** (official receipt OR-2026-000010, *Paid*) | `Instant receipt` | Tap, confirm, success chime ("ka-ching" lite) |
| 03:37 | iPhone | `mob-plan` (cut in from its method list, ≈0:06): **RA 9439 Note** → *0 % interest* schedule; the term flips 3 → 12 → 6 months (₱1,233.33 · ₱308.33 · ₱616.66 a month), total repayment stays ₱3,700 | `Can't pay in full? 0 % promissory note (RA 9439)` | Tap, schedule rows tick |
| 03:44 | iPhone | `mob-pass`: Home now reads **Cleared to leave** → **View discharge pass** → **Discharge pass** → the QR and private **Exit PIN**, *Ready for lobby verification* | `Digital exit pass · QR + private PIN` | Shimmer, soft "unlock" |
| 03:50 | Proof chip | — | ✔ **No queue between the family and the door** | Pop |

**VO:** "Pain five: the cashier queue. Families pay from their phone, with GCash, Maya, card, bank transfer, or QR Ph, and get a receipt on the spot. Can't pay in full? A zero-interest promissory note, as the anti-detention law allows. And once every stage is cleared, the exit pass is already on their phone."

### S10 · For hospital leaders · 03:52–04:04 (12 s)

| Time | Frame | Action (recorded) | On-screen text | Sound |
|---|---|---|---|---|
| 03:52 | Desktop | `dash-overview` (second half): **Expand** the Executive RCM briefing → *Avg discharge TAT 23 m / 45 m SLA* · *Trapped capital ₱21,573.45* · *Primary bottleneck: HMO_FINAL_LOA* → the narrative and ranked recommendations scroll | `AI executive briefing` | Click, shimmer, reveal |
| 03:57 | Desktop | `dash-analytics`: **RCM Analytics** KPIs (gross billings, days in AR, clean-claim rate, revenue recovered) → scrolls to the multi-payer financing waterfall | `Where money and time get stuck` | Scroll ticks |
| 04:02 | Proof chip | — | ✔ **Problems seen daily, not at month-end** | Pop |

**VO:** "And for hospital leaders, RCM analytics and an AI executive briefing show where money and time get stuck, every single day."

---
## ACT IV — WHY IT MATTERS, WHO IT'S FOR, WHO WE ARE

### S11 · Before / After · 04:04–04:14 (10 s)

Split screen. On the left, a **Before** column in navy with red numbers; on the right, an **After** column in white with teal. Each row flips left to right on the beat, 1.2 s apart.

| Before | After (MedCore) |
|---|---|
| "Why do I owe this much?" | Every peso explained, on the phone and in their language |
| Portals, calls, faxes | One HMO roster plus AI-drafted appeals |
| 15–20 % claims returned | Pre-flight audit · target under 2 % |
| 4–8+ hours to leave | Six visible stages · **target under 45 min** |
| Cashier queue | Pay, sign a 0 % note, exit pass on the phone |

**VO:** "Five pain points. Five fixes. From an eight-hour wait to a target of under forty-five minutes, and from guesswork to a bill you can follow."
**Sound:** a card flip on each row, and the music lifts to its full chorus.

### S12 · Users, market, existing solutions · 04:14–04:28 (14 s)

| Time | Visual | On-screen text |
|---|---|---|
| 04:14 | Three user cards slide up together. | `Patients & families` · `Billing & claims teams` · `Hospital leaders` |
| 04:19 | Market bars grow in. | `TAM ₱4.564 B · 1,260 hospitals` · `SAM ₱2.738 B · 454` · `SOM ≈ ₱1.35 B` · first regions: NCR · Calabarzon · Cebu · Cagayan Valley |
| 04:23 | Positioning quadrant: legacy ERPs (BizBox, Comlogik, Medsys) sit at low patient UX, HMO switches (MediLink) at low inpatient depth, and **MedCore** alone at top-right. | `We don't replace hospital systems. We make them clear.` |

**VO:** "Built for families, billing and claims teams, and hospital leaders, starting in NCR, Calabarzon, Cebu, and Cagayan Valley. BizBox and Medsys run the hospital. MedCore adds the clarity they are missing."

### S13 · Team · 04:28–04:37 (9 s)

The six real portraits (`docs/media/assets/team/`) slide in staggered (80 ms apart), each with name and role. The order and names come from `assets/team/manifest.json`. These are still photographs; no face animation.

**VO:** "We are three student developers, guided by our coach, our college dean, and a hospital administrator who lives this problem every day."

### S14 · Traction and close · 04:37–04:50 (13 s)

| Time | Visual | On-screen text | Sound |
|---|---|---|---|
| 04:37 | Three photos from the event (pitch, certificates, team) pop in as prints | **Pitch Perfect Award · DTI Youth Entrepreneurship Program, Be Your Own Boss · May 2026** (the certificate's title; the VO says "Best Pitch") | Pop ×3 |
| 04:40 | Map pin drops on Cagayan Valley | `Next: pilot in Cagayan Valley` | Pin drop |
| 04:43 | Callback: Ramon and Mara walking out of the hospital doors in daylight (new illustration). The phone in Mara's hand shows the exit pass. | **The care is done. Now families can go home.** | Music resolves |
| 04:47 | Logo, URL | **MedCore · Clear the Way for Care** · `med-core1.vercel.app` | Final hit + tail |

**VO:** "Best Pitch at DTI's Be Your Own Boss. Next: a pilot in Cagayan Valley. Because when the care is done, families should get to go home. MedCore. Clear the way for care."

---

## Sound design

**Music:** an engaging, modern track in two parts. It must be licensed (Artlist, Epidemic, Musicbed or similar, search *"uplifting tech corporate 120 bpm"*), or generated by the procedural fallback in `../source/audio_production.py`.

| Section | Feel | Tempo / key |
|---|---|---|
| S1–S3 Pain | Tense minimal pulse: a sub drone, ticking hi-hat, muted piano stabs, no melody | 120 BPM half-time, A minor |
| S3 → S4 | 4-bar riser (noise sweep plus snare roll) into a **drop** on the logo | — |
| S4–S11 Solution | Driving, optimistic electronic pop: four-on-the-floor kick, claps on 2 and 4, plucked synth hook, side-chained pads | 120 BPM, C major |
| S12–S14 | Same hook with a lighter arrangement, and a resolve on the final logo | — |

Music sits about −18 LUFS under the voice and ducks 6 dB while narration plays (side-chain). Final master: −14 LUFS integrated, −1 dBTP (online video).

**SFX library** (`../audio/sfx/`, synthesized by the audio script so there is no licensing risk):

| Cue | Use | Character |
|---|---|---|
| `click` | Every cursor click and tap (timestamps come from the capture logs) | Crisp mouse click, 40 ms. Tap = softer and higher |
| `whoosh` | Every slide transition (380–450 ms) | Filtered noise sweep, panned in the direction of the slide |
| `pop` | Chips, cards and badges appearing | Short sine blip with pitch drop, 90 ms |
| `thud` | Pain cards | Low sine plus noise, 180 ms |
| `tick` | Clock, waterfall rows, pipeline stages | Woodblock tick |
| `chime` | AI result, SMS, success | Two-note bell (E6 → B6) |
| `cash` | Payment success | Bright chime with a coin shimmer |
| `riser` / `impact` | S3 → S4 | 3 s noise riser plus a sub hit |
| `paper`, `stamp`, `phone` | S1–S2 story | Foley |

## Motion rules (medium-fast)

- Slide transitions: **420 ms** `cubic-bezier(0.16, 1, 0.3, 1)`, 60 px overshoot-free. The outgoing shot slides out over 360 ms with a 15 % overlap.
- Element entrances: 280 ms rise of 24 px plus fade; staggers of 70–90 ms.
- Device frames enter from the side of their surface: the **desktop from the left, the iPhone from the right**. Camera push-ins on UI go up to 1.4× over 1.2 s, then hold.
- Cursor: macOS arrow with a soft shadow. It moves for 520 ms ease-in-out, then a 60 ms press scale of 0.9 and a teal ripple on the click. On the iPhone it is a 44 px translucent touch dot.
- No shot holds still for longer than 4 s. Keep a UI result readable for at least 2.5 s.

## Frames

- **Dashboard** → a silver desktop display frame: 1600×1000 screen area, 16:10, a slim bezel, a browser chrome bar showing `med-core1.vercel.app`, and a soft floor shadow. Recorded at 1440×900 and scaled 1.11×.
- **Mobile** → an **iPhone 17 Pro** frame in Deep Blue titanium, with the Dynamic Island and a status bar. Recorded natively in the iOS Simulator at 1206×2622, so the screen pixels are the real app.

## Data and honesty notes (for the editor, not shown on screen)

- All UI shows fictional seed data (St. Jude demo facility). No real patient data.
- Payments in the recording are simulated. The narration does not claim live transfers.
- The 45-minute discharge and under-2 % RTH figures are **targets**, labelled "Target" on screen.
- AI outputs are real model responses on fictional data. The appeal is a draft for staff review.
- Discharge timings in the demo data were re-dated on 2026-10-22 so the board shows realistic minutes. Ramon Santos (HMO final LOA, 72 min) is the one deliberate breach.
- The QR Ph screen is a demonstration QR. No bank transfer is initiated.

## Clip fixes for the edit (rev. B)

These are product rough edges visible in the raw clips. Keep them off-screen with crops or trims until the app is fixed.

| Clip | What to avoid | How |
|---|---|---|
| `dash-hmo` | The payer gateway strip reads *Connection unavailable* for every carrier (preview build, not connected) | Zoom 1.2× onto the roster table; keep the strip out of frame |
| `dash-appeal` | *Reconsideration Deadline* prints a raw timestamp (`2026-10-24T12:08…Z`), and the letter is dated the admission day | Crop to the body from *RE: Reconsideration request* down |
| `dash-claims` | ≈10 s of scrubber loading | Cut to 1.5 s of the scan animation |
| `dash-overview` | ≈3 s of skeleton loading before the briefing | Trim |
| `dash-analytics` | The AR aging panel shows ₱39.0 M receivables against ₱442.8 K billings | Stop the scroll on the financing waterfall; keep AR aging out of frame |
| `dash-ledger`, `dash-clearance` | Grace's header labels her encounter number as *MRN*, and test records (*UI Port Validation Patient*, *Marco Reyes*) sit in the queue | Push in on the formula bar and the detail panel |
| `mob-pass` | *View discharge pass* opens the Documents list first | Cut from the Documents list straight to the pass (≈1 s saved) |
| `mob-cora` | ≈25 s of typing dots while the model answers (free-tier Gemini) | Trim to 1.5 s of dots |
