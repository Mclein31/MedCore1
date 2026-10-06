# Mobile progress audit — 2026-10-06

## Final verdict

The independent code reviewer audited the current implementation, reviewed fixes, then checked the final files again: **ready for a progress commit as a patient prototype; not ready for production release**. No remaining blocker was found for the progress commit.

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
- Final visual direction awaits the user’s requested reference screenshots. Preserve MedCore identity and prioritize usability.

No commit, deployment, schema application, reseeding or dependency upgrade was performed during this review cycle. Existing unrelated Obsidian graph and VALUE_PROP work remain outside the proposed progress commit.
