# MedCore product video — V4 production package

Rebuilt 2026-10-22 around one idea: **every pain point is answered on screen by the feature that fixes it.** The V3 package (4:50 "Clear the Way for Care", 18 legacy clips, old renders) is preserved in `../archive/production-v3-2026-10-14/`.

Status (2026-10-24): the cut is **4:30** with the new male narrator (S3–S14) and the motion and type pass; see `.brain/CHANGELOG.md`. Earlier status (2026-10-23): the compositor is built and the full 4:50 cut renders to `render/medcore-v4.mp4` (1920×1080, 30 fps, H.264, −14 LUFS). Two inputs are still temporary and swap in without code changes:

- **Illustrations:** `s1-ready-bed`, `s1-window`, `s2-lina-overload` and `s14-going-home` fall back to crops of the existing art. `source/illustrations.py` generates them once the Gemini key has image quota (the free tier has none on any image model).

## Contents

| Path | What it is |
|---|---|
| `script/MEDCORE_SCRIPT_V4.md` | **Master script**: 14 scenes, 4:50. Shot-by-shot visuals, on-screen text, narration, SFX, motion rules, frames, honesty notes |
| `script/narration.txt` | Voice-only read with pronunciation notes (generated) |
| `script/narration-cues.csv` | Scene timing, word counts, words/second check (generated) |
| `storyboard/STORYBOARD.md` · `contact-sheet.jpg` · `frames/` | 30 storyboard frames built from real captures in the desktop and iPhone frames (generated) |
| `characters/CHARACTERS.md` | V4 cast (Tatay Ramon, Mara, Lina), locked looks, and the four new illustrations still to generate |
| `screenshots/dashboard/` | 13 new 2880×1800 captures of the current dashboard (fictional St. Jude demo data) |
| `footage/dashboard/*.mp4` · `clicks.json` | 7 recorded dashboard clips (1920×1200, 30 fps) with a visible cursor and click ripple, re-shot 2026-10-22 after a full dry run. `clicks.json` gives each click's time and position for the click SFX |
| `footage/mobile/*.mp4` | Native iPhone clips (see "Mobile capture") |
| `audio/sfx/` | 13 synthesized effects: click, tap, whoosh, pop, thud, tick, chime, cash, riser, impact, paper, stamp, phone |
| `audio/music-bed.wav` · `preview-drop-0058-0138.mp3` | Original 120 BPM bed: tense half-time under the pain acts, a riser, then a driving four-on-the-floor drop on the logo at 01:14 |

## Story structure (4:50)

| Act | Scenes | Time | Job |
|---|---|---|---|
| I · Pain | S1 cold open → S2 family story → S3 five pain points with stats | 0:00–1:14 | Make the problem felt (personal), then show its scale (national) |
| II · Solution | S4 MedCore reveal | 1:14–1:30 | One explainable ledger between hospital, payers and family |
| III · Pain → Fix | S5–S9 one segment per pain point, S10 leaders | 1:30–4:04 | 2:34 of the real dashboard and iPhone UI. Every segment = pain card → working feature → proof chip |
| IV · Close | S11 before/after → S12 users/market/competition → S13 team → S14 traction | 4:04–4:50 | Competition checklist items |

## Regenerate

From the repo root:

```bash
python3 docs/media/production/source/build_narration.py   # after editing the script
python3 docs/media/production/source/storyboard.py         # frames + contact sheet + STORYBOARD.md
python3 docs/media/production/source/audio_production.py --sfx --music
python3 docs/media/production/source/compose.py            # full film → render/medcore-v4.mp4 (about 10 min)
# dashboard recordings: API on 8788 with STAFF_MFA_REQUIRED=false (local fictional DB only), web on 5174
PLAYWRIGHT_CORE=<path to playwright-core/index.mjs> node docs/media/production/source/capture-dashboard.mjs [--only=dash-ledger]
```

The capture signs in as a disposable local staff account, `film.capture@stjude.example.test` ("Lina Santos", `medcore_v2_dev` only). It was deleted after filming on 2026-10-22. To re-shoot, recreate it, and delete it (with its `sessions` rows) afterwards:
`psql -d medcore_v2_dev -c "insert into staff_users (facility_id,email,full_name,role,title,password_hash,password_changed_at) select facility_id,'film.capture@stjude.example.test','Lina Santos',role,'Billing & Clearance Lead',password_hash,now() from staff_users where email='cfo@stjude.example.test'"`.

