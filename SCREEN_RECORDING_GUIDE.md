# MedCore UI screen-recording guide


## 1. Safety and capture mode

Use a dedicated synthetic/demo account and synthetic encounter data for every take. Do not record a real patient, real account, real medical record number, real contact information, production bill, or live payment credential. Close personal notifications, messaging apps, password managers, and unrelated browser tabs before recording.

The screenshots in `UI_SCREENSHOTS/` were captured with the read-only dashboard fixture and the mobile loopback fixture. The manual dashboard preview is different: Vite proxies `/api` to `127.0.0.1:8787`. The screenshot script intercepts dashboard API calls inside its own browser session; opening `http://127.0.0.1:5175` in another browser does **not** inherit those interceptions. Only record from that preview after confirming the backend and database are isolated synthetic data. The mobile fixture on port `8901` is in-memory synthetic data; its payment and note actions change only that local fixture.

The ordinary screenshot fixture still returns AI-unavailable responses. The dedicated product-film capture script has a separate opt-in path that makes genuine Gemini calls with the actual feature prompts/schemas and purpose-made synthetic inputs, then replays those responses into the actual dashboard/mobile UI. It does not connect to the database or call backend AI routes. Generated response text and exact prompts are retained in `docs/media/production/footage/ai-responses.json`; the OCR input is `synthetic-test-card.png`, visibly marked “NOT VALID.” Manually opening a local preview does not inherit the scripted responses.

To refresh the product-film recordings and five AI-result screenshots, run from the project root while the synthetic fixture (8901), dashboard preview (5175), and Expo web preview (8084) are running:

```sh
MEDCORE_CAPTURE_LIVE_AI=1 MEDCORE_FORCE_CAPTURE=1 node --env-file=.env --import tsx/esm docs/media/production/source/capture-product.mjs
```

This needs a configured Gemini key. Only `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_BACKUP_MODEL` are passed to inference; do not pass `DATABASE_URL`. The script demonstrates Cora, OCR, HMO appeal drafting, claims pre-flight, and the executive briefing with genuine model output. The appeal is an unsubmitted draft; extracted card fields require review; the claims result is an assessment, not an insurer decision. Check `footage/inventory.json` for provenance and limitations.

## 2. Save and name the original takes

Create the destination folder once:

```sh
mkdir -p UI_SCREENSHOTS/recordings
```

Keep the unedited original capture and use these descriptive names:

```text
01-dashboard-overview-and-ledger.mov
02-dashboard-clearance-pipeline.mov
03-dashboard-claims-and-analytics.mov
04-mobile-home-bill-coverage.mov
05-mobile-cora.mov
06-mobile-payment-and-receipt.mov
07-mobile-documents-and-pass.mov
```

One file per take is easier to review and replace than one long recording. Keep the original capture intact; trim or crop a duplicate during editing. Raw video can be large, so check file sizes before committing it to Git. Preserve the capture metadata and continuity notes with the selected takes.

## 3. Recording settings

Aim for **1920×1080 at 30 fps** for desktop footage. Use the app at 100% browser zoom and preserve its native layout. The six-stage pipeline needs a 1920px-wide viewport to show all columns together; the refreshed still is [`02b-discharge-pipeline.png`](UI_SCREENSHOTS/dashboard/02b-discharge-pipeline.png). Do not shrink the app until its labels or totals become difficult to read.

For iPhone footage, record the actual app screen at the device’s native resolution and aspect ratio. Keep the original dimensions; the editor can fit it inside the iPhone frame described in the V3 prompt. The current mobile stills are 390×900 browser renders, not physical-device captures. Do not stretch a phone recording to match that browser-render aspect ratio.

### macOS desktop capture

For a quick capture, open the dashboard in a clean, full-screen browser window, then press **Shift–Command–5**. Choose **Record Selected Portion** and frame the whole app content area, including the MedCore header and sidebar, while excluding browser chrome and other apps. In **Options**, choose `UI_SCREENSHOTS/recordings` as the save location and make sure the microphone is off unless narration is intentionally being recorded. Keep the pointer visible during dashboard actions; click ripples and synchronized click sounds can be added in editing as required by the V3 prompt.

If the display cannot show a 1920×1080 app area, use OBS or another trusted recorder with a 1920×1080 canvas and 30 fps. Capture the application window or a carefully framed display region. Avoid changing the application’s browser zoom to compensate for a smaller capture area.

### iPhone or Simulator capture

On an iPhone, enable Focus/Do Not Disturb, open the synthetic demo account, then start **Screen Recording** from Control Center. Leave the microphone off for clean source footage. Stop the recording when the take ends; move the resulting video into `UI_SCREENSHOTS/recordings` using Files, Photos/AirDrop, or a trusted cable transfer. Keep the full screen recording and let editing crop to the device display.

For an iOS Simulator take, use the Simulator’s **File → Record Screen** command with the intended iPhone model selected. Wait for the app to settle before each take. Do not record a browser window around the simulated phone unless the shot specifically requires that context.

## 4. How to move through each screen

