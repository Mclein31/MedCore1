# Mobile progress audit — 2026-10-06

## Final verdict

The independent code-reviewer audited the current implementation, reviewed fixes, then checked the final files again: **ready for a progress commit as a patient prototype; not ready for production release**. No remaining blocker was found for the progress commit.

## Findings fixed

1. Internal record reads lacked authentication or allowed patient accounts to use staff routes. Central API access now requires authentication, restricts patients to their own endpoint namespace and explicitly authorized mutations, and covers duplicate route aliases. Staff census, bed, claim, note, analytics and relevant mutation queries are facility-scoped.
2. Patient encounter responses spread staff hydration and exposed unnecessary identifiers, signing/gateway fields and staff metadata. An explicit response projection now limits patient fields. Pass PINs are matched to the exact pass number; expired passes cannot be used for lobby exit.
3. Credentialed CORS accepted arbitrary Vercel names containing brand text. Only exact trusted origins/configured previews are accepted; development hosts are parsed. Patient sessions cannot elevate through development role headers. Database URLs and raw exceptions are excluded from error output.
4. Payment/note mutations read balances outside transactions, accepted unrelated encounters, and could expose another cached payment. Authorization precedes recovery; encounter row locks, centavo guards, immutable idempotent payment matching, and matching active-note recovery protect settlement. Disputed charges must belong to the authorized stay.
5. Recalculation could restore a stale paid balance or financed principal to cash outstanding. It now shares the encounter lock with settlement, persists financial updates atomically, reads recorded payments from the encounter, and deducts active financed principal. Zero balance releases an exit pass only at the settlement stage.
6. Registration allowed arbitrary contact input for blank hospital phone records, and phone fallback could select another family member. Both paths fail closed; a verified MRN association is required. Identity possession verification remains a release requirement.
7. SecureStore-unavailable sign-in omitted bearer tokens; startup network failures erased sessions; expired-session callbacks could turn a 401 into a session-change error. Session tokens remain usable in memory, transient verification failures preserve saved sessions, and actual expiry clears protected state while preserving the 401 result.
8. Checkout could double-submit before UUID generation, silently transform invalid amounts, lose its retry key on restart, or erase a different pending intent after a failed save. It now locks before awaits, parses amounts strictly, persists native attempts before sending, restores authoritative intent under the account lock, and completes only the matching saved key. Production patient simulation and premature online settlement are blocked.
9. Screens had independent stale snapshots, false settled/loading states, hidden refresh failures and late response races. Shared patient state, focus-aware list loaders, loader-associated results, and post-body account checks address these paths.
10. Document selection discarded receipt/note identity or displayed a newer pass for a historical selection. Details retain the selected document ID, validate its stay, and fail closed for a mismatched historical pass.
11. The installment preview could generate negative final payments for tiny principals. Device and backend previews now use integer centavos and allocate the remainder to the final installment.
12. UI improvements include clearer Home priorities, configured hospital identity, complete discount explanations, searchable charges, honest HMO exclusions, account-scoped notification read state, responsive values/QR previews, safe areas, keyboard handling, password visibility, input feedback and a retryable startup boundary.
13. Release configuration silently used HTTP loopback; test invocation could fetch undeclared tooling. Releases require configured HTTPS; tests explicitly use existing root tooling. The fake EAS project ID was removed. Backend type errors were corrected against the existing schema, without adding fields or migrations.

## Verification

- Mobile strict TypeScript / unused-symbol checks: passed.
- Backend strict TypeScript: passed.
- Mobile regression checks: 31 passed.
- Backend isolated handler/financial checks: 18 passed, including 906 centavo installment schedules.
- iOS, Android and web Expo exports: passed. These are bundle exports, not signed native builds or device certification.
- Independent final review and `git diff --check`: passed.

The backend test transactions are synthetic; no PostgreSQL connection, data mutation or reseeding was performed by the regression suites. Earlier local API/account inspection was read-only apart from temporary login sessions, which were revoked.

## Release work still required

- OTP/possession verification, abuse/rate-limit controls and a backend-bound expiring magic-link flow. The existing dashboard Clarify selector remains a demonstration, with no public census exemption.
- Actual payment gateway verification, legal signing and production simulation controls for staff. Existing demo settlement is not evidence of funds transferred.
- Physical iOS/Android validation of storage failures, process restarts, logout, keyboards, safe areas and assistive technologies; real PostgreSQL transaction/concurrency integration checks.
- Dependency advisories: the last npm audit reported 16 high and 7 moderate findings in the Expo/tooling dependency tree. Its suggested forced downgrade to Expo 44 was not applied. Resolve advisories with compatible supported updates before release.
- The visual references were supplied and implemented in the October 7 update below. Preserve MedCore identity and prioritize usability.

No commit, deployment, schema application, reseeding or dependency upgrade was performed during this review cycle. Existing unrelated Obsidian graph and VALUE_PROP work remain outside the proposed progress commit.


