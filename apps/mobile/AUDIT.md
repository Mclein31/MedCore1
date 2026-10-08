# Mobile progress audit — 2026-10-06

> October 8 payment requirement update: the historical production-payment rejection and preset wallet stages below are superseded by the user's backend-owned university simulation requirement. Current code uses one isolated simulated processor in local/hosted builds, normal payment screens, local-only card validation, BPI/BDO selection and confirmed success/receipts. Latest checks: mobile41, isolated backend26, dashboard auth6, 250-record audit, strict checks/build/three exports pass; real PostgreSQL execution is blocked by EPERM and complete device/receipt/responsive QA remains pending. See [the current implementation report](../../docs/implementation/simulated-payments.md).

Latest close reference-match implementation and verification: October 8, 2026. See the final section below and [screenshot/comparison report](validation/reference-match/README.md). Earlier sections retain the preceding audit history.

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


## Close reference-match implementation — 2026-10-08

**Reviewer verdict: ready for a patient-prototype progress commit; no remaining actionable source findings.** The reviewer audited the implementation, identified three P2 state/contrast regressions, verified their fixes and completed a final follow-up audit. The primary agent implemented, validated and updated the existing Brain.

### Reference fidelity

All seven actual images were opened; the long Main montage was inspected in eight enlarged bands. A primary reference was selected for each screen before implementation. Actual app captures were compared with cropped, equal-width references; image heights were preserved. [The mapping](../../MedCore_Vault/RESEARCH/mobile_reference_mapping.md) and [full comparison report](validation/reference-match/README.md) record source bounds, measured-versus-estimated geometry, screen links and intentional differences.

This pass closely matches the references' compact headers, typography, financial-panel proportions/overlap, circular shortcuts, amount keypad, grouped payment options/settings, fixed actions, paper receipts and bottom confirmation sheet. Dashboard navy/blue/slate tokens plus accessible teal are centralized in a pure theme; real MedCore PNGs are retained. Original financial onboarding art replaces doctor photos; unsupported clinical/settings/social features were not added. All existing patient/account/payment contracts and safeguards remain.

### Findings fixed

- Missing current encounters no longer imply a displayed zero balance. Home says “No current statement.”
- Amount-refresh failures have an in-place Retry preserving mode/input.
- Inactive amount-mode contrast increased from3.52–4.14:1 to6.34–7.37:1.
- Partial input width/peso-prefix overflow, Profile group spacing, keypad scale, methods grouping and receipt edge reuse were corrected. Final screenshots omit only Expo development chrome via test-harness CSS.

### Final verification

- Required `npm run lint`, `npm run typecheck`, `npm run typecheck:server`, `npm test` (**39 passed**) and `npm run test:server` (**18 isolated groups passed**): all passed. No database connection.
- Expo exports for **iOS, Android and web** passed on final source; bundles are not signed native builds. Validation configuration did not edit .env.
- Root financial audit: **250 records, zero reconciliation errors**.
- **12 independent Vision QR decodes**, plus the final QR crop and full-screen screenshot: passed to the unchanged existing payload. Sandbox model loading failed; approved unsandboxed reruns passed. QR decoding is not gateway settlement.
- Reproducible browser suites passed with `pageErrors: []`: introduction persistence/Back/completion, login validation/logout,320/390/430px layouts, exact-centavo editing/keyboard alternative, all six rails/confirmed plan, definitive rejection/retry, duplicate clicks/same-key recovery, selected document identity, loading/error/retry, missing-statement state, compact keypad scrolling, long text and CSS150% magnification.
- Actual dashboard payment modal was visually inspected using existing synthetic presets with every API request intercepted. No dashboard source change was made for this work.
- Independent re-audit and scoped diff-check: passed. Detailed screenshots, flow/state JSON evidence and reproduction scripts are in `validation/reference-match`.

### Limits and scope

Physical native storage/session restoration/restart, keyboard/safe areas/text scaling/reduced motion/screen-reader checks remain, along with the existing production release gates recorded above. Web intentionally has memory-only auth/payment recovery. Reference photos/branding/settings/clinical content are replaced by supported MedCore content; native system fonts and accessible tap input account for documented visible differences. No mobile dependency was added; Playwright was installed only in temporary tooling. Separate user branding commits/edits are preserved; the current mobile wordmark/root favicon edits and original UI_INSPO uploads are excluded from the suggested progress commit. No commit/deploy/schema change/reseed was performed.


## Expo Go iOS startup fix — 2026-10-08

The reported “We could not load your introduction preferences” screen was caused by an incompatible native storage package: installed AsyncStorage 3.1.1 requested the `RNAsyncStorage` v3 interface, while Expo SDK 57/Expo Go supplies AsyncStorage 2.2.0 (`RNCAsyncStorage`, callback-based reads). The default v3 export preserves legacy data access but still requires v3 native code. The backend is not involved in reading this preference.

Targeted `expo install` aligned AsyncStorage to 2.2.0, safe-area context to ~5.7.0 (installed 5.7.0), and screens to ~4.26.0 (installed 4.26.2). The latter two were adjacent SDK compatibility drift. Package/lock changes are limited to these packages and their storage transitive dependencies. A regression comparing installed versions with Expo’s bundled-native metadata failed before the fix and now passes.

