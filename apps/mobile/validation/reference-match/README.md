# MedCore reference-match validation — October 8, 2026

Implemented against all seven supplied images. The long Main montage was inspected in eight enlarged bands. The researcher measured phone-interior geometry and independently compared actual captures. The primary agent implemented, inspected the rendered changes, exercised flows and maintained the existing Brain. The code-reviewer audited findings, verified fixes and completed a final follow-up audit.

**Reviewer verdict: ready for a patient-prototype progress commit; no remaining actionable source findings.** Signed native builds, physical-device checks and existing production gates remain separate work.

## Actual screenshots and primary references

[Actual-app overview](overview.png) contains unchanged app captures at half size, with labels outside the UI. Individual full-resolution captures below are 390×844 CSS pixels unless a size suffix says otherwise. All patient/payment data is synthetic.

| Screen | Primary reference | Actual capture | Equal-width comparison |
|---|---|---|---|
| Branded preload | Auth image, first phone | [Preload](screenshots/preload.png) | [Compare](comparisons/preload.png) |
| Introduction | Auth image, third phone | [Bill](screenshots/onboarding.png), [Coverage](screenshots/onboarding-coverage.png), [Documents](screenshots/onboarding-documents.png) | [Compare](comparisons/onboarding.png) |
| Authentication | `login:register ui inspo main.png`, fourth phone | [Login](screenshots/login.png), [Register](screenshots/register.png), [Validation](screenshots/auth-validation.png) | [Compare](comparisons/login.png) |
| Home | `Bill_display_and_receipt_inspo.jpg`, left phone | [Home](screenshots/home.png), [Empty](screenshots/home-empty.png) | [Compare](comparisons/home.png) |
| Bill | `Bill_display inspo.jpg` | [Bill](screenshots/bill.png) | [Compare](comparisons/bill.png) |
| Coverage, documents, history | Main montage's sections, lists and compact headers | [Coverage](screenshots/coverage.png), [Documents](screenshots/documents.png), [Payments](screenshots/payments.png) | Shared list/header geometry follows Main |
| Amount entry | `payment input ui.png` | [Full](screenshots/payment-amount.png), [Partial](screenshots/payment-partial.png) | [Compare](comparisons/payment-amount.png) |
| Payment methods | Main payment-method screen | [Methods](screenshots/payment-methods.png) | [Compare](comparisons/payment-methods.png) |
| QR | Excluded-blue overall image's QR placement; actual dashboard rail identity/details | [QR](screenshots/payment-qr.png), [Code crop](screenshots/payment-qr-code.png) | [Compare](comparisons/payment-qr.png) |
| Payment review | Main review-summary screen | [Review](screenshots/payment-review.png), [Plan](screenshots/payment-plan-review.png) | [Compare](comparisons/payment-review.png) |
| Receipt | `Bill_display_and_receipt_inspo.jpg`, right phone | [Recorded receipt](screenshots/receipt.png), [Selected document](screenshots/selected-receipt.png) | [Compare](comparisons/receipt.png) |
| Profile | `Profile tab inspo.jpg`, AFTER | [Profile](screenshots/profile.png) | [Compare](comparisons/profile.png) |
| Confirmation sheet | Main logout bottom sheet | [Logout](screenshots/logout-sheet.png) | [Compare](comparisons/logout-sheet.png) |

Additional actual payment screens: [GCash](screenshots/wallet-gcash.png), [GCash verification](screenshots/wallet-gcash-verification.png), [Maya](screenshots/wallet-maya.png), [Maya verification](screenshots/wallet-maya-verification.png), [Card](screenshots/card-details.png), [Bank](screenshots/bank-details.png), [Plan recorded](screenshots/payment-plan-recorded.png), [Processing](screenshots/payment-processing.png), [Interrupted confirmation](screenshots/payment-recovery.png), [Rejected request](screenshots/payment-declined.png).

Dashboard inspection: [Patient portal](screenshots/dashboard-patient.png), [Actual payment modal](screenshots/dashboard-payment.png). Every `/api/` request was intercepted; the dashboard used its existing synthetic preset, and no hospital data/gateway operation occurred. The read-only role response causes the visible sync notice. Existing dashboard warnings and illustrative QR artwork are shown for inspection only and were not copied into mobile.

## Fidelity assessment and deliberate differences

Comparisons crop the phone contents and uniformly scale references to 390px width. They retain each image's aspect ratio, padding the comparison canvas instead of stretching to 844px height. Approximate OS/status/gesture removal means reference content heights differ. Do not interpret the comparison canvas's extra height as app spacing. The original auth montage has small source phones, so enlargement exposes source blur. Source crop bounds are recorded in `compare.py`; measured dimensions are raster estimates, generally ±4–8px, not exact font specifications.

