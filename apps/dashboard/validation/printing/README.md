# MedCore print layout verification

Verified October 8, 2026. Changes are local and uncommitted on `main`.

## Root cause

The shared print stylesheet forced `table-layout: auto` together with a 100% minimum width. That did not constrain intrinsic column widths: unbroken LOA references, status codes, monetary values and cell padding could expand a table past the physical page. Long text also retained screen truncation/nowrap rules. The old stylesheet reproduced a missing right edge/status text in a native Brave Save as PDF export containing a 64-character LOA reference.

Two additional print defects were found: plain browser Print hid the application even when no dedicated document existed, and the service removed a nonblocking preview's document after 200ms/2s. Entire-table keep-together sections also caused unnecessary pagination gaps.

## Implementation

- `src/index.css`: reusable A4 portrait/landscape named pages with 12mm margins, bounded fixed-layout tables, 9pt table text, consistent cell padding and all cell/outer borders. Text wraps without truncation or hidden overflow. Headers repeat and ordinary rows stay together; large table sections can paginate. Scroll containers expand for printing. Dedicated exports hide application chrome; plain browser Print retains the active page, including clickable patient names, recommended actions, KPI data and chart bars. Active pages containing tables with seven or more columns request landscape.
- `src/components/printing/PrintDocumentContainer.tsx`: shared pure renderer used by the application and QA, document orientation metadata, explicit percentage column groups for the two eight-column tables, and independently paginating timeline entries. Portrait column proportions reserve room for amounts. All existing document fields and calculations remain.
- `src/services/printEngine.ts`: orientation defaults/override, fonts/image readiness, cancellation of superseded pending requests, preview-safe queuing, and event-based teardown using `afterprint` or print-media exit. No arbitrary timer removes an open preview.
- `src/components/layout/GlobalCommandBar.tsx`: application command bar is excluded from paper output.
- Eight analytics component roots use `h-full min-w-0` so adjacent cards fill their existing grid rows: `HospitalFinancingWaterfall`, `ArAgingProfileCard`, `DepartmentTurnaroundBottleneckChart`, `ClaimsScrutinyPipeline`, `TrappedCapitalPareto`, `DepartmentExceptionMatrix`, `CommercialCarrierLedger`, and `PatientOopDriverCard`.
- Added `__tests__/printing.ts`, this validation directory (`fixtures.tsx`, `generate.mjs`, `check_pdfs.py`, `tsconfig.json`, `pdf-results.json`, README), and the operational Brain update.

No application dependencies, lockfiles, database schema, authentication, billing data or financial formulas changed. No commit, push, deployment or branch change was performed.

## Actual browser PDF verification

The fixtures render the actual React document templates and actual analytics page using public synthetic seed data. They are not a replacement PDF generator. Native Brave Print / Save as PDF exported all 14 variants at A4 and 100% scale with browser headers/footers disabled. Named pages automatically selected the appropriate orientation. Print backgrounds were enabled for visual inspection. Temporary PDFs and sampled raster pages are under `/private/tmp/medcore-print-validation`; generated binaries are excluded from this source change.

| Document / scenario | Orientation | Pages | Result |
| --- | --- | ---: | --- |
| Official eSOA | Landscape | 2 | Pass |
| Patient itemized ledger | Landscape | 2 | Pass |
| Digital gate pass | Portrait | 1 | Pass |
| Discharge clearance dossier | Portrait | 1 | Pass |
| PhilHealth CF1-CF4 audit | Portrait | 1 | Pass |
| Official receipt with long UUID references | Portrait | 1 | Pass |
| Executive RCM report | Portrait | 1 | Pass |
| Coverage/HMO approval roster, 36 rows | Landscape | 3 | Pass |
| Coverage roster with 64-character unbroken LOA references | Landscape | 5 | Pass |
| Coverage roster portrait override, 24 rows | Portrait | 2 | Pass |
| Itemized ledger portrait override | Portrait | 2 | Pass |
| Coverage roster, 250 uniquely marked rows | Landscape | 19 | Pass |
| Ledger, 100 long unbroken descriptions and full diagnosis | Landscape | 22 | Pass |
| Plain browser Print of analytics page | Landscape | 12 | Pass |

