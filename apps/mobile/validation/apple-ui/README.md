# Apple-inspired dashboard and mobile UI — October 12, 2026

The dashboard shell and Overview use quiet navigation, an inset translucent toolbar, teal selection, larger figures, rounded opaque cards and keyboard-accessible priority/queue controls. The hospital name and tracked encounter count come from the loaded session/census. Existing operational scorecard and footer metrics remain unchanged; this UI pass does not establish those legacy figures as live measurements.

Mobile Home uses grouped surfaces, a clear balance card, one primary next action and separate shortcuts. Shared cards, typography and press feedback also improve Bill, Coverage, Payments and Profile. Five navigation tabs sit in an inset rounded bar with reserved layout space and safe-area margins. Native navigation uses solid surfaces without adding a blur dependency. Cora has its own reserved dock above the tabs, so it cannot cover the payment button. Press scale feedback respects Reduce Motion; monetary text can wrap under enlargement rather than being clipped.

The source skills were installed in the local Codex skill directory and renamed to avoid their upstream `apple-design` name collision:

- `apple-look`: [SudewaJay/apple-design-skill](https://github.com/SudewaJay/apple-design-skill/tree/main/apple-design).
- `apple-motion`: [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/main/skills/apple-design).

## Verification

`qa.mjs` runs the actual dashboard and mobile components. Dashboard requests are intercepted and fulfilled with four synthetic encounters from the existing test dataset. AI generation is deliberately unavailable in this fixture. Mobile uses the existing loopback in-memory fixture; it does not use hospital accounts, make payments or call a real gateway. Screenshots show synthetic identities and an intentional AI-unavailable notice.

The checks cover dashboard widths 1440/1024/768, keyboard priority navigation, collapsed sidebar selection, phone widths 320/390/430, five targets of at least 44px, payment entry/back, the main tabs, Cora open/close, 150% content text and an empty account. After enlargement, hit testing verifies that the payment action remains reachable and sits above the Cora dock. See [results.json](results.json) and [screenshots](screenshots/).

Run from the project root with the required local tools already installed:

```sh
npm run dev:client -- --host 127.0.0.1 --port 5175
node apps/mobile/validation/reference-match/fixture.mjs
```

In a separate terminal from `apps/mobile`:

```sh
EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8901 npm run web -- --port 8084
```

Then from the project root:

```sh
node apps/mobile/validation/apple-ui/qa.mjs
```

`PLAYWRIGHT_MODULE`, `PLAYWRIGHT_BROWSER_PATH`, `MEDCORE_DASHBOARD_UI_URL` and `MEDCORE_MOBILE_UI_URL` can override the harness defaults. Defaults use the existing `/private/tmp/medcore-visual-tools` Playwright installation and Brave browser.

Dashboard production build/typecheck, mobile strict lint/typecheck, 56 mobile checks, 12 overlay groups, seven Claims/eSOA groups, all three Expo platform exports and diff checks pass. The independent reviewer found two accessibility issues (label-in-name and queue target size); both were fixed and re-reviewed. No package or dependency was changed. Existing dependency audits still report 17 root and 22 mobile advisories; no unrelated dependency migration was performed.

Browser text enlargement is not an OS Dynamic Type test. Native safe areas, OS text scaling, VoiceOver and touch feedback still need a simulator or physical device check. No commit, push or deployment was performed; mobile source needs a reload/rebuild.