- Home's overlapping balance surface is about214px tall versus the reference's≈216px; the overlap is≈114px versus≈111px. Bill's panel is153px versus≈155px. Four evenly spaced shortcut circles, the tinted summary region, centered compact headers and quiet rows reproduce the primary compositions.
- Amount entry uses78px circles at the representative viewport and≈86px row rhythm, adapting to62px circles on320px phones. The fixed tap action is64px tall; the reference has an≈78px swipe rail. Tap confirmation plus a keyboard alternative preserves accessibility and exact centavo editing. The lower keypad scrolls on compact phones; the fixed action remains reachable.
- Methods use two contiguous groups with56px rows, matching Main's≈54px list structure. MedCore retains all six backend rails; the reference has three. Review retains payer/method/balance and a dashed emphasized total, so it is shorter than the clinical booking review. Required bank/card/repayment fields remain scrollable.
- Profile retains the72px identity circle,100px identity row,≈52px rows, small section labels and group spacing. Initials replace a portrait because no patient-photo feature is supported. Account, benefits, records, privacy and logout replace unsupported settings; no dead rows were added.
- Onboarding uses an original financial-document illustration with the reference's tall arch and full-width diagonal band. The real PNG badge replaces doctors' photos. Login retains reference form/action geometry; registration needs the existing MRN/contact fields, so its content scrolls. Social sign-in and a redundant remember toggle are omitted because those controls have no supported contract.
- Navy, slate and blue come from actual dashboard tokens/rendering. Accessible teal primary emphasis adapts the references into the requested green-to-blue system. Purple/orange/bright-cyan palettes and proprietary assets were not copied. Provider identity remains recognizable. Native system fonts follow the dashboard's system fallback; the screenshot font family is not verifiable.
- Receipt retains navy context, paper width, modest confirmation, real facility/reference, dashed separators, aligned rows, emphasized total and bottom actions. Its actual fields and natural “Recorded” status replace fictional merchant/destination data. Decorative top edges use the surrounding surface color when reused in white record details.
- QR retains the dashboard's method/amount context and required payer field. The code uses the existing prototype payload and sharp black modules with six quiet modules; code pixels/quiet zones take precedence over matching a decorative QR graphic. No new merchant, contact-transfer flow or backend QR contract was introduced.

## Verified flows and checks

All required mobile commands passed on the final source:

- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:server`
- `npm test`: **39 checks** including keypad centavos, startup routing/session bypass, onboarding persistence/storage failure, confirmation validation, encrypted immutable recovery, idempotency and account boundaries.
- `npm run test:server`: **18 isolated groups**, including ownership, production simulation gates, encounter locking, duplicate protection and centavo reconciliation; no database connection.
- Expo `export --platform all`: iOS, Android and web bundles passed. Validation used `EXPO_NO_DOTENV=1` and an inert HTTPS configuration; no `.env` file or release API address was changed. Export directory: `/private/tmp/medcore-reference-export-final`.
- Root `npm test`: **250 financial records reconciled with zero errors**.
- `npm run test:qr`: **12 independent macOS Vision decodes** at135/180/225/270px. Vision required an unsandboxed rerun because the sandbox prevented its model from loading. Both the final QR crop and full-screen capture independently decoded to the unchanged supported prototype payload.
- Scoped `git diff --check`: passed. The independent reviewer reran lint,39 checks,12 QR decodes and diff-check.

[Flow results](flow-results.json) verify introduction resume/Back/completion/relaunch, duplicate-click locking, identical request key/body after an interrupted confirmation, confirmed receipt/selected document identity, definitive rejection/retry, every supported rail, confirmed payment-plan schedule and actual logout. [State results](states-results.json) verify document loading/error/retry, balance refresh recovery preserving input, compact-keypad scrolling, honest empty accounts and long-text wrapping. Both have `pageErrors: []`.

Viewport evidence: [320px login](screenshots/login-320.png), [320px Home](screenshots/home-320.png), [320px amount](screenshots/amount-320.png), [320px keypad scrolled](screenshots/amount-320-scrolled.png), [430px Home](screenshots/home-430.png), [430px amount](screenshots/amount-430.png), [Long Profile](screenshots/profile-long-text.png), [Long Home](screenshots/home-long-text.png), [150% Profile text](screenshots/profile-text-150.png), [150% amount text](screenshots/amount-text-150.png). Text magnification is a CSS approximation, not native font-scale certification. Larger text/compact screens require scrolling rather than clipping financial details. Labels, radio/checkbox states, password visibility, keyboard alternatives and reduced-motion behavior remain present in source. Amount toggle text contrast is6.34–7.37:1.

Preload capture held only the actual preference promise in the isolated test harness until PNG assets loaded. App initialization has no added delay. The harness hides only Expo's observed `.__expo_fast_refresh` development chrome; it does not alter app content. Restored native sessions and session-verification failures have source/logic regression coverage; web deliberately uses memory-only session/payment recovery.

## Reproduce

Use existing project dependencies and an isolated Playwright install; no mobile dependency was added. In separate terminals from project root:

```sh
node apps/mobile/validation/reference-match/fixture.mjs
```

```sh
cd apps/mobile && EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8901 npm run web -- --port 8084
```

```sh
npm install --prefix /private/tmp/medcore-visual-tools playwright-core
node apps/mobile/validation/reference-match/qa.mjs
node apps/mobile/validation/reference-match/qa.mjs --states
python3 apps/mobile/validation/reference-match/compare.py
```

`PLAYWRIGHT_MODULE` and `PLAYWRIGHT_BROWSER_PATH` can point to another installed Playwright module/Chromium browser. Browser defaults to the existing macOS Brave executable. Comparisons require Pillow and the included macOS font path. The main suite resets only the loopback fixture; run suites sequentially. For dashboard inspection, run `npm run dev:client -- --port 5174`, then `node apps/mobile/validation/reference-match/qa.mjs --dashboard`.

## Remaining concrete limits

Physical iOS/Android testing is still required for SecureStore restoration/restart/logout failures, native keyboards, safe areas, dynamic text sizes, reduced motion and screen-reader behavior. Expo exports are bundles, not signed builds. Real PostgreSQL concurrency, provider gateway confirmation, identity/OTP/abuse controls, legal signing and existing dependency/EAS release work are unchanged gates. The decodable prototype QR is not a real payment destination. No commit/deployment/schema change/reseeding was performed. Separate user branding work was committed during this pass. Current mobile wordmark/root favicon edits and original untracked UI_INSPO uploads are preserved and excluded from the proposed progress commit.
