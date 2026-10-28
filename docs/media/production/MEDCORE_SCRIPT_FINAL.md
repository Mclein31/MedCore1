# MedCore — "Clear the Way for Care" — Final Prototype Video Script

Locked 2026-10-28. The narration is rev. F, and the edit follows `EDIT_STYLE_V6.md`. Runtime is about 4:45; the new takes set the exact time. Format: 1920×1080, 30 fps.

| Requirement | Scene |
|---|---|
| Problem statement | S1–S3 |
| Proposed solution | S4 |
| Functional prototype / MVP | S4–S10 |
| Target users / market | S12 |
| Existing / competing solutions | S12 |
| Team composition | S13 |
| Traction / early adoption | S14 |

---

## ACT I — THE PAIN

### S1 · Cold open (≈10 s)
**Visual:** Black. A macro wall clock with shallow focus. Word hits cut on the beat: `8:02 AM` → `12:00 PM` → `4:12 PM`. Ramon sits dressed on a made hospital bed with his bag packed. Mara waits at the billing window. The title builds word by word.
**On screen:** `Discharge order · 8:02 AM` · `Still waiting.` · **The care was done. The bill wasn't.**
**VO (Mara):** "The doctor said Tatay could go home at eight in the morning. At four in the afternoon, we were still waiting. Not for care. For the bill."

### S2 · The family story (≈26.5 s)
**Visual:** A slow camera drift over Ramon and Mara on the bench. Two coverage cards reveal with a soft light sweep. The bill slides up and a red number stamps in. Then a word-hit montage ("Ask. Wait. Ask again."). ₱8,300 is struck through and ₱1,300 reveals in teal. Hold on Mara's tired, relieved face.
**On screen:** `PhilHealth · 39 years` · `Private HMO` · `Quoted bill ₱36,500` · `"Your share": ₱8,300` → `After manual review: ₱1,300` · **The coverage was there. The explanation wasn't.**
**VO (Mara):** "Tatay Ramon had paid into PhilHealth for thirty-nine years. He also had a private HMO. The quoted bill: thirty-six thousand five hundred pesos. The share we were told to pay: eight thousand three hundred. It took hours of asking, waiting, and asking again before a manual review brought it down to one thousand three hundred. The coverage was there all along. What was missing was the explanation."

### S3 · Five pain points (≈28 s)
**Visual:** Navy canvas. Each pain number counts up full frame in its muted accent color, then shrinks into a card in a column. The background glow shifts color with each pain. The five cards collapse into one line. Then the single dark beat: a teal horizon glow rises.
**On screen:**
1. "Why do I owe this much?" · **42.7 %** of health spending paid out of pocket (PSA 2024)
2. Approvals lost between portals · **+33.8 %** complaints against HMOs (Insurance Commission 2022→2023)
3. Claims sent back · **₱59.6 B** denied or returned, 2018–2024 (PhilHealth, House Committee on Health)
4. Hours to leave · **~4 h** average wait for HMO LOA approval alone
5. The cashier queue · **1 window**, cash or card, at the end of the day

Then: **Five pain points. One root cause: nobody can see the money clearly.**
**VO:** "And it isn't one family. Filipino households still pay over forty percent of health costs out of pocket. HMO approvals are scattered across portals and phone calls. Nearly sixty billion pesos in claims were denied or returned since 2018. HMO approval alone can take four hours. And at the very end, families still line up at a cashier. Five pain points, one root cause: nobody can see the money clearly."

---

## ACT II — THE SOLUTION

### S4 · Meet MedCore (≈24 s)
**Visual:** The music drops, a white light sweep, then the MedCore badge on deep navy with the tagline in a teal pill. Cut to the "clear sky" hero: the dashboard and the iPhone float over a calm morning sky. A word roll follows: "→ Not an HIS. → Not an EMR. → A clarity layer." Then the money-flow diagram, with icons connected by lines that draw in and teal dots flowing along them. The `LIVE` chip appears.
**On screen:** `For the hospital` · `For the family` · `Hospital systems → MedCore ledger → PhilHealth · HMOs · Patient's phone` · `One explainable ledger, to the [centavo]` · `AI explains and drafts. It never computes the money.` · `LIVE · Working prototype · fictional demo data`
**VO:** "So we built MedCore: a financial clarity layer on top of the hospital systems already in place. It connects charges, PhilHealth, HMOs, and the patient's phone in one explainable ledger, calculated to the centavo. AI explains and drafts. It never decides the money. Next: our working prototype, on demo data."

---

## ACT III — PAIN → FIX (working prototype)

Each segment has the same shape:
- a **1.2 s pain beat**, with the accent glow and the number counting up;
- a **match cut** into the real UI, opening as a split demo (line on the left, UI on the right) and then going full frame;
- callouts, pull-out stats and one macro push-in;
- a **proof pill** with a teal light sweep.

