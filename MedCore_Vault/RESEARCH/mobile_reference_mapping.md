# MedCore mobile reference mapping — October 7, 2026

This pass targets close structural reproduction. All seven UI_INSPO images were opened, and the 1080×14028 Main montage was inspected in eight enlarged bands. Source pixel dimensions are exact; phone-interior bounds and normalized UI dimensions below are raster estimates (roughly ±4–8px at 390px width). Font families cannot be identified reliably from the images. Native system sans-serif follows the dashboard's Inter/system stack without a new font dependency.

| Screen | Primary reference | 390px target geometry / component mapping |
|---|---|---|
| Preload | `login:register ui inspo main.png`, first phone | Full brand canvas, oversized subtle circular forms, centered real MedCore PNG lockup; bounded actual-init animation. |
| Onboarding | New auth image, third phone | Main visual occupies y60–480; centered 24px heading near y542, 14px explanation; dots and two 50px bottom controls. Original financial illustration replaces doctors' photos, with the same visual mass/placement. |
| Login/register/recovery | New auth image, fourth phone | White canvas; 28px gutters; centered ~150px visual; 24px semibold title near y270; 14px support; 52px light inputs/radius10, recovery directly under password; 50px action; secondary account links. Social providers are omitted because no such authentication is implemented. Registration retains required MRN/contact fields and scrolls. |
| Home | `Bill_display_and_receipt_inspo.jpg`, left phone | Navy upper region, small greeting/22px name; 340px overlapping balance surface/radius18, 30px figure; four evenly spaced icon actions inside its lower portion; rounded light lower region. |
| Bill | `Bill_display inspo.jpg` | Greeting/header; compact 344×155 financial panel/radius24, 32px amount; four circular shortcuts/54px with 14px labels; tinted summary region followed by quieter divider rows. |
| Coverage/documents/details | Main montage structured lists | ~22px gutters; compact centered 18px header, 42px circular back control; section labels/actions; 54–60px rows, 10–12px groups, restrained separators. |
| Amount entry | `payment input ui.png` | Brand upper area/rear layer, rounded white body/radius40; secondary balance32; centered amount44; spacious numeric entry region; prominent bottom confirmation. Preserve full/partial choice and exact centavo parsing. Accessible tap/keyboard operation replaces swipe-only interaction. |
| Method/QR/review | Main methods/review + excluded-blue overall image QR | Compact header, radio/list methods, provider-specific identity; ~228px clear QR; aligned review rows, dashed total divider, fixed rounded primary footer. Existing dashboard rail flow/contracts remain authoritative. |
| Receipt | Bank reference, right phone | Navy context above paper; ~340px paper width, small confirmation18, provider24/reference14, two dashed dividers, ~40px detail rows/text14, emphasized total28; bottom actions. |
| Profile | `Profile tab inspo.jpg`, AFTER | Centered20px title; compact identity/avatar72; muted background; section labels14; white groups/radius10; ~51px rows, leading outline icons20, label16, value14/chevrons. Only supported account/coverage/documents/privacy/logout content. |
| Sheets/navigation | Main montage | Bottom confirmation sheet/top radius24, centered handle/title, two side-by-side pill actions; five labeled destinations/icons24 and quiet selected state. Touch targets remain at least48px; larger text can increase heights. |

The excluded-blue overall image supplies secondary financial hierarchy/review/QR geometry only; its cyan/bright blue palette and floating plus are excluded. Other references' purple and orange are also excluded.

Dashboard palette source: `apps/dashboard/src/index.css` and `tailwind.config.js`: navy #0F2A4A (variants #18385E/#0A1D33), blue #0284C7 (dark #0369A1), surfaces #F8FAFC/#FFFFFF/#F1F5F9, border #E2E8F0, text #0F172A/#475569. The mobile refinement uses accessible teal primary emphasis with dashboard blue as complement, dashboard navy for dark regions, and consistent semantic status colors. These are centralized in mobile tokens; provider identity can retain its existing rail colors.

Comparisons use actual app captures, cropped phone interiors and equal-width side-by-side sheets. Content and palette differ intentionally; the assessment focuses on boundaries, header/body silhouette, visual mass, density, control geometry and fixed action placement. Source mockups' bezels, fake status bars, presentation canvases, watermarks and unsupported clinical/social functions are excluded.


## Verified outcome — October 8, 2026

This mapping was implemented and actual captures were compared with the corresponding phone crops. The comparison identified discrepancies in keypad size, grouped methods, Profile spacing and onboarding bleed; those discrepancies were corrected. Adaptive keypad circles are78px at390px width (≈86px rows) and62px on320px phones; the accessible fixed tap action is64px. Payment rails use grouped56px rows; subsequent Profile labels reduce the previous excess gap by16px. The original onboarding band reaches the content edges without copying photos.

Final code reviewer audit/re-audit: ready for a patient-prototype progress commit, no remaining actionable source findings. Required checks, all three exports, isolated financial/ownership tests and independent QR decodes passed. [Actual screenshots and equal-width comparisons](../../apps/mobile/validation/reference-match/README.md) record geometry estimates, differences/reasons and native-device limitations. Native session verification bypass/recovery and financial safeguards remain unchanged; browser fixtures never access a database/gateway.
