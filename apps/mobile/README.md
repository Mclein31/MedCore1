# MedCore mobile

Patient financial companion in the MedCore monorepo. Expo / React Native connects directly to the shared Hono / PostgreSQL backend. This is a reviewed prototype; it is not a clinical EMR or a production payment gateway.

## Development

Install the existing root and mobile workspace dependencies. Copy `.env.example` to `.env`; keep `.env` untracked. Start the backend with `npm run dev` and the Expo preview with `npm run web`, `npm run ios`, or `npm run android`.

On a physical phone, use the development computer’s LAN address for `EXPO_PUBLIC_API_BASE_URL`. Loopback works only when the backend is on the same device or a compatible simulator. Release builds require an explicit HTTPS API address. The EAS project must be configured with a real project before native distribution.

Register a patient account using a matching MRN and contact number from the hospital’s demo admissions. Legacy phone-only accounts must be linked through registration; a phone number alone cannot select a patient. Staff accounts are rejected by the mobile sign-in flow.

## Checks

Run from `apps/mobile`:

```sh
npm run lint
npm run typecheck:server
npm test
npm run test:server
npx expo export --platform all --output-dir /private/tmp/medcore-mobile-build
```

`lint` uses strict TypeScript and unused-symbol checks. Tests deliberately use the installed monorepo root `tsx` loader; they never invoke `npx` to fetch a missing runner. Install root tooling before running them. Backend tests use synthetic in-memory rows and do not connect to PostgreSQL or reseed admissions.

## Current behavior

- Protected navigation and one account-scoped patient snapshot shared across tabs; focus/foreground refreshes retain visible data and show refresh errors.
- Remaining balances are distinguished from original patient responsibility. Itemized charges are searchable and show coverage explanations, statutory discounts and recorded payments.
- Documents retain their identity; selected receipts/plans and the current discharge pass/exit PIN can be viewed through patient-scoped endpoints.
- Native payment attempts are saved in SecureStore before transmission, with their account, encounter, immutable input and idempotency key. An interrupted request is recovered before another payment is allowed. Web preview retains attempts in memory only.
- Local demo checkout is clearly labeled. Patient simulated payment/note creation is rejected by a production backend, and early-stage bills cannot trigger online discharge settlement. Staff demo workflows still exist and are not a real payment/signing integration.
- Password recovery is hospital-assisted; push delivery and document upload are not implemented. The app does not request push permission on startup.

See [AUDIT.md](AUDIT.md) for review findings, verification and remaining release requirements.
