# Simulated payment UI evidence — October 8, 2026

These images are visual/layout evidence; the fixture has no PostgreSQL and is not the application payment implementation.

Observed at Safari Responsive Design Mode 430×932: bill deductions/responsibility, Continue to Payment navigation, GCash selected by default, method/provider artwork, GCash details without credential/preview labels, partial amount entry, review details, disabled controls and spinner while processing, then Payment Successful with recorded method/reference/date and View Receipt/Back to Bills actions. The success screen was observed in the tool; a usable saved success capture was not retained.

- [Methods](screenshots/methods-430.png)
- [GCash details](screenshots/gcash-details-430.png)
- [Review](screenshots/review-430.png)

Screenshots were cropped to the observed viewport to exclude unrelated browser tabs/chrome; logical viewport is 430×932, screenshot pixels are 357×764 due Safari's fit scaling. No app pixels were regenerated or recolored.

Browser activity interrupted further walkthroughs. A separate compact-browser attempt did not establish a valid final 320px check; it is not reported as passing. Complete Maya/card/bank/success/receipt/history/native and enlarged-text render checks remain pending. Automated source/handler checks cover all four methods separately; see the [implementation report](../../../../docs/implementation/simulated-payments.md) for precise results and database restrictions. Historical refinement/reference screenshots remain unchanged and are not evidence for this new payment flow.
