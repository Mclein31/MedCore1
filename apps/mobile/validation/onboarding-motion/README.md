# Onboarding SVG motion and Profile patient dropdown

The three onboarding pages now have different original SVG scenes: a folded hospital bill with a magnifier at its bottom-right, PhilHealth/HMO coverage cards with a protective shield and progress markers, and a payment receipt with a card. Native-driven transforms move the illustration and accent independently for 4.32 seconds, then stop. Reduced motion keeps them still. The existing palette, typography, headings, onboarding persistence and navigation controls are retained.

`LaunchScreen` uses an SVG orbit, background geometry and pulsing SVG progress nodes around MedCore's existing badge. `LaunchGate` presents it for at least 1.2 seconds on each cold opening and background-to-active return, extending while real initialization remains pending. Returning from a system dialog's inactive state does not replay it. The foreground overlay preserves navigator/forms and blocks/hides background content. This is presentation timing, not a new data loader or authentication shortcut. The native OS splash is still the existing static configured splash before JavaScript starts.

The administrator's patient selector is now a dropdown beside the **Profile** heading. It loads the directory only on opening, searches names/MRNs, marks the current patient and closes on selection, dismissal or Done. Selecting another patient resets patient data/navigation to the regular Home dashboard. Regular patient accounts cannot render or request this directory; backend authorization remains unchanged. The Home source has returned to its original implementation.

## Files

- `src/components/FinancialIllustration.tsx`: three SVG scenes, bounded movement, decorative semantics.
- `src/components/LaunchScreen.tsx`, new `LaunchGate.tsx`: SVG startup presentation and foreground lifecycle.
- `src/components/PatientSelector.tsx`: privileged Profile directory dropdown and search.
- `src/components/Header.tsx`, `icons.tsx`: title accessory and existing-family chevron.
- `src/navigation/Tabs.tsx`: opening gate, Profile accessory, default Home tab.
- `src/screens/ProfileScreen.tsx`: administrator identity and selected-patient context.
- `src/screens/HomeScreen.tsx`: restored regular Home; the earlier separate directory screen was removed.
- `package.json`: backend shortcut for starting from the mobile directory. No dependency or lockfile change.

## Verification — October 9, 2026

Passed:

- `npm run lint`: strict types and unused checks.
- `npm test` in mobile: 46 checks.
- Root `npm test`: 250 financial records, six dashboard auth checks and 30 isolated backend groups.
- `dom.mjs`: six actual-component startup, reduced-motion and preserved-form checks.
- `dom.mjs --selector`: four actual-component dropdown/authorization/selection/dismissal checks, using a synthetic session and directory.
- `dom.mjs --motion`: three actual-component movement and bounded-animation checks.
- iOS/Android/web Expo bundle exports; no new native module.
- iPhone 14 Plus/iOS 26.5 runtime: startup artwork, standard Home and Profile heading/dropdown; real facility directory (250 patients), MRN filter, selection to another patient's Home, then restoring the original patient. These were read-only actions on hospital records.

Native evidence is in [screenshots](./screenshots/): `preload-native.png`, `home-native.png`, `profile-native.png`. The renderer and source were inspected; the SVG bill/magnifier also rendered in the regular browser. New typography and explicit SVG transforms fix the initially observed serif fallback and web `transform-origin` warning.

Reproduce DOM checks from the repository root, using the existing temporary jsdom tools at `/private/tmp/medcore-visual-tools`:

```sh
node apps/mobile/validation/onboarding-motion/dom.mjs
node apps/mobile/validation/onboarding-motion/dom.mjs --selector
node apps/mobile/validation/onboarding-motion/dom.mjs --motion
```

The DOM checks render the actual components with React Native Web and React DOM. The selector substitutes only its session/patient context; directory responses are synthetic. Existing shadow deprecation and missing jsdom ResizeObserver warnings are from the validation environment. The temporary runner exits after cleanup because RN Web image caches keep background handles alive in jsdom.

`qa.mjs` is a broader Playwright suite for 320/430/768px, real-browser reduced motion, foreground form preservation and restart persistence. Its headless Brave launch failed in this environment (SIGABRT; cleanup kill EPERM), so its assertions and screenshots are **not claimed as passed**. No `results.json` for this browser suite is fabricated. It can be rerun locally with `npm run web -- --port 8086` and `node apps/mobile/validation/onboarding-motion/qa.mjs`. The native app and the user's development server were retained.

Physical iPhone/Android interaction, Android rendered layouts, all three native onboarding screens at small/tablet sizes and OS-level reduced-motion toggling still require device QA. Existing mobile dependency advisories remain unchanged (16 high/seven moderate). No real payment, schema change, new dependency, commit, push, deployment or branch change occurred.
