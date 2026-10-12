# Cora language consistency and typing feedback — October 12, 2026

Cora has four distinct reply modes: English (`en`), Taglish (legacy `fil`), Tagalog (`tl`) and Ilokano (`ilo`). The selected mode takes priority over the language of the question, prior messages and recorded charge descriptions. Suggestions, welcome text and the input placeholder follow the selection. Navigation action labels come from a fixed localized map for the four supported navigation actions.

Language selection is shared across Home, Bill and hospital-record Cora windows, keyed by the verified account. This is an in-memory app-session preference; it survives opening another Cora window, but is not persisted across a cold restart. Language switching synchronously cancels pending requests and speech recognition. Request identity/context checks discard obsolete replies and prevent old completions from clearing a newer request's loading state. Previous chat remains available as untrusted topic context; generated replies carry a visible language label.

The server independently reviews the scrubbed draft's language before rehydration. If it fails, Cora generates one new draft against the same evidence and checks it again. Both attempts share a 40-second answer budget; each review has at most seven seconds. Failure returns an explicit error rather than a wrong-language successful answer or canned draft. The existing topic gate, ownership/role checks and authoritative balance remain intact. Language review adds one short provider call to a normal allowed answer.

A hosted Tagalog check exposed a false rejection: the original review prompt included Taglish-only rules even for other languages. The corrected review receives only the selected mode's rules, allows proper names/acronyms/recorded technical item names, and uses server-localized navigation labels. Three targeted repeats of the previously rejected case passed before publishing the correction.

The old spinner and “Cora is verifying statutory rules…” sentence are replaced by three small pulsing dots. They use native-driver opacity/scale animation, stop on unmount, and remain static under Reduce Motion. An accessible localized typing label remains available to screen readers without visible checking prose.

## Verification

- `npm run test:ai`: 42 isolated backend groups, including wrong-language refusal, one regeneration/recheck, four modes, canonical action labels, invalid review failure, deadlines, preserved mixed-language context, privacy/role boundaries and grounded financial facts.
- `npm run test:cora`: eight groups mounting the actual mobile modal with deferred transport and controlled native animation. Includes duplicate sends, late results, closing/reopening, account/encounter changes, speech callbacks, static reduced-motion dots and account-scoped cross-window preference sharing.
- `npm test --prefix apps/mobile`: 56 existing checks.
- Dashboard production build, server/mobile strict types, standalone test/script types and 12 existing overlay groups pass.
- iOS/Android/web Expo exports pass. Native device/VoiceOver inspection remains separate from exports and controlled animation tests.
- Browser verification at 390px with normal motion and 320px with reduced motion confirms four choices, actual opacity pulsing/static dots, cancellation, retained topic history and Home→Bill language sharing. See [UI results](../../../apps/mobile/validation/cora-language/results.json) and [typing screenshot](../../../apps/mobile/validation/cora-language/screenshots/typing-english-390.png). The root `UI_SCREENSHOTS/mobile/16-cora-assistant.png` was refreshed.
- Real Gemini synthetic evaluations passed all four modes with conflicting-language questions/history and preserved the supplied amount/item. See [live-results.json](live-results.json).
- Hosted checks used the actual mobile `ApiClient`/`createAiApi`, the existing authorized presentation principal and its selected encounter. All four choices returned the correct language metadata and authoritative balance; responses passed the server language review. No patient names, identifiers, balances, generated replies or credentials are saved in [hosted-results.json](hosted-results.json). No hospital financial record was mutated.

Reproduce live synthetic checks from the project root, with the existing local Gemini configuration:

```sh
node --import ./node_modules/tsx/dist/loader.mjs scripts/testCoraLanguage.ts
```

Reproduce hosted checks by setting the endpoint:

```sh
MEDCORE_CORA_LANGUAGE_BASE_URL=https://medcore-backend.mcleinonza0531.workers.dev node --import ./node_modules/tsx/dist/loader.mjs scripts/testHostedCoraLanguage.ts
```

The browser harness is `apps/mobile/validation/cora-language/qa.mjs`; it uses the existing loopback synthetic fixture and mobile preview described in `apps/mobile/validation/apple-ui/README.md`. Browser replies are controlled test fixtures, not live AI responses.

## Publication

The final backend is live on the existing Worker, version `73a0ce2b-d328-4c61-85f2-1e3648ebf589`. Mobile changes require a reload/rebuild; source changes have not been committed or pushed by the agent. No dependencies changed. Existing dependency audits report 17 root and 22 mobile advisories; dependency upgrades remain outside this fix.
