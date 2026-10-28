# Philippine government ID number formats

Verified October 9, 2026 for the MedCore repayment-plan form. The rules validate identifier structure only; they do not authenticate a document, establish ownership, or check expiry.

| Selected document | Number to collect | Length without separators | Recognized presentation |
| --- | --- | --- | --- |
| PhilSys National ID | Public PhilSys Card Number (PCN) | 16 digits | Four groups of four digits; 19 characters with hyphens |
| UMID | Common Reference Number (CRN) | 12 digits | 4-7-1 digit groups; 14 characters with hyphens |
| LTO driver's license | License number on the card | One letter and ten digits (11 characters) | Letter/two digits, two digits, six digits; 13 characters with hyphens |
| Philippine passport | Passport number on the data page | 7–9 alphanumeric characters depending on generation | Current letter/seven digits/letter; older letter/six digits or two letters/six-or-seven digits |

## Sources and interpretation

- [PSA advisory on PhilSys](https://psa.gov.ph/content/advisory-1): distinguishes the confidential 12-digit PSN from the public 16-digit PCN printed on the card. MedCore explicitly requests PCN; a 12-digit PSN is rejected.
- [Microsoft Purview UMID definition](https://learn.microsoft.com/en-us/purview/sit-defn-philippines-unified-multi-purpose-identification-number): documents the 12-digit CRN and 4-7-1 grouping. This is a primary technical reference for identifier detection, not a government issuance/identity verification service. A ten-digit SSS number is not accepted as a UMID CRN.
- [LTO LTMS enrollment annex published by the Philippine Embassy](https://phnompenhpe.dfa.gov.ph/images/Annex_B_-_LTO_Steps_to_enroll_to_the_LTMS_Portal.pdf): its indexed license-number example has one letter and ten digits. The conventional 3-2-6 grouped presentation is also seen in [LTO records hosted by the government FOI portal](https://www.foi.gov.ph/requests/serial-number-on-my-driver-license/). The 11-character count is derived from that pattern; a card serial number is a different field. These public examples were not copied into app defaults or tests. Direct PDF retrieval returned HTTP 403 in this environment; indexed source text and the government-hosted record corroborated the pattern.
- [Microsoft Purview Philippine passport definition](https://learn.microsoft.com/en-us/purview/sit-defn-philippines-passport-number): documents the four supported structures above. It explicitly covers older generations; accepting their format does not imply the passport is unexpired. The recent `PP` passport **document type code** described in [PNA's DFA announcement](https://www.pna.gov.ph/articles/1270638) is a separate field, not an instruction to prefix a passport number with PP.

## Application decision

Use one shared, dependency-free rule module for the mobile app, dashboard and API. Permit plain numbers and the defined ASCII grouped separators; normalize accepted input to a consistent stored representation while preserving leading zeros. Reject surplus characters, wrong digit/letter counts, control characters, prefixes such as CRN-, Unicode lookalikes and unsupported ID types. Do not erase arbitrary invalid characters or truncate them into a valid number.

No invented checksum, issuer match, expiry or fraud score is applied. Existing historical notes are not rewritten. Existing valid formatted IDs can recover the same note after an equivalent normalized retry; historical malformed IDs need hospital review rather than automatic re-execution. Non-Philippine passport formats are outside the existing Philippine-ID selector and require a separate issuer/country workflow in the future.

Implementation: [`packages/domain/src/governmentId.ts`](../../packages/domain/src/governmentId.ts).
