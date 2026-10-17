# Original v1 dashboard on v2 — validation, 2026-10-17

Worktree: `mobile-v2`, branch `rebuild/mobile-v2`. Original files copied from `main:apps/dashboard`, retaining v2 staff sign-in/invite/MFA and account, patients, staff administration, audit and lobby pages. No API route or security default changed.

## Actions actually tested

Local API 8788, dashboard 5174, fictional existing local database. CFO password sign-in; billing account still requests its configured authenticator; lobby sign-in exposes only account/MFA and exit check. Sign-out revokes the cookie session and returns to v2 login. No invitations sent, account permissions changed, or authenticator enrollment changed.

Registered fictional `UI-PORT-1017`, admitted to bed 411 with physician from the actual directory (POST 201). Added laboratory charge ₱123.45 (201); bill displays exact pesos from centavos. Declared MGH, started discharge, signed ₱100 PF as CFO with a recorded on-behalf reason, cleared pharmacy, finalized and sent ₱223.45 bill (all 200). Recorded full QR Ph payment (201); balance zero, actual six-digit PIN fetched from the audited pass endpoint. Verified the one-time pass in the retained lobby screen (200, “Cleared to leave”).

Viewed Overview, Discharge Clearance/workspace, Encounters & Ledgers, Approvals & Disputes, Claims & eSOA, RCM Analytics, Patients, Staff Accounts, Audit Log, My Account/MFA, Lobby Exit Check, and Settings & Rules. Real claim XML loads from v2 for a seeded finalized bill. Claims AI renders its friendly unavailable message. Notifications explicitly unavailable. Estimator/pricing/scheduled admissions and configuration remain visible with unavailable values, without sample prices or invented scheduled patients. Fresh browser load and page navigation have no runtime console errors; transient Vite errors while editing were resolved before this pass.

Desktop comparison uses `UI_SCREENSHOTS/dashboard/01-overview-scroll-01.png`; screenshot `original-v1-overview.png` records restored shell/cards. Laptop and desktop checks cover 1280×800, 1366×768, 1440×900 and 1920×1080 CSS viewports, including navigation, tables and admission/charge/fee/payment-plan dialogs. Tables scroll inside their panels; tall dialogs start inside the viewport and scroll without hiding their title/close controls. A user-reported whole-page clipping issue was isolated to the visible embedded responsive preview: at 1366px with its zoom, it reported 1707px to the page. Reset the forced preview override; independent ordinary Safari shows the full right edge (screenshot `safari-desktop.png`). Offscreen CSS viewport measurements confirm root/document/header bounds at the tested sizes. No application-wide fixed-width or root scaling was found.

## Contract corrections discovered

- Physician directory is `/v1/staff/directory/physicians`, guarded by `encounter:admit`; both callers and the handoff corrected.
- Accredited PF ceiling uses `PUT /v1/staff/encounters/:id/adjustments` (`charge:write`), with an actual entered ceiling; it does not sign the fee.
- PF signing requires a positive agreed amount. If not recorded, the client asks for the actual amount instead of submitting zero. CFO signing requires its on-behalf reason.
- Gate passes are read with GET; PIN comes only from the audited dedicated endpoint. Expired active records are not displayed as ready for exit.
- Bed PATCH responds `{ok:true}`; adapter refetches the bed. Only API-supported manual statuses are accepted.
- Patient-direct charges map to EXCLUDED; bill-wide coverage does not imply a per-charge allocation. Per-line shares are unavailable.
- Staff payment response contains `detail`, `payment`, `receipt`; adapter uses actual timestamps/references and preserves the simulated flag, with a stable idempotency key per intent.
- Legacy “remove encounter / release bed” maps to void and is labeled as cancellation, including a required reason and API financial-record restrictions.

## Limits and checks

AI, staff notifications/SMS, full RCM historical/risk analytics, per-line payer allocations, configuration, admission edits and in-place charge edits are unavailable. Procedure pricing and scheduled admissions have no v2 source. Official PhilHealth schema conformance is not claimed. Patient gaps are documented in `docs/v2/API_GAPS.md`.

Root gates: `npm run check`, `npm run format:check`, `npm run build`. Web bridge regression tests cover money, payment history, actual physician route, charge coverage, idempotency, audited PIN and expiry, and unavailable features. Existing dependency audit reports 26 advisories (11 moderate, 15 high), inherited Expo/tooling chains; no forced breaking upgrades.
