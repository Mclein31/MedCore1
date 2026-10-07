# MedCore Mobile — Icon & Asset Manifest

All image files the app expects, where they live, and how to replace them.
The app references every file **only** through `src/lib/assets.ts` using
static relative paths, so replacing a file in place never requires a code
change. Generic interface icons come from `lucide-react-native` (the mobile
equivalent of the dashboard's `lucide-react`) and need no files.

## Custom image files

| Purpose | Filename | Path | Size / format | Used in |
|---|---|---|---|---|
| Legacy avatar asset | `profile-default.png` | `assets/icons/profile/` | 512×512 PNG | Available in registry; current header uses MedCore badge |
| GCash brand mark (placeholder — replace with official asset) | `payment-gcash.png` | `assets/icons/payments/` | 512×512 PNG | Payment method grid |
| Maya brand mark (placeholder — replace with official asset) | `payment-maya.png` | `assets/icons/payments/` | 512×512 PNG | Payment method grid |
| QR Ph brand mark (placeholder — replace with official asset) | `payment-qrph.png` | `assets/icons/payments/` | 512×512 PNG | Payment method grid |
| Prototype GCash QR (dummy payload, scannable) | `qr-gcash-demo.png` | `assets/payments/` | 810×810 PNG | Encoded source retained; wallet uses preset stages |
| Prototype Maya QR (dummy payload, scannable) | `qr-maya-demo.png` | `assets/payments/` | 810×810 PNG | Encoded source retained; wallet uses preset stages |
| Prototype QR Ph QR (dummy payload, scannable) | `qr-qrph-demo.png` | `assets/payments/` | 810×810 PNG | Encoded source for vector PaymentQr |

## MedCore branding

| Purpose | Filename | Path | Size / format |
|---|---|---|---|
| Original transparent badge | `MedCore_Badge_Logo.png` | `assets/brand/` | 380×356 PNG, byte-identical to `logo/` |
| Original transparent wordmark | `MedCore_Text_logo.png` | `assets/brand/` | 3244×1280 PNG, byte-identical to `logo/` |
| Opaque launcher canvas | `app-icon.png` | `assets/brand/` | 1024×1024 RGB PNG |
| Transparent adaptive foreground | `adaptive-icon.png` | `assets/brand/` | 1024×1024 RGBA PNG |

In-app branding uses `contain` sizing and the original PNGs through the registry. Native splash/favicon references use the original badge. Launcher canvases center the supplied badge without redrawing it; regenerate with `node scripts/prepare-brand.cjs`. Native configuration also registers these paths directly in `app.json` as Expo requires.

## Encoded prototype QR

The three `qr-*-demo.png` files encode dummy payloads only:

```text
MEDCORE-DEMO-PAY|RAIL=<GCASH|MAYA|QRPH>|NOTE=DEMO-ONLY-NO-REAL-MONEY
```

They reference no person, wallet, or bank account. `src/lib/qrPatterns.ts` preserves their exact 45×45 module lattice, including six quiet modules on each side. `PaymentQr` renders black vector modules on white at integer module sizes; provider identity is outside the symbol. The payload deliberately remains unchanged. Confirmation still posts to the existing hospital backend and only a confirmed result produces a recorded receipt. Internal simulation flags, production gates and encrypted retry mechanisms are unchanged.

`npm run test:qr` independently decodes the rendered path geometry with macOS Vision at four sizes. Replacing a prototype QR source PNG alone does not update its vector pattern: regenerate and decode the pattern before changing it.

## How to replace an asset

1. Export the new artwork at the same pixel size and PNG format.
2. Overwrite the file at its exact path above (keep the filename).
3. Rebuild the app (`npx expo start --clear` in dev, or a new EAS build).

Ordinary brand/provider asset replacement needs no screen code changes. QR pattern changes require the validation described above.

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
| `TriangleAlert` | Warnings and disputes |
| `Clock` | Pending states |
| `QrCode` | QR method fallback glyph |
| `Smartphone` | E-wallet method fallback glyph |
| `Building2` | Bank transfer method |
| `Scale` | Promissory note method + RA 9439 headers |
| `FileText` | Documents, generic fallback |
| `ChevronRight` | Tappable row affordance |

Card, bank, and promissory methods deliberately use lucide glyphs instead of
image files per the icon-library-first rule; only provider brand marks that
lucide cannot represent use PNG files.