### S5 · Pain 1 → A bill anyone can follow (≈36 s)
**Visual:**
- The caret types "Why do I owe this much?".
- A match cut into the dashboard ledger: search "Grace Reyes", then her itemized waterfall.
- The waterfall terms light up along a flowing line, with the ₱3,700 pull-out stat.
- A sync beat whips to the iPhone: the same ₱3,700 and its breakdown.
- Cora's mascot. The Ilokano question and answer type on.
- A macro push-in on **Question this charge**, then the IV-fluids line (your share ₱266.74) and "Wrong quantity".
**On screen:** `Statutory waterfall, in legal order` · `Gross ₱21,700 − PhilHealth ₱13,000 − HMO ₱5,000 = ₱3,700` · `Your share: [₱3,700]` · `Same ledger. On the family's phone.` · `Cora · English · Taglish · Tagalog · Ilokano` · `Question a charge in [two taps]` · ✔ **Every peso explained**
**VO:** "Pain one: nobody can explain the bill. In MedCore, every encounter has a live ledger. VAT exemption, senior and PWD discounts, PhilHealth case rates and HMO approvals are applied in legal order, so the patient's share is never a guess. The same ledger reaches the family's phone, itemized and in plain language. Still confused? Cora, our AI assistant, explains their own bill in English, Taglish, Tagalog, or Ilokano. And if a charge looks wrong, they can question it in two taps."

### S6 · Pain 2 → One roster for every HMO (≈22 s)
**Visual:**
- The HMO Gateway Roster as a split demo, with rows landing in sequence. Grace's PhilCare LOA ₱5,000 is marked **Approved**.
- **Draft Appeal** on the disputed IV-fluids charge.
- The AI letter appears as a floating card on letterhead, with a teal light sweep.
**On screen:** `Every LOA, [one roster]` · `AI-drafted appeal · staff review before sending` · ✔ **From scattered portals to one worklist**
**VO:** "Pain two: HMO approvals scattered across portals and phone calls. MedCore puts every pending letter of authorization into one roster, by carrier and status. And when an HMO disputes a charge, AI drafts the appeal letter from the recorded facts, for staff to review and send."

### S7 · Pain 3 → Claims that go out right the first time (≈19.5 s)
**Visual:**
- The ClaimReady worklist, then a macro push-in on **AI Scrub**.
- A scan beam sweeps the claim, and a risk gauge sweeps to **CRITICAL 50 %** as a pull-out stat.
- The finding and the chart addendum for the doctor type on.
**On screen:** `Every claim [scored]` · `Caught before submission` · `Exact fix, not just a flag` · ✔ **Target: RTH under 2 %**
**VO:** "Pain three: returned claims. Before anything is submitted, ClaimReady scores every claim for return risk. Here, the AI audit catches a coding mismatch, explains the fix, and drafts the note for the doctor, while it is still easy to fix."

### S8 · Pain 4 → See every discharge, stage by stage (≈22 s)
**Visual:**
- The six-stage pipeline. Stage names light up in sequence with their live minutes.
- A push-in on the single breach: Ramon Santos, waiting 72 min on the HMO's final LOA, with a soft amber glow and no flashing.
- The Master / Detail Queue: Grace at Step 5 of 6, with a pull-out stat of **29 of 45 min** and the blocker **₱3,700 balance**.
**On screen:** `Six stages, [live timers]` · `Breach flagged: HMO final LOA` · `Who is blocked, and why` · ✔ **Target: discharge under 45 minutes**
**VO:** "Pain four: the long wait to leave. The Discharge Clearance board tracks every patient through six stages, from the discharge order to the gate pass, with live timers. A late HMO approval is flagged the moment it breaches, and staff see exactly who is blocked and why, down to the last balance to settle."

### S9 · Pain 5 → Pay and leave from the phone (≈25 s), the money moment
**Visual:**
- The three-screen hero over the clear sky: the family's iPhone on the left, the clearance board in the center, the lobby gate on the right.
- On the iPhone: Pay balance ₱3,700, then QR Ph, then **Confirm payment**, with a macro push-in. Payment Successful, then the receipt.
- A cash chime as a teal pulse runs along the line. Grace's card on the board turns green.
- A cut-in of the RA 9439 note (0 % schedule, 3 → 12 → 6 months, total ₱3,700).
- The exit pass QR and PIN on the phone. The pulse reaches the gate, which shows **Verified**.
- The music lifts.
**On screen:** `Pay from [anywhere]` · `Instant receipt` · `Interest: [0 %] · RA 9439` · `Digital exit pass · QR + private PIN` · ✔ **No queue between the family and the door**
**VO:** "Pain five: the cashier queue. Families pay from their phone, with GCash, Maya, card, bank transfer, or QR Ph, and get a receipt on the spot. Can't pay in full? A zero-interest promissory note, as the anti-detention law allows. And once every stage is cleared, the exit pass is already on their phone."

