# Tab refresh indicators and header/content edges

The native RefreshControl was driven by general data `loading`, including automatic, focus and foreground requests. Shared patient loading could start refresh controls on several tabs even though no user pulled those scroll views. This can leave a detached iOS tab with a refreshing content inset until another scroll gesture. Separately, the shared Screen added eight points of outer top padding before the full-bleed Home and Bill backgrounds.

## Changes

- New `src/hooks/usePullRefresh.ts` owns gesture-specific refresh state. It starts only on a user pull, de-duplicates repeated events, clears on completion/failure/blur, ignores late completion from an old focus/resource scope and cleans up on unmount. Existing resource/provider loading, errors, requests, authentication and account isolation remain authoritative.
- All existing refresh controls use the hook: Home, Bill, Coverage, Payments, Claims, Documents, Notifications, Record Detail and the Profile patient directory. Automatic/background loads no longer trigger native pull indicators. Underlying data requests can finish after navigation without retaining a spinner on a hidden tab. Scroll positions are not reset.
- Those navigation-owned scroll views explicitly disable automatic native content-inset adjustment. The existing custom header and Screen manage safe areas.
- Screen adds `topSpacing`, defaulting to the existing eight points. Only Home and Bill request zero outer top spacing, so their hero backgrounds meet the header. Card interiors, normal screen padding, safe-area padding, header heights, typography and money figures retain their existing rules.

## Verification — October 9, 2026

Passed: mobile lint/strict types, all 49 mobile unit checks, seven actual-hook/layout DOM groups, two receipt DOM groups, four Profile selector DOM groups and iOS/Android/web Expo exports. The active development iOS bundle returned HTTP 200 and contained both `usePullRefresh` and zero top spacing.

The seven actual-component checks cover automatic loading without pull state, a single user pull, duplicate events, completion, blur/refocus, a late response while a newer pull is pending, rejected requests, resource changes, unmount cleanup and full-bleed/default/native-safe-area spacing. Synthetic promise/focus fixtures are used; no network, hospital data or financial mutation is involved.

Run from the repository root with the existing temporary jsdom tooling:

```sh
node apps/mobile/validation/refresh-layout/dom.mjs
npm --prefix apps/mobile run lint
npm --prefix apps/mobile test
```

Native verification was partial: Device Hub initially displayed “Connecting display…”, the iPhone 14 Plus returned to iOS Home with zero Metro peers, and the app-open request failed at CoreSimulator connection/refused. The display later reconnected; MedCore Home was observed rendered without a retained pull indicator, with its prior scrolled position preserved. Attempting the top-edge/tab-cycle check then failed with Computer Use `noWindowsAvailable`. Full native after-fix tab cycling and top-edge comparison are not claimed. Reopen MedCore/Expo Go on the existing Metro server, then verify: cycle all five tabs without scrolling; pull and immediately switch tabs; revisit without swiping to dismiss an indicator; ensure Home/Bill backgrounds meet their header. Physical Android/iPhone testing remains a device check.

The existing dev server and backend were preserved. No dependency, database, financial calculation, commit, push or branch change was made. Existing jsdom ResizeObserver/shared shadow deprecation warnings remain.