| Source file | Role |
|---|---|
| `source/frames.py` | Desktop display and iPhone 17 Pro frames, shared by the storyboard and the final compositor |
| `source/cursor.js` | Injected cursor (520 ms glide, press scale, teal ripple) |
| `source/fonts/` | Film type palette (SIL OFL, licences included): Bricolage Grotesque display/condensed/semibold, Instrument Serif (upright), JetBrains Mono, and Material Symbols icons (Apache 2.0; `storyboard.icon()`). Picked per role with `face=` in `storyboard.text` and `chip`; Avenir Next stays for body text |
| `source/compose.py` | Film driver: assembles the timeline (checks every scene start against the cue sheet), renders frames with 420 ms slide transitions, then mixes and masters. `--still 95.5` renders one frame to `render/stills/`; `--audio` re-mixes only |
| `source/compose_lib.py` · `compose_shots.py` | Clip readers with trims and speed changes, device chrome, camera push-ins, touch dots, shot types. `Overlay` is a static text box with a short fade/rise entrance (text never bounces or floats) |
| `source/compose_act1.py` · `compose_act3.py` · `compose_act4.py` | The shot lists for S1–S4, S5–S10 and S11–S14. Act III segments apply the "Clip fixes for the edit" (gateway strip, appeal deadline and AR aging kept out of frame; scrubber, briefing and Cora loading trimmed; Documents step skipped in `mob-pass`) |
| `source/compose_audio.py` | Music bed with a −6 dB side-chain duck under the voice, per-scene voice placement, SFX from each shot's cue list and the dashboard click log, `loudnorm` to −14 LUFS / −1 dBTP |
| `source/illustrations.py` | Gemini image generation for the four new illustrations (`IMAGE_MODEL` overrides the model) |
| `source/capture-dashboard.mjs` · `dashboard-clips.mjs` | Recording engine (CDP screencast → H.264) and the clip list mapped to scenes |

## Mobile capture

`footage/mobile/*.mp4`: native iPhone 17 Pro recordings (1206×2622, `simctl io recordVideo`) of a **Release** build of the app, so there are no dev overlays. All clips follow Grace Reyes (MRN-240115) on the local fictional DB.

| Clip | Status |
|---|---|
| `mob-bill` · `mob-question` · `mob-plan` · `mob-pay` · `mob-pass` · `mob-cora` | Final (2026-10-22) |

`mob-cora` was recorded with `gemini-3.1-flash-lite` as the primary model (runtime override; `.env` unchanged) after the free-tier 3.5 Flash Lite quota ran out. Two takes were rejected first: one where the API was unavailable, and one whose Ilokano answer said the HMO's ₱5,000 made up the balance. Always read Cora's answer before accepting a take.

How it was driven: the simulator is shown in Xcode's **DeviceHub** window. Real macOS mouse and keyboard events land on the phone screen, Vision OCR locates every button by its label, and each navigation tap is verified (with a retry) so no take records a mis-tap. The Release app only accepts an HTTPS, non-localhost API, so it talks to a patient-routes-only HTTPS proxy on the Mac's LAN IP with a local CA trusted inside the simulator alone.

The capture tooling, TLS material and DB snapshot were deleted after filming (2026-10-22), along with the simulator's trusted CA (keychain reset) and the film staff account. Simulator keyboard auto-correction, spell-check and predictive text are still off from the typed Cora question.

## Suggested improvements

- **No subtitles or captions** (decided 2026-10-23). The film ships without a caption or subtitle track.
- ~~**Data polish before filming**~~: done 2026-10-22. Discharge timings were re-dated to 4–38 min, with Ramon Santos (HMO final LOA) as the single breach.
- **Senior case for the waterfall:** add a fictional senior with PhilHealth + HMO + Senior 20 % + VAT exemption, so the S5 waterfall shows every statutory step (Grace Reyes shows gross − PhilHealth − HMO only).
- **Licensed track (optional):** the procedural bed works, but a licensed 120 BPM "uplifting tech" track will sound richer. Keep the 120 BPM grid so the slide timings still land on the beat.
- **15-second cut-down:** S1 hook, S5 waterfall, S9 payment and the logo make a social teaser for the PGC event.
