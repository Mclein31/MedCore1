# MedCore Mobile — Icon & Asset Manifest

All image files the app expects, where they live, and how to replace them.
The app references every file **only** through `src/lib/assets.ts` using
static relative paths, so replacing a file in place never requires a code
change. Generic interface icons come from `lucide-react-native` (the mobile
equivalent of the dashboard's `lucide-react`) and need no files.

## Custom image files

| Purpose | Filename | Path | Size / format | Used in |
|---|---|---|---|---|
| Patient avatar placeholder | `profile-default.png` | `assets/icons/profile/` | 512×512 PNG | App header (all tabs) |
| GCash brand mark (placeholder — replace with official asset) | `payment-gcash.png` | `assets/icons/payments/` | 512×512 PNG | Payment method grid |
| Maya brand mark (placeholder — replace with official asset) | `payment-maya.png` | `assets/icons/payments/` | 512×512 PNG | Payment method grid |
| QR Ph brand mark (placeholder — replace with official asset) | `payment-qrph.png` | `assets/icons/payments/` | 512×512 PNG | Payment method grid |
| Demo GCash QR (dummy payload, scannable) | `qr-gcash-demo.png` | `assets/payments/` | 810×810 PNG | Payment flow → GCash QR step |
| Demo Maya QR (dummy payload, scannable) | `qr-maya-demo.png` | `assets/payments/` | 810×810 PNG | Payment flow → Maya QR step |
| Demo QR Ph QR (dummy payload, scannable) | `qr-qrph-demo.png` | `assets/payments/` | 810×810 PNG | Payment flow → QR Ph QR step |

## Demo QR safety

The three `qr-*-demo.png` files encode dummy payloads only:

```text
MEDCORE-DEMO-PAY|RAIL=<GCASH|MAYA|QRPH>|NOTE=DEMO-ONLY-NO-REAL-MONEY
```

They reference no real person, wallet, or bank account. The payment screen
labels them `DEMO ONLY — NO REAL PAYMENT`, and tapping Confirm still posts
to the hospital backend, which alone confirms the demo settlement.

## How to replace an asset

1. Export the new artwork at the same pixel size and PNG format.
2. Overwrite the file at its exact path above (keep the filename).
3. Rebuild the app (`npx expo start --clear` in dev, or a new EAS build).

No TypeScript file needs to change.

## Lucide icons in use (no files needed)

| Icon | Used for |
|---|---|
| `Home` | Home tab |
| `Receipt` | Bill tab, receipt rows |
| `ShieldCheck` | Coverage tab, HMO/PhilHealth status |
| `CreditCard` | Payments tab, card method |
| `User` | Profile tab |
| `Bell` | Header notifications |
| `Check` / `CircleCheck` | Completed steps, success states |
| `TriangleAlert` | Warnings, demo banners, disputes |
| `Clock` | Pending states, validity timers |
| `QrCode` | QR method fallback glyph |
| `Smartphone` | E-wallet method fallback glyph |
| `Building2` | Bank transfer method |
| `Scale` | Promissory note method + RA 9439 headers |
| `FileText` | Documents, generic fallback |
| `ChevronRight` | Tappable row affordance |

Card, bank, and promissory methods deliberately use lucide glyphs instead of
image files per the icon-library-first rule; only provider brand marks that
lucide cannot represent use PNG files.
