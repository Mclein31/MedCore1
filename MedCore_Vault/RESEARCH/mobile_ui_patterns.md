# Mobile patient financial UX patterns

Reviewed: 2026-10-07. Scope: MedCore's existing Expo patient financial companion. Research informs presentation and interaction; it does not authorize new APIs, clinical features, real wallet destinations, or provider authentication.

Related: [product model](../PRODUCT/product_model.md), [patient value proposition](../PRODUCT/value_proposition.md), [mobile audit](../../apps/mobile/AUDIT.md). The current native app described in `.brain/PROJECT_CONTEXT.md` supersedes historical vault statements that the patient client is exclusively a future PWA.

## Evidence and limits

All six supplied `apps/mobile/UI_INSPO` images were visually inspected. The long `Main_overall_app_inspo.jpg` was also inspected in six readable segments. Official App Store screenshots were inspected for MyChart, UnitedHealthcare, and Kaiser Permanente. Official billing instructions, a product demonstration transcript, Cedar's payment-plan product visual, and Philippine wallet help pages were reviewed. Public screenshots establish visible hierarchy, not unobserved runtime behavior. No protected production patient account was accessed. Loading, empty, and authentication-failure behavior below is recommended where public materials do not establish it.

## Primary visual references

| Reference | Observed treatment | Adaptation for MedCore and why |
| --- | --- | --- |
| `Main_overall_app_inspo.jpg` | CareConnect screens use white canvases, dark sans-serif text, compact labeled fields, pill-shaped primary actions, consistent back controls, short onboarding pages with Skip and dots, and persistent labeled navigation. Payment methods use radio rows, review uses aligned label/value details and separators, and completion uses a checkmark plus a next action. | Carry the rhythm and clear progression into billing, coverage, payments and documents. Use existing financial content instead of the reference's booking, clinical categories, maps, or calls. Keep button labels visible; icons supplement text. |
| `overall_app_inspo(do not copy the bright blue color pallete).jpg` | One prominent balance panel, small quick actions, recent activity, profile rows with trailing values/chevrons, focused amount entry and review. The request screen contains a clear square QR on white. | Use a single outstanding-balance summary and useful shortcuts. Do not import the vivid blue palette, generic wallet accounts, spending charts, floating plus action, or unsupported transfer functions. |
| `Bill_display inspo.jpg` | Prominent balance with contextual metadata, four compact icon actions, then a divider list; moderate corner radii and limited elevation. | Emphasize financial responsibility once, then explain deductions using straightforward rows. Section grouping is sufficient for routine information; every row does not need its own floating card. |
| `Bill_display_and_receipt_inspo.jpg` | Dark header, green financial emphasis, a focused receipt surface with success status, recipient, reference, date, details, separators, total and bottom actions. | Give recorded payments a reusable receipt hierarchy. The reference's torn-paper edge is optional decoration; complete, readable recorded details matter more. Never fabricate a merchant or reference. |
| `payment input ui.png` | Large centered amount, available balance context, focused numeric input area and a prominent confirmation affordance. | Make partial amount entry legible and keyboard friendly, with a clear amount limit and explicit review. Prefer native decimal input and a button over a custom keypad or swipe-only confirmation. |
| `Profile tab inspo.jpg` | The “After” screen groups Account, Preferences and Support, with separators, trailing current values and a stable identity summary. | Use supported account/contact/support sections and plain row treatments. Grouping reduces scanning effort. Do not add language/theme/edit controls merely to match a reference when functionality is unsupported. |

The screenshots suggest a calm, light interface with dark ink, clear spacing and selective financial emphasis. Exact font families and measurements cannot be established from these raster references. Native typography and a consistent spacing scale are suitable inferred implementations. Current mobile tokens use bright blue; the actual MedCore PNG wordmark spans blue, teal and green. A restrained teal/dark-ink UI can follow the allowed brand spectrum while leaving the supplied logo pixels unchanged.

## Production healthcare interfaces

### MyChart

