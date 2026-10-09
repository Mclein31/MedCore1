# RCM Analytics interiors and financial typography

Verified October 9, 2026. Local changes on `main`; no commit, push or deployment.

The previous `h-full` change stretched card borders but left block-flow content at its original height. Native browser measurements found approximately 67.5px, 30.3px, 23.7px and 150px of unused bottom space in the waterfall, claims, department and OOP cards.

The eight paired cards now use column layouts with content regions that grow at the existing `xl` breakpoint. Metric tiles, legend rows, driver rows, aging buckets and supporting summaries use the allocated height; footers stay at the intended bottom padding. Stacked phone/tablet cards retain natural content heights. The waterfall uses three wider tiles followed by two full-row tiles, accommodating larger amounts and complete labels.

Main financial values were enlarged across the KPI scorecard, waterfall, aging, Pareto, OOP, carrier ledger and exception worklist. The largest executive values use `text-3xl`; card totals and amounts use the existing `text-xl`, `text-lg` and `text-base` scale. Table currency values also increased. The executive grid switches to four columns at `xl` so larger totals fit on narrower screens. Secondary descriptions keep their existing hierarchy.

The department SVG observes a flex-sized frame and changes its vertical coordinate range to match the available height. An absolute SVG cannot feed its intrinsic size back into that frame. Uniform scaling preserves labels and bar proportions. Phone/tablet and print geometry remain 600×240; native `beforeprint` synchronously restores that geometry, and `afterprint` restores desktop sizing. Observer, frame callback and event listeners are cleaned up.

## Verification

The standalone fixture renders the actual React provider and analytics page with public seed data. All fetches are intercepted locally; it does not connect to an API, database or external account. It is excluded from the production entry point.

Native Brave browser checks passed at 375, 390, 1024, 1279, 1280, 1366 and 1920px. Every paired card has zero unused space below its final content after subtracting padding/border. Desktop pair bottoms match, section gaps remain within the spacing scale, primary amounts do not overflow, and the department plot fits its frame without nonuniform scaling. Final primary currency fonts measure 14.4–27px at the standard density and 15–28.1px on phone/1920px layouts. Warnings and ward filtering were exercised during the interior layout pass.

Actual native Print / Save as PDF produced a 12-page A4 landscape document with the final larger KPI figures. Every page's text and drawing edges stayed inside a 30pt minimum margin; rightmost table headings remained present. KPI and department pages were rasterized and visually checked. After saving, native measurements confirmed all card interiors, enlarged fonts and responsive chart geometry were restored. Temporary artifacts are under `/private/tmp/medcore-analytics-layout-live`; they are not application files.

- Dashboard TypeScript/Vite build: pass; existing large-bundle warning remains.
- Strict validation fixture TypeScript: pass.
- Existing financial audit: 250/250 records pass.
- Dashboard auth/transport checks: 6/6 pass.
- Isolated backend checks: 26 groups pass; real PostgreSQL checks remain opt-in and were skipped.
- Print lifecycle regression checks: 6/6 pass.
- Independent source review: no actionable sizing, observer-loop, mobile or print regression found in the interior changes.
- `git diff --check`: pass.

No billing formulas, amounts, authentication, backend, schema or dependencies changed. These checks verify local source with synthetic data, not a deployed build or physical phone/printer.

## Files

Updated analytics components: `HospitalFinancingWaterfall`, `ArAgingProfileCard`, `DepartmentTurnaroundBottleneckChart`, `ClaimsScrutinyPipeline`, `TrappedCapitalPareto`, `DepartmentExceptionMatrix`, `CommercialCarrierLedger`, `PatientOopDriverCard`, `MacroRevenueScorecard`, and `ActionableExceptionsWorklist`. Added this validation directory and updated the existing operational Brain.

## Reproduce

```sh
npm run build
./node_modules/.bin/tsc -p apps/dashboard/validation/analytics-layout/tsconfig.json
node apps/dashboard/validation/analytics-layout/generate.mjs
```

Open the generated `index.html` and `viewport-*.html` files. “Check card layout” reports actual geometry, typography and overflow. Its compact card arrays contain name, unused bottom space, section heights, largest section gap, and optional SVG viewBox/aspect difference. Test controls exist only in the fixture and are excluded from printing. Set `MEDCORE_ANALYTICS_OUTPUT` to use another temporary output directory.
