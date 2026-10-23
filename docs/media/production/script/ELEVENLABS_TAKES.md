# ElevenLabs takes: what to generate in the website

Generated from `narration-cues.csv`; if the script changes, ask for this sheet to be regenerated.

## Setup (once)

1. In the ElevenLabs website, add both voices to **My Voices** from the Voice Library: search **Tala - Warm, Polished, and Scratchy** and **Neil – Calm and Articulate**.
2. Open **Text to Speech** and set: **Model** Eleven Multilingual v2 · **Stability** 50 % · **Similarity** 75 % · **Style exaggeration** 0 · **Speaker boost** on · **Speed** 1.0 unless a scene below says otherwise.
3. For each scene: pick the voice, paste the text exactly, generate, listen, and download as MP3. Save it in `docs/media/production/audio/vo/` with the file name shown (for example `S1.mp3`).

Check each take for: *MedCore* said as "Med Core", *HMO* and *PWD* spelled out letter by letter, *Ilokano* said ee-lo-KAH-no, *Tatay* said TAH-tie. If a word comes out wrong, regenerate with that word respelled phonetically in the box (for example `Ee-lo-KAH-no`). Don't change any other wording.

The **max length** is the time the scene allows. A take a little over is fine (the mixer can tighten up to about 8 %); if it's more than about 1 second over, raise **Speed** to 1.1 and regenerate.

| File | Voice | Max length | Speed |
|---|---|---|---|
| `S1.mp3` | Tala | 13.5 s | 1.0 |
| `S2.mp3` | Tala | 29.7 s | 1.0 |
| `S3.mp3` | Neil | 29.7 s | 1.0 |
| `S4.mp3` | Neil | 15.5 s | 1.1 (tight scene) |
| `S5.mp3` | Neil | 37.7 s | 1.1 (tight scene) |
| `S6.mp3` | Neil | 23.7 s | 1.0 |
| `S7.mp3` | Neil | 21.7 s | 1.0 |
| `S8.mp3` | Neil | 27.7 s | 1.0 |
| `S9.mp3` | Neil | 29.7 s | 1.0 |
| `S10.mp3` | Neil | 11.7 s | 1.0 |
| `S11.mp3` | Neil | 9.7 s | 1.0 |
| `S12.mp3` | Neil | 13.7 s | 1.1 (tight scene) |
| `S13.mp3` | Neil | 8.7 s | 1.0 |
| `S14.mp3` | Neil | 12.7 s | 1.0 |

## S1 · Cold open: "Not for care. For the bill." → `S1.mp3`

Voice: **Tala (Mara: quiet, close, personal)** · max **13.5 s**

```text
The doctor said Tatay could go home at eight in the morning. At four in the afternoon, we were still waiting. Not for care. For the bill.
```

## S2 · The family story → `S2.mp3`

Voice: **Tala (Mara: quiet, close, personal)** · max **29.7 s**

```text
Tatay Ramon had paid into PhilHealth for thirty-nine years. He also had a private HMO. The quoted bill: thirty-six thousand five hundred pesos. The share we were told to pay: eight thousand three hundred. It took hours of asking, waiting, and asking again before a manual review brought it down to one thousand three hundred. The coverage was there all along. What was missing was the explanation.
```

## S3 · It isn't one family: the five pain points → `S3.mp3`

Voice: **Neil (still quiet and serious)** · max **29.7 s**

```text
And it isn't one family. Filipino households still pay over forty percent of health costs out of pocket. HMO approvals are scattered across portals and phone calls. Up to one in five claims is returned to the hospital. Discharge can take four to eight hours. And at the very end, families still line up at a cashier. Five pain points, one root cause: nobody can see the money clearly.
```

## S4 · Meet MedCore → `S4.mp3`

Voice: **Neil (brighter, confident, never salesy)** · max **15.5 s** · Speed **1.1**

