# Government ID validation and history receipt tickets

The repayment-plan form previously accepted any ID number with at least four characters; the API also used only `min(4)`. An isolated direct request with `1234` reproduced HTTP 200 before the change. The dashboard's operational note handler additionally created a local note and gate pass after API rejection, which would undermine backend validation.

## Changes

- `apps/shared/governmentId.ts`: shared type-specific lengths/patterns and strict normalization. [Researched formats and sources](../../MedCore_Vault/RESEARCH/government_id_formats.md).
- `apps/server/src/routes/promissory.ts`: validate IDs after authentication/role checks and before database access or mutations. Return a safe `INVALID_GOVERNMENT_ID` error without echoing entered IDs. Store canonical values and recover the same active note for equivalent formatted/unformatted retries. Ownership, facility, stage, balance, locking and existing production restrictions remain.
- `apps/mobile/src/screens/PaymentFlowScreen.tsx`: appropriate labels, PCN/CRN instructions, format hints, keyboard/capitalization and inline validation; review/confirmation refuse invalid IDs. Changing ID type clears the prior number. Input is not silently truncated or stripped into another identifier.
- `apps/mobile/metro.config.js`: make the shared rules visible to Metro; no dependency change.
- Dashboard `DigitalPromissoryModal`, `PromissoryPaymentRail` and `MedCoreContext`: reuse the same rules, remove prefilled sample numbers, add Passport to the operational modal, avoid putting a full ID into the contact field, and require backend-confirmed note creation. The operational modal awaits failure/success and blocks duplicate submission; a rejection cannot create a local note, clear a bill or issue a local pass.
- `apps/mobile/src/screens/RecordDetailScreen.tsx`: surround only the selected actual payment receipt with a contrasting ticket background so the existing scalloped cutouts remain visible. Itemized charges, hospital stay details, disputes and timeline remain outside it. `BillBreakdown` and the existing checkout receipt design are unchanged.

There is no migration, reseed, new gateway, ID issuer integration, new dependency or change to statutory/insurance calculations. The ID check applies to the existing repayment-plan flow. It validates format, not actual identity or expiry. Proper document/issuer verification remains a separate hospital responsibility; format validation must not be presented as authenticated identity.

## Verification — October 9, 2026

- Mobile lint/types and server types passed.
- 49 mobile checks passed, including documented ID formats, leading zeros, private-PSN/SSS confusion, four-character entries, Unicode and surplus-character attacks.
- 32 isolated backend groups passed. New tests reject invalid IDs through direct authenticated API requests without note/pass/balance writes; valid forms for all four types persist canonically, and equivalent retries reuse the note without additional writes.
- Nine actual dashboard DOM groups passed, including no request/local mutation for a four-character ID and no local success on a hospital rejection. Existing LOA checks still pass.
- Two actual mobile record-view DOM checks passed: the history receipt has visible ticket surround/cutouts and actual payment details; the itemized bill remains outside.
- Root tests (250 financial records, six dashboard auth transport checks and the 32 backend groups), dashboard build and iOS/Android/web mobile exports passed.

The tests use synthetic fixtures and isolated mock database rows; no hospital financial transaction or real ID was submitted. Live PostgreSQL security/persistence and final physical-device layouts were not re-tested. Existing dependency advisories and the dashboard bundle-size warning remain.

Restart the running local backend to load the new API rules; a previously started plain `tsx` server does not hot-reload. After stopping its current process, run `npm run dev:server` from the repo root or mobile folder. Restart the current mobile Metro process (`npm start` from `apps/mobile`) to load the shared-folder configuration, then reload the app. Existing user-run servers were preserved because a replacement agent-started backend would encounter the known sandbox PostgreSQL restriction. Source tests and builds are verified; updated live-server behavior is not claimed until that restart.

Commands from the repository root:

```sh
npm test
npm run build
npm --prefix apps/mobile run lint
npm --prefix apps/mobile test
npm --prefix apps/mobile run typecheck:server
node apps/dashboard/validation/final-loa/run.mjs
node apps/mobile/validation/id-and-receipt/dom.mjs
```

No commit, push, deployment or branch change was performed.

### Native Metro recovery — October 9, 2026

The simulator later displayed a retained `Unable to resolve ../shared/governmentId` compile error. The import resolved to the existing `apps/shared/governmentId.ts`, and the active mobile Metro configuration included that folder. Requesting the active server's development iOS bundle returned HTTP 200 and included `validateGovernmentId`. A full reload through Metro's existing local reload channel was acknowledged by the connected native runtime; an iPhone 14 Plus screenshot then showed the functioning Bill screen without the compile overlay. No duplicate validator, path workaround or security-rule change was needed. This confirms native client bundle recovery; backend restart/validation limits above are unchanged.