PyMuPDF checks every PDF page for A4 dimensions and horizontal text/drawing bounds inside a 30pt minimum margin. It compares every distinct source table cell and heading against extracted PDF text, including the rightmost status/action columns. It checks repeated headers on continued coverage/charge table pages. All 250 roster and 100 ledger markers occur on exactly one page, and every corresponding row's cell contents remain on that page. Full long descriptions and codes remain present. Sampled first/middle/last pages were rasterized and visually reviewed for borders, alignment, readable type, wrapping and pagination. The executive report was changed to portrait after review eliminated a separate signature-only page.

Native browser measurements confirm all four annotated analytics card pairs have equal bottom edges at desktop width. At 390px the four pairs stack normally. These are checks of actual rendered source with synthetic data, not verification of a deployed build.

## Regression checks

- `npm run build`: passes dashboard TypeScript and Vite build; existing large-bundle warning remains.
- `tsc -p apps/dashboard/validation/printing/tsconfig.json`: passes.
- Print lifecycle checks: 6/6 pass, including the old two-second deadline, queued requests, canceled pending captures, font/logo readiness and print-media teardown.
- `npm test`: 250/250 financial reconciliations, 6 dashboard transport/session checks and 26 isolated backend groups pass. Real PostgreSQL checks remain opt-in and were skipped; this print-only change does not require or claim database validation.
- Existing Final LOA React DOM integration suite: 7/7 pass.
- `git diff --check`: passes.
- Independent reviewer reran the six lifecycle cases. Its clickable-data and chart-height findings were corrected before the final PDF checks.
- `npm audit --audit-level=high`: still reports the existing 17 dev-tool advisories (6 moderate, 9 high, 2 critical). Dependencies were preserved; no unrelated forced upgrade was performed.

## Reproduce

From the project root:

```sh
npm run build
node --import ./node_modules/tsx/dist/loader.mjs apps/dashboard/__tests__/printing.ts
./node_modules/.bin/tsc -p apps/dashboard/validation/printing/tsconfig.json
node apps/dashboard/validation/printing/generate.mjs
```

The lifecycle suite uses jsdom installed in the temporary validation environment, following the existing Final LOA runner convention. Set `MEDCORE_DOM_MODULE` to another installed jsdom module if needed. `MEDCORE_PRINT_OUTPUT` selects another fixture directory.

Open the generated HTML documents in a browser and use Print / Save as PDF. Save each as `medcore-print-final-<fixture name>.pdf`. Do not substitute a reportlab-generated document for browser output. With PyMuPDF installed only in a validation Python environment:

```sh
python apps/dashboard/validation/printing/check_pdfs.py /path/to/fixtures /path/to/browser/pdfs
```

Use `analytics-layout.html` for desktop card measurements and `analytics-responsive.html` for a 390px frame. The measurement labels exist only in these QA fixtures and are excluded from printing and production.

## Printing limits

Browser and printer settings can override CSS paper size, margins, scale and orientation. Safari's native dialog retained US Letter despite the stylesheet, so choose A4 and Landscape manually for eight-column reports there. An initial Safari baseline PDF was exported, but its Save dialog subsequently timed out; final PDF validation was completed in Brave/Chromium. Final Safari/Firefox exports and physical printing are not claimed.

Portrait preserves every column but requires more wrapping; landscape is preferred for eight-column documents. A row taller than the entire printable page cannot remain unbroken; browsers may split such an exceptional row. Final-page whitespace after a short remainder/signature area is normal pagination. Plain browser Print includes the currently rendered filtered/paginated table; use dedicated report exports for their complete report dataset. These fixes do not change which records a page or report selects.

CSS references: [MDN fixed table layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/table-layout), [page sizing and margins](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@page), and [print lifecycle](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing).
