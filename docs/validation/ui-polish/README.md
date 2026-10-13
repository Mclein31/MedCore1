# MedCore final UI review

This pass refines the existing hospital billing and reconciliation dashboard and the patient mobile app. It keeps existing routes, approvals, payment eligibility, API calls, authentication, and data structures intact. Browser captures use sanitized synthetic data and local fixtures; no hospital records, external AI services, or payment providers were contacted.

## Findings and changes

| Area | Finding | Refinement |
| --- | --- | --- |
| Dashboard palette | Pale surfaces, low-contrast metadata and controls, and a quiet active sidebar made the interface feel washed out. | Tuned shared teal/blue and semantic status tokens, raised muted-text and border contrast, clarified the selected sidebar state, and retained neutral content surfaces. |
| Dashboard boundaries | Several cards, search fields and table regions blended into their surroundings. | Unified restrained one-pixel borders, input boundaries, table headings, hover and keyboard-focus treatments. |
| Responsive dashboard | Patient ledger columns and queue panels became cramped at tablet and phone widths; some headers and currency summaries wrapped poorly. | Added local horizontal scrolling for the ledger at phone widths, stacked approval work areas, allowed page headers to wrap, and gave high-value totals room to wrap. |
| Dashboard controls | Small clear/remove controls, low-contrast status colors, inconsistent action placement, and unassociated modal labels weakened clarity and access. | Improved target sizes, semantic badge colors, button grouping, form-label association, and modal naming, focus containment, Escape handling and focus restoration. |
| Mobile headers and cards | The Home header had no bottom separator; some screens used nested bordered cards and inconsistent actions. | Added the shared one-pixel header divider, kept the existing 56px header geometry, simplified nested bill details, and standardized compact action buttons and their labels. |
| Mobile navigation | Five persistent labels competed for space, especially on narrow screens. | Replaced it with a floating five-tab bar: only the selected tab shows its name; the active Solar icon becomes Bold, shifts by 2px and eases in. Other icons stay Linear. At narrow widths or larger text scales, the active label stacks below its icon. Reduced Motion disables transitions. |
| Mobile keyboard access | A web tablist needs predictable keyboard movement. | Added roving tab focus with Left/Right, Home and End keys for the web preview. Tab names, selected state and 48px minimum targets remain available to assistive technology and touch. |

The mobile tab bar reports its measured height to React Navigation and includes safe-area padding. Route selection and preventable `tabPress`/`tabLongPress` events remain in place. Payment, approval and discharge conditions were not changed.

## Solar icon selection

The icon study compares Solar **Linear, Bold, LineDuotone, BoldDuotone, Broken, and Outline** at dashboard, phone-navigation and summary sizes. Linear is the default for dashboard controls and inactive mobile tabs. Bold marks the active mobile destination. Duotone was too decorative for dense operational controls, Broken lost continuity at small sizes, and Outline was too close to Linear to add a useful second role. The dashboard and mobile apps share the same local icon geometry and semantic mapping.

Solar path data is pinned to upstream commit `ee04ec4d114633a0cfaefa1791a6486f1e90173d`. Attribution and CC BY 4.0 terms are included in `apps/shared/solar-icons/NOTICE.md`; source paths and licenses are in `apps/shared/solar-icons/sources.json`. Existing Lucide packages remain installed because removing them was outside this presentation pass.

## Evidence

- [Interactive before/after comparison](comparison.html) — dashboard pages and mobile screens at matching sizes.
- [Solar style study](solar-style-study.html) and [captured style sheet](solar-style-study.png).
- Mobile navigation captures: [390px Home](navigation/bar-home-390.png), [320px Coverage](navigation/bar-coverage-320.png), [390px Payments](navigation/bar-payments-390.png).
- Machine-readable results: [dashboard/mobile UI checks](after/results.json), [login and landscape checks](after/extra-results.json), [tab-bar checks](navigation/results.json), and [changed-token contrast ratios](contrast.json).
- Verification scripts: `scripts/verifyUiPolish.mjs`, `scripts/verifyUiPolishExtra.mjs`, and `scripts/verifyMobileTabs.mjs`.

## Research applied

- [Impeccable](https://impeccable.style/docs/) — audit, typography, hierarchy, restraint and accessibility.
- [Emil Kowalski design engineering](https://github.com/emilkowalski/skills) — purposeful easing, motion cleanup and reduced-motion support.
- [Refactoring UI](https://refactoringui.com/) — hierarchy, spacing, surface contrast and dense information layout.
- [Primer data table](https://primer.style/product/components/data-table/) and [Stripe app components](https://docs.stripe.com/stripe-apps/components) — clear enterprise tables, forms and controls.
- [Vercel Geist](https://vercel.com/geist/introduction) and [Linear interface notes](https://linear.app/now/how-we-redesigned-the-linear-ui) — restrained chrome and consistent interaction detail.
- [Solar Icons](https://solar-icons.vercel.app/icons) — reviewed six styles and kept the original MedCore colors and product identity.
- [W3C WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) — checked changed opaque token pairs; the results do not certify every screen or state.

## Validation and limits

- Dashboard production TypeScript/build passed; the generated main JavaScript chunk is 570 KB before gzip and still triggers Vite's 500 KB advisory.
- Mobile strict TypeScript/lint and all 56 mobile unit checks passed.
- Expo exported web, iOS and Android bundles.
- Browser component checks cover 112 dashboard/mobile cases across 1440/1024/768px dashboard widths and 320/390/430/768px mobile widths, including long/empty/loading/error data, modal keyboard handling, local ledger scrolling, mobile headers, payment screens, and the early approval gates. The separate login/landscape run covers 3 more groups. The tab-bar run covers five viewport sizes, selected-label-only behavior, named tabs, 48px targets, rapid switching, keyboard movement and reduced motion. There were no browser page errors or attempted writes in the fixtures.
- Changed dashboard opaque color pairs meet the recorded WCAG AA text target; the input boundary and focus indicator meet the non-text contrast target. See `contrast.json` for exact ratios. This is a token-pair check, not a full WCAG audit.
- No iOS simulator was booted during this review. Native VoiceOver, physical-device safe areas, keyboard overlap, actual OS text scaling, and native animation still need a device smoke check. Browser 150% text zoom and narrow-width stacking were checked.
- Dependency audit snapshots report 17 root advisories (6 moderate, 9 high, 2 critical) and 22 mobile advisories (7 moderate, 15 high). They were not changed in this UI pass.

## Shared files

Design tokens are in `apps/dashboard/src/index.css`, `apps/dashboard/tailwind.config.js`, and `apps/mobile/src/components/theme.ts`. Shared Solar icon adapters are in `apps/dashboard/src/components/common/SolarIcons.tsx`, `apps/mobile/src/components/SolarIcons.tsx`, and `apps/shared/solar-icons/`. The shared mobile header, controls and tab bar are in `apps/mobile/src/components/Header.tsx`, `apps/mobile/src/components/ui.tsx`, and `apps/mobile/src/components/MedTabBar.tsx`.
