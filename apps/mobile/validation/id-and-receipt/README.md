# Historical payment receipt layout check

Run from the repository root:

```sh
node apps/mobile/validation/id-and-receipt/dom.mjs
```

Uses the existing temporary jsdom tools at `/private/tmp/medcore-visual-tools`. The runner renders the actual `RecordDetailScreen`, `ReceiptSheet` and `BillBreakdown` with React Native Web and React DOM; only the auth/resource/facility data hooks return synthetic records. No network, database writes, real IDs or patient records are used.

Two passing checks verify that the historical payment receipt has the contrasting ticket surround and its twenty scalloped cutouts, that actual payment details appear inside it, and that itemized bill content still appears outside. Existing jsdom ResizeObserver and shared shadow deprecation warnings remain. This establishes component content/style wiring, not a physical device screenshot or exported print layout.

For ID format research, security changes and broader validation, see [the implementation report](../../../../docs/implementation/government-id-validation.md).