### S10 · For hospital leaders (≈10.5 s)
**Visual:**
- The RCM KPI tiles count up in a cascade, and the financing waterfall chart draws in.
- The Executive briefing expands and its narrative types on.
- The pull-out stat **₱21,573 trapped capital**, then a slow push-in.
**On screen:** `Where money and time get stuck` · `AI executive briefing` · ✔ **Problems seen daily, not at month-end**
**VO:** "And for hospital leaders, RCM analytics and an AI executive briefing show where money and time get stuck, every single day."

---

## ACT IV — WHY IT MATTERS, WHO IT'S FOR, WHO WE ARE

### S11 · Before / After (≈10 s)
**Visual:** A split screen, with navy **Before** on the left and white **After** on the right. Each row strikes the Before item and replaces it with the After item on the beat. The music reaches its full chorus.

| Before | After (MedCore) |
|---|---|
| "Why do I owe this much?" | Every peso explained, on the phone and in their language |
| Portals, calls, faxes | One HMO roster plus AI-drafted appeals |
| Claims sent back | Pre-flight audit · target under 2 % |
| Hours waiting to leave | Six visible stages · **target under 45 min** |
| Cashier queue | Pay, sign a 0 % note, exit pass on the phone |

**VO:** "Five pain points. Five fixes. From hours of waiting to a target of under forty-five minutes, and from guesswork to a bill you can follow."

### S12 · Target users, market, existing solutions (≈22 s)
**Visual:**
- A word roll of the three user cards, each with a one-line need.
- The TAM, SAM and SOM figures as nested circles that draw in, with their values counting up.
- A positioning quadrant: its axes draw in and the competitor dots land as each is named. **MedCore** lands last, top right, with a teal glow.
**On screen:**
- `Patients & families: understand and pay the bill` · `Billing & claims teams: fewer returns, less paperwork` · `Hospital leaders: faster discharge and cash flow`
- `TAM ₱4.564 B · 1,260 hospitals` · `SAM ₱2.738 B · 454` · `SOM ≈ ₱1.35 B` · `First regions: NCR · Calabarzon · Cebu · Cagayan Valley`
- `Hospital systems (BizBox · Medsys · Comlogik): run operations` · `HMO switches (MediLink): connect insurers`
- **None explains the bill to the family.** · `We don't replace hospital systems. We make them clear.`
**VO:** "MedCore serves three users: families, billing and claims teams, and hospital leaders. Our market: twelve hundred sixty Philippine hospitals, about four and a half billion pesos, starting in NCR, Calabarzon, Cebu, and Cagayan Valley. Existing tools: BizBox, Medsys, and Comlogik run the hospital. MediLink connects HMOs. None of them explains the bill to the family. MedCore works on top of them."

### S13 · Team composition (≈11 s)
**Visual:** Six real portraits in a clean row, revealed with a soft light sweep. Each name and role builds word by word underneath.
**On screen:** `The team: development · academic guidance · hospital operations`

| Portrait | Caption |
|---|---|
| McLein Jei G. Onza | Student developer |
| Micoh Jeremy C. Montenegro | Student developer |
| Marc Andre Nicolas M. Callueng | Student developer |
| Prof. Fernando M. Jaminola Jr., MIT | Coach |
| Dr. Charmie S. Calvo | College Dean, College of Information and Computing Science |
| Dr. Romiro Babaran | Hospital Administrator, Divine Mercy Wellness Center |

**VO:** "Our team: three student developers, guided by our coach, our college dean, and Doctor Romiro Babaran, a hospital administrator who lives this problem every day."

### S14 · Traction and close (≈15 s)
**Visual:**
- Three award photos as prints, with a slow drift.
- A map pin drops on Cagayan Valley with a ripple ring.
- Ramon and Mara walk out into daylight, with the exit pass on Mara's phone.
- The MedCore badge on navy with the tagline pill, on the final music hit.
**On screen:** **Pitch Perfect Award · DTI Youth Entrepreneurship Program, Be Your Own Boss · May 2026** · `Next: hospital pilot in Cagayan Valley` · **The care is done. Now families can go home.** · **MedCore · [Clear the Way for Care]**
**VO:** "It won Best Pitch at DTI's Be Your Own Boss. Next: a hospital pilot in Cagayan Valley. Because when the care is done, families should get to go home. MedCore. Clear the way for care."

---

## Honesty notes (for the editor, not shown on screen)
- All UI shows fictional St. Jude demo data. No real patient data appears.
- Payments are simulated, and the QR Ph screen is a demonstration QR.
- Under 45 minutes and RTH under 2 % are **targets**, and are labelled that way on screen.
- AI outputs are real model responses on fictional data. The appeal is a draft for staff review.
- S1–S2 are the founder's family experience, illustrated with fictional characters.
