# MedCore UI refinement — October 8, 2026

Implemented a limited refinement of the existing app. All six actual images in `apps/mobile/needs_fix` were opened and checked against the current code and rendered app. The later solid-green annotation takes precedence over the earlier gradient request. Existing startup/authentication layouts, MedCore PNG branding, patient APIs, calculations, ownership, encrypted recovery, idempotency and backend confirmation requirements remain intact.

**Independent reviewer verdict:** ready for a patient-prototype progress commit; no remaining actionable source findings. The reviewer audited the completed changes, found two issues, then re-audited the fixes: the summary action is 50px high and the white description on teal has 4.85:1 contrast.

## Every requested screenshot

| Original screenshot | Observed request and implementation | Comparison |
|---|---|---|
| [09.55.01](<../../needs_fix/Screenshot 2026-10-08 at 09.55.01.png>) | White headers with a gray separator, no duplicate top Profile control, and no navy strip above the tab bar. Reused `MedHeader` for tab and stack screens; tab scenes let the tab bar own the bottom safe area once. | [Header/footer](comparisons/01-header-footer.png) |
| [09.57.29](<../../needs_fix/Screenshot 2026-10-08 at 09.57.29.png>) | The summary showed a rectangular gradient-rendering artifact. Home now uses a solid token-based teal surface; that SVG gradient is no longer part of this card. | [Artifact removed](comparisons/02-gradient-artifact.png) |
| [10.02.32](<../../needs_fix/Screenshot 2026-10-08 at 10.02.32.png>) | Solid green balance panel with the four shortcuts in its lower area. Shared `Hero` geometry and the existing Home composition preserve the amount and integrated actions. | [Solid summary](comparisons/03-solid-summary.png) |
| [10.07.59](<../../needs_fix/Screenshot 2026-10-08 at 10.07.59.png>) | Remove “Hi, DELA!” from Bill and make its financial panel consistent. Bill now has the centered shared title and the same solid summary color, radius, padding and amount hierarchy. The ambiguous card instruction was interpreted minimally; Bill keeps its existing separate shortcut area. | [Bill](comparisons/04-bill-summary.png) |
| [10.09.57](<../../needs_fix/Screenshot 2026-10-08 at 10.09.57.png>) | Search was not visibly identifiable. Added `Search charges` inside the field, a trailing outline Search icon and a thin visible border. Existing label, hint and filtering remain. | [Control detail](comparisons/05-search-detail.png), [whole screen](comparisons/05-search.png) |
| [10.14.20](<../../needs_fix/Screenshot 2026-10-08 at 10.14.20.png>) | Disabled payment actions lacked an explanation; requested genuine provider artwork. The displayed seed account is in `HMO_FINAL_LOA`, so existing settlement restrictions are correct. Payments now states why payment is unavailable and provides active `Review bill`; Home/Bill shortcuts open Payments history while waiting. Eligible `PENDING_SETTLEMENT` accounts retain Pay. Fabricated badges were replaced with verified provider/network artwork. | [Waiting state](comparisons/06-payment-waiting.png), [methods](screenshots/after-methods.png), [card networks](screenshots/after-card-details.png) |

Original filenames all begin `Screenshot 2026-10-08 at`. Originals and annotations were preserved. `compare.py` crops only generated copies; phone bounds are visual estimates. It normalizes width to 428px without stretching image proportions. Native captures include the real OS status/safe area; browser captures do not. Scrolled reference positions and synthetic fixture values differ, so these are visual comparisons rather than pixel-equality assertions.

## Shared refinements

- **Typography:** screen titles 20/26, section headings 18/24, card titles 16/22, body 14/21 and secondary information 12/18. Most heading changes are 2px; large financial amounts and the native system font remain. Profile's quiet group labels intentionally retain their original small treatment. Weight and spacing distinguish levels without making every label bold.
- **Headers:** one 56px minimum content row, white background, gray hairline, 22px horizontal gutters, centered titles, balanced 48px action slots, 20px icons and a 42px circular Back control. The safe-area inset is added once. Native font scaling can increase the shared row consistently for two-line titles. Home intentionally places the real MedCore lockup on the left; onboarding/authentication keep their special-purpose composition.
- **Financial panels:** shared solid `#11806D`, 18px radius, 20px padding, 32px amount and readable white text. Bill retains its compact 153px panel; Home retains its 224px minimum panel with integrated actions. Payments uses the same panel language and a 50px pill action. Their functional differences are preserved.
- **Navigation:** shared 24px outline icons, 44px shortcut circles, stable 84px shortcut targets and 12px labels; selected tab labels use semibold teal. Consistent separators, neutral surfaces and grouped 12px corners connect cards and navigation. The existing five destinations and payment-step Back callbacks remain.
- **Additional polish:** consistent card-title hierarchy in expandable rows and coverage/provider details; refreshed screen backgrounds and safe-area ownership; clearer search; genuine GCash, Maya, QR Ph, Visa and Mastercard marks with contain sizing and documented [primary sources](../../assets/icons/payments/SOURCES.md). Generic card/bank/note interface icons remain where there is no identified provider. A reproduced React console warning was removed by using web `aria-hidden` versus native `accessible=false` only on the decorative amount-entry SVG; functional sibling content stays accessible.

## Actual screenshots

