# Original patient UI on v2 — verification, 2026-10-17

Tested with Expo Go on iPhone 14 Plus (iOS 26.5), API 8788 and Expo 8081.

- Existing Maria session survived restart. Home → discharge pass → Documents → Hospital record showed the live pass and six-digit PIN. Her historical receipt showed the real payment reference, SOA, amount and rail.
- Linked MRN-240119 using MRN and date of birth, then the development emailed code. Bill → Medicines → charge → Question this charge created a dispute and showed “Billing issue under review.”
- Paid ₱500 by Visa brand + last four digits, then ₱750 by BPI Bank Transfer. Both API writes returned 201. Payment success → View Receipt showed the correct ₱500 receipt; Payments listed both receipts. Open dispute correctly prevented clearance despite zero balance.
- With the owner's approval, prepared MRN-240114 through staff final-LOA (zero amount), finalize and send actions, all 200. Mobile recorded its ₱964.29 six-month plan (201), showed five ₱160.71 installments and one ₱160.74 installment, and released a pass. View discharge pass → Documents → Hospital record showed that pass and six-digit PIN.
- Checked Home, Bill, Coverage, Payments, Profile, Documents, Hospital updates, Claims and record detail. Claims explicitly reports unavailable; updates are real stay timeline events, not push notifications.
- Cora returned its friendly AI-unavailable message. Scanner opened with an AI-unavailable message and does not request an image while unavailable.
- Cleared only the onboarding preference after sign-out. All three introduction pages and Get started worked.
- Linked draft MRN-240100 and verified Home, Bill, Coverage and Payments show an unavailable statement/balance, rather than fabricated zeros.

Original component layouts and assets come from main. Card entry intentionally collects only brand and last four digits for the simulated v2 rail. Patient claim status, detailed coverage allocation, unavailable hospital fields and AI are not inferred from financial totals.

Automated verification: root check (domain/API/mobile tests, types, lint), format:check and build. The bridge tests cover historical receipt lookup and confirmed promissory schedules in addition to mapping, auth, settlement, disputes and security headers.

Dependency audit separately reports inherited Expo dependency advisories; no forced dependency upgrades were applied as part of the UI port.