## UI/UX implementation review — 2026-10-07

### Reviewer verdict

**Ready for a patient-prototype progress commit; no remaining actionable findings.** The code-reviewer independently audited the implementation, re-audited the fixes, and completed a final source audit. Production release still depends on the existing gates above.

### Implemented

- All six `UI_INSPO` images informed the direction: restrained teal, white surfaces, prominent financial amounts, compact actions, grouped separator rows and a focused receipt. The researcher studied official production app screenshots/billing material; observed patterns and inferred recommendations are separated in [the research note](../../MedCore_Vault/RESEARCH/mobile_ui_patterns.md).
- The original MedCore badge and wordmark are copied byte-for-byte into the asset registry. Preload, onboarding, authentication, headers and receipts use them with contain sizing. Native packaging uses square 1024-pixel launcher canvases made with existing Expo tooling; the iOS/general icon is opaque RGB and the adaptive foreground retains transparency/padding.
- A bounded animated preload follows actual session/preference initialization, observes reduced motion and cleans up its animation/subscription. Three concise benefit pages provide Next, Back, Skip, progress and Get started. AsyncStorage preserves interrupted progress and completion/skipping. Verified sessions bypass onboarding and persist completion for later signed-out launches. The verified-user marker remains latched after early logout, so a slow preference restore cannot cause the tour to return. Session verification still takes priority; protected screens always require the current user.
- Home quick actions, shared typography/colors, grouped Profile sections, bill payment entry, document hierarchy and receipt links improve the existing financial screens. Tab labels wrap rather than truncate at compact widths; native bar height follows font scale. Invalid forms show a summary and focus the first invalid field.
- Checkout follows amount → method → details → review → actual processing → recorded result/receipt or repayment plan. GCash/Maya use fixed masked account/verification presets without provider password, MPIN or OTP fields. Card details remain limited to brand/last four digits; bank and 3/6/12-month note contracts are unchanged. Review retains the chosen amount when a live balance changes.
- The QR renders the exact encoded module geometry from the existing supported prototype payload. Black modules, a white square, six quiet modules and integer module sizing replace scaled/cropped artwork and overlays. Repeated demo-warning banners/labels were removed from the mobile flow. Internal flags, production gates and backend confirmation remain intact.

### Review fixes

The final review also fixed onboarding returning after a restored user logged out before preference loading finished; the latched verified-user marker skips only the introduction and cannot grant authentication. Native header/hardware back now follows checkout steps; swipe dismissal is disabled during this flow and busy removal protection remains. The processing modal supports bounded scrolling, safe areas and keyboard dismissal. Step/error changes reset scroll so failures remain visible, including pre-send storage failures and long note reviews. Payment statuses explicitly cover INITIALIZED, PROCESSING, SUCCESS, FAILED, CANCELLED and an honest unknown fallback; cancelled records cannot appear as processing.

### Verification

- `npm run lint`, `npm run typecheck`, `npm run typecheck:server`: passed (mobile scripts).
- `npm test`: **38 mobile checks passed**, including onboarding persistence/routing/session bypass, malformed preferences/storage failures, method validation, all payment statuses, backend-confirmation requirements and QR geometry. Existing account/idempotency/recovery tests remain passing.
- `npm run test:server`: **18 isolated backend groups passed**, preserving ownership, production gates, locking, idempotency and centavo reconciliation; no database was connected.
- Root `npm test`: **250 financial records reconciled with zero errors**.
- `npm run test:qr`: **12 independent macOS Vision decodes passed** for three original payloads at 135/180/225/270 pixels. This decodes rasterizations of the exact SVG path geometry, not photographs/screenshots from physical phones. Original PNGs also decoded to the documented payloads.
- Expo iOS, Android and web exports passed after the implementation. These are bundles, not signed native builds.
- Browser visual checks used an isolated loopback synthetic API: onboarding resume/reload/back/completion/Skip, returning signed-out auth, compact 320px/375px and larger 430px views; Home, Bill, Coverage, Profile, QR/review/processing/receipt, selected receipt identity, GCash preset verification, interrupted confirmation → same saved request → same receipt, and definitive rejection retaining editable details. The fixture never connected to hospital records. No real payment, registration or database mutation was performed. Reduced motion, native session restoration, native keyboards, device restart and screen-reader operation still require physical-device checks; source/logic validation does not certify them.
- Key body/status/button contrast pairs exceed 4.5:1; rail metadata measures 5.18:1–13.13:1; original logo bytes and launcher dimensions/transparency were verified. `git diff --check` passed.
- `npm audit --audit-level=high` still reports **23 pre-existing advisories (16 high, 7 moderate)** in Expo/tooling. No dependency versions changed; the suggested forced Expo 44 downgrade was not applied.

Operational implementation decisions and current progress are in the existing `.brain/PROJECT_CONTEXT.md`. No commit, deployment, schema change or reseeding was performed. User-supplied `UI_INSPO` files remain untracked and are excluded from the proposed progress commit.