Use one clear action per take. Leave about two seconds of stillness before the action, perform the real tap/click, scroll steadily through roughly one screenful at a time, pause briefly on important amounts or statuses, then hold the final state for two to three seconds. Avoid fast flicks, accidental diagonal scrolls, repeated backtracking, and pauses on loading spinners.

For dashboard takes, keep the native mouse pointer visible so it can be tracked in the edit. Move it deliberately, click once, and wait for the real result. Do not draw in a fake pointer or click effect inside the app. For mobile, use direct touch input and keep any desktop cursor outside the phone footage.

Capture the scroll and the surrounding UI context together. Do not crop off the screen title, patient context, table headers, navigation, bill total, or result being discussed. Keep the app’s real typography, colors, status labels, and controls unchanged.

## 5. Product-video shot list

Record separate takes for the following beats. The times below match the locked V3 film timeline; they are edit targets, not a request to make each raw take exactly that length.

### Scene 4 — GUIDE, VERIFY, and patient clarity (01:14–02:14)

1. **01:14–01:23 — Estimator:** In **Encounters & Ledgers**, select an available procedure and hold on its actual estimate and patient-responsibility figure.
2. **01:23–01:29 — OCR:** In mobile **Coverage → Scan Card OCR**, select the clearly invalid synthetic card and show authentic extracted fields plus the review prompt.
3. **01:29–01:36 — Recorded coverage:** Open **Approvals & Disputes → HMO Gateway Roster** and show actual recorded coverage/status. Do not imply an external payer response.
4. **01:36–01:43 — Appeal draft:** Open an eligible synthetic dispute’s AI Appeal action and review the real generated draft. Preserve draft-only status; do not imply submission or approval.
5. **01:43–01:52 — Ledger:** Show the waterfall, select one real line item, and open its existing explanation if available.
6. **01:52–02:02 — Mobile bill/coverage:** On **Home**, show the balance, open **Bill**, then **Coverage**. Pause on the actual total, deductions, and recorded benefits.
7. **02:02–02:14 — Cora:** Ask a question about the synthetic account and hold on the genuine response beside the matching balance.

### Scene 5 — Payment, clearance, ClaimReady, and analytics (02:14–03:54)

1. **02:14–02:25 — Payment options:** On mobile, open the final bill and continue to payment methods. Keep the amount and account context readable.
2. **02:25–02:36 — Review:** Choose one supported method (QR Ph is the preferred main route), review the amount, and hold on the real review screen.
3. **02:36–02:47 — Recorded result:** In a confirmed isolated synthetic payment fixture only, record processing, success, and the actual receipt. Never confirm a production payment for footage.
4. **02:47–02:56 — Receipt/history:** Show the recorded receipt and the resulting remaining balance. Do not imply the bill is zero unless the actual fixture shows zero.
5. **02:56–03:06 — Alternative plan:** If this branch is needed, record the real eligible zero-interest arrangement review and schedule as a separate alternative. Do not represent financed principal as cash collected.
6. **03:06–03:17 — Pass:** Record a real synthetic active discharge pass in mobile Documents and the corresponding staff view, if available. Do not infer medical clearance from payment alone; never invent a QR code or private PIN.
7. **03:17–03:28 — Pipeline/SMS:** In **Discharge Clearance → 6-Stage Pipeline**, establish the whole six-column board, then capture the relevant encounter/action and its actual prepared-message preview. Use the 1920px-wide layout. A prepared SMS preview does not prove a message was delivered.
8. **03:28–03:41 — ClaimReady:** In **Claims & eSOA XML**, run the synthetic claim audit and hold on the generated finding/remediation and human-review context. It is an assessment, not insurer acceptance.
9. **03:41–03:48 — Executive briefing:** Expand the genuine AI briefing and hold on its narrative/source telemetry.
10. **03:48–03:54 — Report/Improve:** Continue into actual **RCM Analytics** charts. Do not claim illustrative figures are measured outcomes.

### If recording only two scrolling takes

- **Dashboard:** Begin on Overview, scroll through the visible operational summary, then capture a separate wide take of the complete six-stage Discharge Clearance pipeline. Move slowly through a stage column only after the full board has been established. Capture Claims/eSOA and Analytics as separate takes if the film will use them.
- **Mobile:** Record Home from the balance down through the discharge journey, then Bill from total through its line-item breakdown, then Coverage. Keep each tab change and scroll real and readable. Record Cora, payment, receipt, and Documents/pass as separate action-result takes rather than hiding them inside one fast scroll.

## 6. Final review before handing off

Watch each original once from beginning to end. Confirm that:

- no real patient or account data, private notifications, credentials, or browser autofill appears;
- the screen is sharp, correctly oriented, and free from browser tabs, developer tools, or app-switcher overlays;
- scrolling is smooth and pauses leave enough time to read names, amounts, statuses, and outcomes;
- the start and end of each take include clean holds for editing;
- any described result is visibly present and comes from the actual app;
- mobile footage contains no desktop cursor; dashboard footage retains a trackable pointer;
- related staff/mobile clips use the same synthetic account and bill details whenever the edit implies a shared journey.

