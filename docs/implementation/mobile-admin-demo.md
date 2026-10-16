# Mobile administrator presentation account

The mobile app supports one explicitly provisioned administrator for the university presentation. This is a privileged account in the existing database, not a client-side authentication bypass. It can browse all patient records at its own hospital facility, including patients without mobile logins. It does not expose staff accounts or other hospitals.

## Current seeded credentials — October 10, 2026

The standard `scripts/seedPostgres.ts` now creates the reserved demo account itself. After a standard reseed, use `mobile.admin.demo@example.test` with the password set via `SEED_PASSWORD` at facility `SJMC-MNL`. The demo capability is only active when the server has `MOBILE_DEMO_ENABLED=true`. Reseeding replaces the previously provisioned password. The older generated credential in `/private/tmp/medcore-mobile-admin-login.json` can therefore be stale; the provisioning utility does not reset existing passwords. On October 10 the saved generated credential no longer matched the local database, while the seeded password returned HTTP 200 and the demo directory returned 250 patients. This verification applies to the local backend; hosted credentials are separate.

## Local setup

From the repository root, run:

```sh
node --import ./node_modules/tsx/dist/loader.mjs scripts/provisionMobileDemoAdmin.ts
```

The utility creates `mobile.admin.demo@example.test` with a randomly generated password and prints the login details. It uses the existing local `aqromed` PostgreSQL database and `SJMC-MNL` facility, verifies the known presentation dataset, and writes an audit event. It does not reseed records, reset existing passwords, or change schema. Credentials are saved outside Git at `/private/tmp/medcore-mobile-admin-login.json` with owner-only permissions. A repeat run verifies the existing saved password and returns the same account. If the temporary file is unavailable, supply the known password through `MEDCORE_ADMIN_DEMO_PASSWORD`; unknown existing credentials fail without resetting anything.

The utility deliberately rejects remote databases and different database names. The current mobile configuration connects to the laptop API at `192.168.1.27:8787`; this local account will not automatically exist on the hosted dashboard database. A hosted presentation would require separately authorized provisioning of that environment.

Restart the existing backend development process with `npm run dev:server` after applying the source changes, then reload the mobile app. Do not start a second backend on the occupied port. Log in using the printed email/password. Home keeps the regular patient dashboard. The administrator opens the dropdown beside the Profile heading to search the hospital patient directory by name or MRN. Choosing a patient closes the menu and returns to Home; bills, coverage, history, documents, receipts and updates use that selected patient. Profile keeps the administrator's identity, role and hospital and displays the current patient context. Ordinary patient accounts do not receive this dropdown. The backend can now also be started with `npm run dev:server` from `apps/mobile` through a repository-root shortcut.

Payments and other existing authorized actions can modify the selected patient's real application records in the presentation database. Payment processing remains the existing backend-owned simulation; no external gateway is connected.

## Authorization and state isolation

- The reserved username `mobile.admin.demo` and persisted `HOSPITAL_CFO` role jointly grant the server-computed `mobileDemoAdmin` capability. An effective role override header cannot grant it. Normal staff logins remain rejected by the mobile app.
- `/patient/demo/patients` requires that capability and CFO role. The directory returns only patient ID, MRN and name for the authenticated facility.
- The scoped mobile API client adds `X-Medcore-Patient-Id` only to `/patient/me` reads. The backend checks capability, UUID, patient identity and facility before returning the existing safe patient projection. Ordinary patient accounts cannot use this header to change ownership.
- Patient selection remounts patient data and navigation. Requests from an old selection are rejected before sending and after asynchronous credential/transport/body steps. Auth verification uses an independent client to avoid a selection-triggered login loop.
- Payment recovery uses an account-and-patient namespace containing only SecureStore-supported characters. Card secrets remain excluded from storage and API payloads.
- Mutation endpoints retain their existing CFO authorization, facility, amount and idempotency checks. No JWT/session expiry, public registration, financial calculation or schema behavior is weakened.

## Verification and limits — October 9, 2026

Passed: mobile lint/strict types, server types, 46 mobile unit checks, 30 isolated backend groups, six dashboard authentication checks, the 250-record financial audit, dashboard production build, and iOS/Android/web mobile bundle exports. New cases cover the reserved principal, denied ordinary accounts, facility boundaries, safe directory fields, role-header spoofing, SecureStore namespaces and patient-selection races.

The agent's initial provisioning attempt was blocked by PostgreSQL TCP `EPERM` before any SQL. Subsequent local provisioning is now confirmed: the saved credentials return HTTP 200 on localhost and the configured LAN API, with CFO role and the server-computed capability. The directory returns all 250 facility patients using only safe fields, and a selected-patient overview returns the correct patient and encounter. The two validation sessions were revoked and temporary secret responses removed. On the iPhone 14 Plus/iOS 26.5 simulator, Profile dropdown opening, MRN search, selection, updated Home and restoration of the original patient were observed. No payment or hospital record was changed. Physical phone and Android interaction remain unverified. No migration, commit, push or deployment was performed. The dashboard's existing large-bundle warning remains.

The mobile dependency audit still reports the existing 23 advisories (16 high, seven moderate). Dependency files were unchanged; the proposed forced fix would downgrade Expo to version 44 and was not applied in this account-access task.