[Native overview](comparisons/native-overview.png): [Home](screenshots/after-native-home.png), [Bill](screenshots/after-native-bill.png), [waiting Payments](screenshots/after-native-payments-waiting.png), [Profile](screenshots/after-native-profile.png), [Documents](screenshots/after-native-documents.png). These were captured from the user's booted iPhone 14 Plus / iOS 26.5 Expo Go simulator after inspecting the screen and navigating through its controls. [Native filtered search](screenshots/after-native-search.png) demonstrates matching charges; the OS text-edit menu visible in that diagnostic capture is not app UI.

Comparable 428×926 browser before/after pairs: [Home](comparisons/before-after-home.png), [Bill](comparisons/before-after-bill.png), [Payments](comparisons/before-after-payments.png), [Profile](comparisons/before-after-profile.png), [methods](comparisons/before-after-methods.png), [search](comparisons/before-after-bill-search.png).

Other final browser screens: [Coverage](screenshots/after-coverage.png), [amount](screenshots/after-amount.png), [QR](screenshots/after-qr.png), [review](screenshots/after-review.png), [recorded receipt](flow-screenshots/receipt.png), [recovery](flow-screenshots/payment-recovery.png), [rejection](flow-screenshots/payment-declined.png), [logout sheet](flow-screenshots/logout-sheet.png). Compact and larger phone captures are included in `screenshots` and `flow-screenshots`.

## Verification

| Check | Result |
|---|---|
| `npm run lint` | Passed; strict TypeScript/unused checks are the existing linter. |
| `npm run typecheck` | Passed. |
| `npm run typecheck:server` | Passed. |
| `npm test` | 40 passed, including startup/session routing, native dependency compatibility, exact amounts, QR geometry and payment safeguards. |
| `npm run test:server` | 18 isolated groups passed; no PostgreSQL connection. |
| Expo export for iOS, Android and web | All passed on final source; output `/private/tmp/medcore-refinement-export-final`. Bundles are not signed builds. |
| Main rendered suite | 12 header measurements at 428×926, all 56px; no page or console errors on the final rerun. [Results](after-results.json). |
| Additional rendered suite | 17 measurements across tabs/stack at 320/430px, all 56px; waiting-HMO Review bill, zero payment requests, search/filter/empty results and CSS 150% text. [Results](extra-results.json). |
| Full payment/startup flow | Final rerun passed: interrupted introduction/resume/Back/completion/relaunch, sign-in validation/logout, six rails through review, recorded QR/card receipts and plan, duplicate clicks, immutable same-key retry, definitive rejection/retry, document identity and exact-centavo keyboard alternatives. [Results](flow-results.json). |
| State/long-text suite | Passed: document loading/error/retry, balance retry preserving input, compact keypad scrolling, honest empty accounts, long names/contact and CSS 150% text. No page errors. [Results](states-results.json). |
| Native simulator | Signed-in Home, Bill, filtered search, pending-HMO Payments → Review bill, Profile, Documents → Back and full Metro reload/session restoration observed. No hospital payment or financial-record mutation. |
| Independent audit/re-audit and scoped `git diff --check` | Passed, including final SVG accessibility cleanup. |

Browser validation used the existing loopback in-memory fixture, never a hospital database or gateway. Its development overlay alone was hidden by harness CSS. The preload capture temporarily holds only the test preference promise until assets load; no delay was added to the application. The native account uses public synthetic seed admissions through the normal authorized login. Its existing pending-HMO status was not altered to enable payment.

No QR payload/module/rendering change was made in this refinement. The previous independent decoder evidence remains in the [reference-match report](../reference-match/README.md); current geometry/confirmation checks pass. Provider marks remain outside the code.

## Reproduce

From the project root, start the fixture, then the dedicated Expo web preview in a second terminal:

```sh
node apps/mobile/validation/reference-match/fixture.mjs
```

```sh
cd apps/mobile && EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8901 npm run web -- --port 8084
```

Run suites sequentially; they reset/change only the synthetic fixture:

```sh
node apps/mobile/validation/refinement/qa.mjs
node apps/mobile/validation/refinement/qa.mjs --extra
node apps/mobile/validation/refinement/qa.mjs --flows
node apps/mobile/validation/refinement/qa.mjs --states
python3 apps/mobile/validation/refinement/compare.py
```

The harness uses the existing macOS Brave executable and temporary Playwright installation at `/private/tmp/medcore-visual-tools`; it adds no app dependency. Comparison generation requires Pillow and the specified macOS Arial font. Original before captures were taken at the start of the pass; recreating them requires that source revision, not `--before` on the updated source. Native PNGs are actual simulator captures, not generated browser phone frames.

## Concrete limits

Physical Android/iOS, native Dynamic Type/reduced motion/screen-reader operation, software-keyboard avoidance and failure/restart SecureStore scenarios still require device checks. Native session restoration and search interaction were exercised in the simulator; they do not certify those other scenarios. Browser CSS magnification is an approximation. Mastercard's provider-supplied 80×50 raster is lower resolution than the other originals; it is shown with a readable label and preserved proportions. No unsupported provider integration was created. Existing production release gates remain in `AUDIT.md`.

No commit, deployment, schema change, reseed or backend-contract change was performed. Earlier pending Expo Go compatibility/status-bar fixes and unrelated user work were preserved. The root desktop print screenshot was inspected but is outside this mobile refinement.
