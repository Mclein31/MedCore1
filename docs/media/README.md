# MedCore product-video production package

Updated October 14, 2026. Use the V3 production brief for the next video generation.

- [Narration script](MEDCORE_AI_VOICEOVER_SCRIPT.txt): spoken wording for eight scenes.
- [Narration cue sheet](MEDCORE_PRODUCT_VIDEO_NARRATION_CUES.csv): timed narration/shot cues that preserve the full 4:50 story and map all five AI features into the existing product workflow.
- [AI response evidence](production/footage/ai-responses.json): genuine Gemini outputs from the actual feature prompts/schemas using synthetic inputs only; includes Cora, OCR, HMO appeal draft, claims audit, and executive briefing.
- [Recorded source clips](production/footage/inventory.json): browser recordings of the real dashboard/mobile UI, including AI input/result scenes and the broader billing, coverage, payment, clearance, analytics, and document workflows.


## How to hand this to a video-producing AI

Upload the handoff ZIP, then supply the entire V3 production brief as the production brief. If the tool accepts individual assets instead, attach the current deck, original storyboard, competition guideline, needed UI captures, generated AI responses, logos, and team portraits. Upload the original inspiration clips separately when the tool can inspect videos; the ZIP contains visual contact sheets and reference notes, not the original clips.

The prepared assets are portable. `assets/` is beside the prompt in the ZIP. In this repository they live under `docs/media/assets/`.

## Target and what has been prepared

The production brief targets 290 seconds / 8,700 frames at 30 fps, with a 160-second dedicated functional prototype block. It explicitly requires at least 150 actual functional-demo seconds after accounting for interruptions. Current captures include genuine model-generated output from all five implemented AI features, rendered in the actual UI from synthetic-only inputs. These are source clips/screenshots, not a finished 4:50 edited film.

Prepared: the complete V3 prompt, matching narration/cues, current dashboard/mobile UI screenshots, authentic AI response evidence, screen recordings, source PDFs/guideline, inspiration contact sheets, and six named portrait copies. The original portrait files are preserved at their supplied locations.

Still required for the final film: a genuine synthetic active-pass capture, generated fictional character references/keyframes, AI voice audio, licensed/original score and effects, editing/compositing, and final video rendering. The downstream production brief covers these dependencies and prohibits invented UI/results.

## Confirmed team portrait filenames

The identities follow the user's explicit upload mapping, including the later correction swapping uploads 5 and 6. Roles follow page 7 of `MedCore_CagHaxx-2.pdf`.

| Upload | Name / role | Renamed project copy |
|---|---|---|
| 1 | McLein Jei G. Onza — Student | `assets/team/mclein-jei-g-onza-student.png` |
| 2 | Micoh Jeremy C. Montenegro — Student | `assets/team/micoh-jeremy-c-montenegro-student.png` |
| 3 | Marc Andre Nicolas M. Callueng — Student | `assets/team/marc-andre-nicolas-m-callueng-student.png` |
| 4 | Prof. Fernando M. Jaminola Jr., MIT — Coach | `assets/team/prof-fernando-m-jaminola-jr-coach.jpg` |
| 5 | Dr. Romiro Babaran — Hospital Administrator, Divine Mercy Wellness Center | `assets/team/dr-romiro-babaran-hospital-administrator.jpg` |
| 6 | Dr. Charmie S. Calvo — College Dean, College of Information and Computing Science | `assets/team/dr-charmie-s-calvo-college-dean.png` |

The manifest records sources, dimensions, and checksums. No face matching or image modification was used to assign identities. Photos remain unaltered; their card crops/framing happen in the eventual video edit.

## Source distinctions

- The current deck says ₱36,500 quoted bill and ₱8,300 personal amount. The older storyboard says ₱38,000 and records a later ₱1,300 review outcome. V3 uses the current quoted-bill figure and explicitly frames the later amount as part of the older founder-reported account.
- `UI_SCREENSHOTS/` contains the current 1440×1000 dashboard and 390×900 mobile browser captures, plus full-width pipeline and AI-output views. `docs/media/assets/ui/` is refreshed from that set for the portable handoff. The AI outputs use real Gemini inference on synthetic inputs; all ordinary workflow captures use the isolated in-memory fixtures.
- Older `docs/market/MedCore.pptx` contains unrelated transport-template material. V3 uses the current supplied PDF presentation instead.
- Payments and SMS remain simulated. Timing/KPI improvements and market sizes retain target/estimate labels. No verified adoption or production integration is invented.
- Team photos are now authorized for a brief composition segment near the ending. Fictional illustrated characters tell the personal story. The original all-faceless revision is superseded by these later directions.

## Verification performed on this package

Scene windows are contiguous and total 290 seconds. Narration wording matches the timed cues and standalone script. Portrait copies match their source bytes and corrected mapping. Referenced prepared image/PDF assets exist. The portable archive is checked for integrity and current prompt/script/cue contents. Audio duration and final video quality remain checks for actual production.

## Motion / devices / AI / pronunciation revision — October 13, 2026

V3 adds directed zoom-in/zoom-out/pan choreography, desktop-monitor and iPhone frames, tracked dashboard arrow cursors/click ripples, synchronized mouse/tap effects, richer licensed/original foley and background ambience, and authentic AI demonstrations integrated into the product story. It keeps the 4:50 timeline and 160-second product block.

Ilokano pronunciation directions are separated from spoken text in [pronunciation metadata](MEDCORE_NARRATION_PRONUNCIATION.json). The script uses the ordinary word. Never read syllable hints as letters; test the complete word and sentence before synthesizing the full track. Source references: [Diksiyonaryo.ph](https://diksiyonaryo.ph/word/ilokano), [Dictionary.com](https://www.dictionary.com/browse/ilocano).

This October 14 revision refreshes the capture scripts, real UI footage, AI response data, screenshots, production instructions/cues, and portable handoff. The MP4 files under `production/footage/` are source takes, not a finished V3 edit. The capture script gets authentic model outputs from synthetic inputs and injects them into actual UI components; it does not test local DB-backed routes. Do not claim a previously rendered pronunciation has been fixed until replacement audio is synthesized and checked.

## Clean presentation and SMS revision — October 13, 2026

Latest user direction removes all added notice banners/disclaimer pills, environment/simulation overlays, sample-data watermarks, and fictional-character attribution labels from the film. Implementation/source limitations stay in the separate production manifest. Payment narration now describes the receipt and balance update without an explanation of simulation.

The 03:17–03:28 clearance beat now includes SMS: “Staff follow clearance stages and prepare SMS updates. One click opens the message preview.” A tracked pointer clicks the actual SMS control, then a clean dashboard-matching notification modal shows the real prepared message. A video-only wrapper may present actual preview content without environment-status labels; no receiver-side delivery is invented. The complete interaction, exact time allocation, modal motion, sound cues, and source component are in V3. Script/cues and handoff ZIP match this revision. This edits production instructions; existing partial video/audio has not been regenerated.

Latest pointer clarification: arrows/click ripples apply to every real dashboard interaction throughout the film, not only SMS. Mobile/iPhone footage has no mouse arrow, hand cursor, or desktop pointer; in paired shots, the cursor is clipped to the dashboard screen. The actual project SMS notification now uses clean “SMS update” presentation, without environment/disclaimer footers; backend dispatch behavior and stored references stay unchanged.

Selective inspiration review: all three current clips were decoded and reviewed through timed visual frames. V3 Section 5 now selects only product-relevant treatments; no abstract grid/3D/type showcase is added. The short newer reference has its own contact sheet. Audio was extracted but not directly auditioned; soundtrack matching is not claimed. Narration/timing are unchanged by this review.