Native verification exposed a second conflict: native-stack `statusBarStyle` requires controller-based iOS status bars (`UIViewControllerBasedStatusBarAppearance=YES`), while the existing Expo status-bar API and Expo’s default configuration use global control (`NO`). Native-stack overrides were removed. A focus-aware Expo status-bar component controls Home/payment dark headers; root/recovery defaults remain dark text over white. The existing preload/onboarding/error bars keep the same global API. No new dependency, Info.plist workaround, storage bypass, authentication or payment-contract change was introduced.

Verification: mobile lint/typecheck, **40 regressions**, server typecheck, **18 isolated server groups**, Expo iOS/Android/web exports and diff-check passed. `expo install --check` reports dependencies up to date. On the user’s booted iPhone 14 Plus / iOS 26.5 Expo Go simulator, the introduction appeared, Next advanced to coverage, and completed preferences restored to sign-in on full reload. After the status-bar fix, sign-in reloaded without the preference error or native red box. Native UI was observed through the simulator’s accessibility tree; no patient login, payment or database mutation was performed. Hot-reload duplicate view registrations were cleared with a full Metro reload. Independent reviewer: no actionable findings; approved for a patient-prototype progress commit. Other physical-device/session/payment release gates remain as recorded above.

Restart procedure after installing these versions: stop Expo, run `npx expo start --clear` from `apps/mobile`, then press `i`. The backend can stay running. No commit or deployment was performed.


## Annotated UI refinement — 2026-10-08

**Reviewer verdict: ready for a patient-prototype progress commit; no remaining actionable source findings.** The independent audit found an inherited flex basis making the Payments action too tall and insufficient white-description contrast on the new teal panel. Both were fixed and re-audited: 50px action and 4.85:1 contrast. Header Back callbacks/busy guards, safe-area handling, search, asset provenance and payment restrictions were reviewed.

All six `apps/mobile/needs_fix` screenshots were inspected and addressed. Shared tab/stack headers now use white surfaces, gray separators and a 56px minimum row with consistent slots/title/Back geometry; Home keeps its branded lockup, auth/onboarding remain intentionally different. Current header status text is dark through the existing focused Expo component, superseding the earlier dark-header styling. Profile's duplicate top control and the navy bottom-inset strip are removed. Home/Bill/Payments reuse solid teal summary properties, shortcut/navigation geometry and modest 20/18/16/14/12 text hierarchy. Bill's greeting is replaced by its title. Charge search is visibly labeled inside the input with a trailing icon. Verified official wallet/QR/card-network assets replace invented monograms; no provider integration was added.

The native seeded encounter remains in `HMO_FINAL_LOA`. Payment is gated correctly until `PENDING_SETTLEMENT`; no backend stage or settlement guard was bypassed. The waiting state now explains the reason and offers active Review bill, and Home/Bill offer Payments history. Eligible synthetic fixtures complete checkout. Patient APIs, identity/ownership, exact cents, duplicate-submit protection, encrypted immutable retries, idempotency, internal simulation flags, production restrictions and backend SUCCESS/receipt requirements are unchanged.

Final checks passed: `npm run lint`, `npm run typecheck`, `npm run typecheck:server`, **40 mobile tests**, **18 isolated server groups**, all three Expo iOS/Android/web exports and scoped diff-check. Reproducible final Playwright runs passed with no page errors: 29 standard header measurements at56px,320/430px layouts/navigation/selected documents/Back, visible search/results/empty feedback, pending-HMO explanation with zero payment requests, interrupted onboarding/logout, six payment rails/review/confirmed receipts and plan, duplicate clicks/same-key retry, rejection/recovery, document loading/error/retry, balance-input preservation and long text/CSS150%. No database or gateway was used by browser/server tests.

Actual native simulator capture/interaction covered signed-in Home, Bill, filtered search, waiting Payments → Review bill, Profile and Documents → Back. Full Metro reload restored the valid authorized test session directly to Home. Native evidence uses the public synthetic seed patient; no payment/financial-record mutation was performed. [Per-image adjustments, before/after comparisons, screenshots, JSON results and reproduction instructions](validation/refinement/README.md) distinguish these native checks from browser approximations.

Remaining limits: physical Android/iOS and native Dynamic Type, reduced motion, screen readers, software-keyboard avoidance and storage/session failure/restart scenarios still require device checks. QR payload/vector geometry is unchanged and remains covered by module tests and the prior independent decoder evidence. The provider-supplied80×50 Mastercard raster has lower resolution than other originals; labeled contain sizing preserves readability. Existing release gates remain. No new visual-pass dependency, schema/backend contract change, reseed, staging, commit or deployment occurred; earlier pending Expo Go fixes and unrelated user changes were preserved.

Final cleanup also reproduced and removed a React development console warning: the decorative amount-entry SVG now uses `aria-hidden` on web and keeps `accessible=false` on native. Functional content is outside that layer; geometry is unchanged. Required checks and all three exports passed again, the final 12-screen run has no page/console errors, and the reviewer independently approved this follow-up.