**Observed:** The official App Store home screenshot presents labeled shortcuts, including Billing, followed by contextual next tasks. Epic's billing guide describes Billing Summary, account-specific balance details and past statements, amount entry, payment-method selection and Pay. Separate authorized accounts are explicitly distinguished. A health system's plan instructions calculate suggested payment amounts/counts from the balance, then let the patient review or modify them. [App Store screenshots](https://apps.apple.com/us/app/mychart/id382952264), [Epic billing instructions](https://www.mychart.org/l/en-us/help/billing/), [Genesis payment-plan instructions](https://mychart.genesishcs.org/MyChart/en-us/education/paymentplan.pdf).

**MedCore inference:** Keep Home focused on the current stay and next financial action, then offer durable Bills/Coverage/Payments/Documents destinations. Account/stay context belongs beside details. A payment plan should display principal, term, monthly payment and total before execution; use MedCore's existing centavo-exact, zero-interest schedule rather than copying US financing policies. Why: the patient can see what is owed and what the chosen action changes before committing.

### UnitedHealthcare

**Observed:** Official screenshots show a financial/coverage summary, labeled remaining spending limits, grouped benefit rows with separators, and a five-item labeled bottom navigation. A cost-detail screen makes the amount prominent and offers separate Estimate details, Cost summary, and More information rows. The listing states claims can be followed from start to finish and that features vary by plan. Its accessibility section does not establish supported assistive features. [Official App Store listing/screenshots](https://apps.apple.com/us/app/unitedhealthcare/id1348316600).

**MedCore inference:** Separate approved coverage from pending claims and patient balance; always label the amount's meaning. Use status text alongside color, expandable explanations and full-width detail rows. Why: a coverage figure without a state or meaning can be mistaken for money already deducted. Do not import deductible trackers unless MedCore has authoritative data for them.

### Kaiser Permanente

**Observed:** Official home screenshots begin with a greeting and a current action, then a Welcome Steps progress panel. Record screens use grouped separator rows and labeled bottom navigation. Billing help connects View/Pay, billing/payment detail tabs, payment history and eligible payment plans. It limits payment to the posted statement balance. The official demo transcript includes sign-up/sign-in, security features and bill payment. [App Store screenshots](https://apps.apple.com/us/app/kaiser-permanente/id493390354), [billing help](https://healthy.kaiserpermanente.org/southern-california/support/pay-bills/medical-bills), [official demo transcript](https://business.kaiserpermanente.org/content/dam/kp/ccp/documents/transcripts/MobileAppDemoVideo-Transcript.pdf).

**MedCore inference:** Use a concise first-launch benefits introduction with persisted completion/Skip, as required by the user. This is separate from real account initialization and session verification. Keep the authenticated Home's next action based on actual stay/payment/discharge state. Why: introductory content should not obscure a returning patient's time-sensitive information. The screenshot does not prove Kaiser uses a mandatory pre-login onboarding tour.

### Mayo Clinic

**Observed:** Official billing documentation describes open visits with balances, total balance owing, itemized/monthly statements, payment and payment-plan actions. Itemized statements are selectable by visit date/facility, and payments/receipts are available with billing details. A statement can legitimately be absent because no balance is due or the viewer lacks billing-addressee access. [Online billing FAQ](https://www.mayoclinic.org/billing-insurance/patient-online-services-frequently-asked-questions), [billing process](https://www.mayoclinic.org/billing-insurance/bills-payments/billing-process).

**MedCore inference:** Show document type, date, stay and status in the list; open the selected identity, not simply the latest record of that type. An empty documents list should explain the actual absence rather than imply an app failure. Why: patients need to distinguish a statement, receipt, repayment agreement and discharge pass, and historical selections must remain trustworthy.

### Cedar Pay

**Observed in official product material:** A mobile plan visual pairs payment frequency with a prominent monthly amount, plan length, adjustable amount and optional partial payment. The product page describes integrated benefit/billing information and configurable plan guardrails. Cedar cautions that product visuals may be in development and functionality can depend on integrations; this is product evidence, not a verified live patient session. [Cedar Pay product page and visual](https://www.cedar.com/solutions/cedar-pay).

**MedCore inference:** Offer only the existing supported terms; display the schedule impact immediately and retain a review step. Do not add sliders, biweekly terms, discounts, HSA funding or cancellation promises without support. Why: affordability decisions depend on concrete installment amounts and dates, not merely a term selector.

## Philippine payment patterns and QR

**Documented:** GCash describes scanning a merchant QR, checking payment details, paying and receiving confirmation. Maya distinguishes static QR amount entry from terminal QR's prefilled merchant/amount, then requires confirmation. Neither source makes a QR image itself proof of settlement. [GCash Scan to Pay](https://help.gcash.com/hc/en-us/articles/360017563034-How-can-I-use-Scan-to-Pay-via-QR-Code), [Maya Scan to Pay](https://www.maya.ph/pay-with-qr).

**Documented recovery:** GCash distinguishes confirmation still in progress from failure. Its missing-confirmation guidance advises checking history/reference before retrying to avoid duplicate charges. [Confirmation in progress](https://help.gcash.com/hc/en-us/articles/47408999930393-QR-code-error-Payment-confirmation-in-progress), [payment not received](https://help.gcash.com/hc/en-us/articles/31316001083289-QR-code-payment-not-received).

**MedCore inference:** Adapt the actual dashboard's full/partial amount, recognizable method identity, method details, review, processing, confirmation, receipt and plan hierarchy to a vertical phone flow. Wallet stages can advance with the existing prototype mechanism without provider passwords, MPINs or OTPs. An uncertain submission must expose saved-request recovery/status, preserving idempotency, encrypted retry and backend confirmation. Use “Payment recorded” only after the backend records it; “Confirming payment” is appropriate while the result is unresolved. Repeated demo banners add no task information and can be removed without changing internal gates.

The dashboard QR rail was inspected: its SVG explicitly contains a simulated pattern and a central badge. That artwork is not evidence of an encoded contract. Render the existing supported prototype payload with a real encoder; keep provider identity outside the symbol. DENSO requires an unobstructed four-module margin on every side. Verify decoding the actual rendered/exported image, including compact width; decoding confirms the payload, not acceptance by a real wallet. [DENSO quiet-zone guidance](https://www.qrcode.com/en/howto/code.html).

## Feedback and accessibility recommendations

These are implementation recommendations unless identified above as observed:

- Initialization should show the real PNG logo and a subtle indeterminate activity treatment until storage/session checks finish. A verification outage needs recovery/Retry before any protected records render. No invented percentage or fixed minimum delay.
- Loading, empty, stale-refresh failure and successful zero balance are distinct states. Retain usable confirmed data during refresh; pair stale information with a clear retry action. Do not replace failed loading with “No bills.”
- Use native labeled fields, visible validation near the affected amount/form, keyboard-aware scrolling, generous press areas and clear pressed/disabled states. Preserve entered valid data after a failure.
- Allow system text scaling and wrapping for balances, method labels, status and long names. Prefer flexible rows over fixed-height clipping. React Native documents `allowFontScaling` and accessibility roles/labels/state. [Text API](https://reactnative.dev/docs/text), [accessibility API](https://reactnative.dev/docs/accessibility).
- Respect reduced motion before starting preload animation, observe setting changes and stop loops/subscriptions on unmount. The current stack supports this through `AccessibilityInfo`. [Reduced-motion API](https://reactnative.dev/docs/accessibilityinfo).
- Validate compact/large phone widths, large text, keyboard visibility, safe areas, contrast and actual screen-reader navigation. Official marketing screenshots cannot establish accessibility compliance or payment-error coverage; exported bundles cannot substitute for physical-device checks.

## Recommended visual synthesis

Use a light canvas, dark readable headings, restrained teal emphasis, real MedCore logos and one consistent icon family. Give the outstanding amount one dominant home/bill summary. Organize secondary content with section headings, separators and a few purposeful surfaces. Keep labeled bottom navigation stable and checkout focused, with visible Back/change actions and an amount/method summary at review. Receipts should prioritize recorded result, amount, method, reference, date and linked history. Onboarding should explain only understanding bills, tracking coverage and accessing payments/documents. Preserve all existing contracts, account authorization and financial safeguards.
