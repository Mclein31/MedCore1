# MedCore mobile

Patient financial companion in the MedCore monorepo. Expo / React Native connects directly to the shared Hono / PostgreSQL backend. This is a reviewed prototype; it is not a clinical EMR or a production payment gateway.

## Development

Install the existing root and mobile workspace dependencies. Copy `.env.example` to `.env`; keep `.env` untracked. Start the backend with `npm run dev` and the Expo preview with `npm run web`, `npm run ios`, or `npm run android`.

Expo Go includes fixed native modules. Keep the three native packages at the SDK-supported ranges: AsyncStorage `2.2.0`, safe-area context `~5.7.0`, and screens `~4.26.0` for Expo SDK 57. Use `npx expo install --check` before changing these dependencies; `npm test` also checks their installed compatibility. Updating their JavaScript packages beyond Expo Go’s native versions can bundle successfully but fail on the simulator.

After changing native package versions, stop the running Expo process and run `npx expo start --clear` from `apps/mobile`, then press `i`. A full reload is required; hot reload can retain old native view registrations. Keep the backend running separately. MedCore uses the existing Expo status-bar API throughout, with focused screens controlling light/dark text; it does not mix native-stack controller-based status-bar options with Expo’s default iOS configuration.

On a physical phone, use the development computer’s LAN address for `EXPO_PUBLIC_API_BASE_URL`. Loopback works only when the backend is on the same device or a compatible simulator. Release builds require an explicit HTTPS API address. The EAS project must be configured with a real project before native distribution.

Register a patient account using a matching MRN and contact number from the hospital’s demo admissions. Legacy phone-only accounts must be linked through registration; a phone number alone cannot select a patient. Staff accounts are rejected by the mobile sign-in flow.

## Checks

Run from `apps/mobile`:

```sh
npm run lint
npm run typecheck
npm run typecheck:server
npm test
npm run test:server
./node_modules/.bin/expo export --platform all --output-dir /private/tmp/medcore-mobile-build
```

`lint` uses strict TypeScript and unused-symbol checks. Tests deliberately use the installed monorepo root `tsx` loader; they never invoke `npx` to fetch a missing runner. Install root tooling before running them. Backend tests use synthetic in-memory rows and do not connect to PostgreSQL or reseed admissions.

## Current behavior

- Real MedCore PNG branding, restrained teal emphasis, readable financial summaries, grouped lists and compact Home actions. Launcher assets are prepared from the original badge with `node scripts/prepare-brand.cjs` using existing Expo tooling.
- Initialization coordinates session verification and introduction preferences; first-time signed-out users see a three-page introduction with Next/Back/Skip. Interrupted progress, completion and skipping persist in AsyncStorage. Verified sessions bypass the introduction and persist completion even when logout precedes preference restoration; session outages show retry before any patient records. Preload motion stops after two cycles and respects reduced motion.
- Protected navigation and one account-scoped patient snapshot shared across tabs; focus/foreground refreshes retain visible data and show refresh errors.
- Remaining balances are distinguished from original patient responsibility. Itemized charges are searchable and show coverage explanations, statutory discounts and recorded payments.
- Documents retain their identity; selected receipts/plans and the current discharge pass/exit PIN can be viewed through patient-scoped endpoints.
- Native payment attempts are saved in SecureStore before transmission, with their account, encounter, immutable input and idempotency key. An interrupted request is recovered before another payment is allowed. Web preview retains attempts in memory only.
- Checkout supports Bill → Continue to Payment → method (GCash default) → details → review → backend processing → Payment Successful → receipt/history. GCash/Maya have credential-free details; cards validate transient number/expiry/CVV locally and send only brand/last four; BPI/BDO are selectable with authentic logos. A dedicated backend service simulates all payment methods in local and hosted builds without real providers or money transfers. Native immutable retry storage and server ownership/centavo/idempotency/atomic-write rules remain. Early-stage bills are blocked, and notes keep their separate rules. [Implementation and verification limits](../../docs/implementation/simulated-payments.md).
- Password recovery is hospital-assisted; push delivery and document upload are not implemented. The app does not request push permission on startup.

See [AUDIT.md](AUDIT.md) for review findings, verification and remaining release requirements.

The October 8 [UI refinement report](validation/refinement/README.md) maps all six annotated `needs_fix` screenshots to the implementation, actual native/browser captures, shared header/card/navigation geometry and regression results. Pending clearance explains payment availability; it does not bypass settlement safeguards.

The additional `npm run test:qr` check requires macOS Vision and independently decodes 12 path rasterizations across three existing prototype payloads at 135/180/225/270 pixels. The general suite checks routing, persistence, status/confirmation and QR geometry on every platform. Decoding verifies the supported prototype payload; it does not establish real wallet acceptance. See the audit for physical-device and release limitations.