```text
So we built MedCore: a financial clarity layer on top of the hospital systems already in place. It connects charges, PhilHealth, HMOs, and the patient's phone in one explainable ledger, calculated to the centavo. AI explains and drafts. It never decides the money.
```

## S5 · Pain 1 → A bill anyone can follow → `S5.mp3`

Voice: **Neil (brighter, confident, never salesy)** · max **37.7 s** · Speed **1.1**

```text
Pain one: nobody can explain the bill. In MedCore, every encounter has a live ledger. VAT exemption, senior and PWD discounts, PhilHealth case rates and HMO approvals are applied in legal order, so the patient's share is never a guess. The same ledger reaches the family's phone, itemized and in plain language. Still confused? Cora, our AI assistant, explains their own bill in English, Taglish, Tagalog, or Ilokano. And if a charge looks wrong, they can question it in two taps.
```

## S6 · Pain 2 → One roster for every HMO → `S6.mp3`

Voice: **Neil (brighter, confident, never salesy)** · max **23.7 s**

```text
Pain two: HMO approvals scattered across portals and phone calls. MedCore puts every pending letter of authorization into one roster, by carrier and status. And when an HMO disputes a charge, AI drafts the appeal letter from the recorded facts, for staff to review and send.
```

## S7 · Pain 3 → Claims that go out right the first time → `S7.mp3`

Voice: **Neil (brighter, confident, never salesy)** · max **21.7 s**

```text
Pain three: returned claims. Before anything is submitted, ClaimReady scores every claim for return risk. Here, the AI audit catches a coding mismatch, explains the fix, and drafts the note for the doctor, while it is still easy to fix.
```

## S8 · Pain 4 → See every discharge, stage by stage → `S8.mp3`

Voice: **Neil (brighter, confident, never salesy)** · max **27.7 s**

```text
Pain four: the long wait to leave. The Discharge Clearance board tracks every patient through six stages, from the discharge order to the gate pass, with live timers. A late HMO approval is flagged the moment it breaches, and staff see exactly who is blocked and why, down to the last balance to settle.
```

## S9 · Pain 5 → Pay and leave from the phone → `S9.mp3`

Voice: **Neil (brighter, confident, never salesy)** · max **29.7 s**

```text
Pain five: the cashier queue. Families pay from their phone, with GCash, Maya, card, bank transfer, or QR Ph, and get a receipt on the spot. Can't pay in full? A zero-interest promissory note, as the anti-detention law allows. And once every stage is cleared, the exit pass is already on their phone.
```

## S10 · For hospital leaders → `S10.mp3`

Voice: **Neil (brighter, confident, never salesy)** · max **11.7 s**

```text
And for hospital leaders, RCM analytics and an AI executive briefing show where money and time get stuck, every single day.
```

## S11 · Before / After → `S11.mp3`

Voice: **Neil (brighter, confident, never salesy)** · max **9.7 s**

```text
Five pain points. Five fixes. From an eight-hour wait to a target of under forty-five minutes, and from guesswork to a bill you can follow.
```

## S12 · Users, market, existing solutions → `S12.mp3`

Voice: **Neil (brighter, confident, never salesy)** · max **13.7 s** · Speed **1.1**

```text
Built for families, billing and claims teams, and hospital leaders, starting in NCR, Calabarzon, Cebu, and Cagayan Valley. BizBox and Medsys run the hospital. MedCore adds the clarity they are missing.
```

## S13 · Team → `S13.mp3`

Voice: **Neil (brighter, confident, never salesy)** · max **8.7 s**

```text
We are three student developers, guided by our coach, our college dean, and a hospital administrator who lives this problem every day.
```

## S14 · Traction and close → `S14.mp3`

Voice: **Neil (brighter, confident, never salesy)** · max **12.7 s**

```text
Best Pitch at DTI's Be Your Own Boss. Next: a pilot in Cagayan Valley. Because when the care is done, families should get to go home. MedCore. Clear the way for care.
```
