// Stable filename-based asset registry.
//
// Every image in the app is referenced ONLY through this file, using static
// relative paths. To replace any visual (e.g. swap a placeholder provider
// logo for the official brand mark), overwrite the file at the same path —
// no code changes required. See assets/icons/ICON_MANIFEST.md.

export const ASSETS = {
  brand: {
    cora: require('../../assets/brand/cora-mascot.png'),
    coraBlink: require('../../assets/brand/cora-mascot-blink.png'),
    badge: require('../../assets/brand/MedCore_Badge_Logo.png'),
    launcher: require('../../assets/brand/app-icon.png'),
    adaptive: require('../../assets/brand/adaptive-icon.png'),
    wordmark: require('../../assets/brand/MedCore_Text_logo.png')
  },
  avatarDefault: require('../../assets/icons/profile/profile-default.png'),
  providerLogo: {
    GCASH: require('../../assets/icons/payments/payment-gcash.png'),
    MAYA: require('../../assets/icons/payments/payment-maya.png'),
    QR_PH: require('../../assets/icons/payments/payment-qrph.png')
  } as Record<string, number>,
  bankLogo: {
    BPI: require('../../assets/icons/payments/payment-bpi.png'),
    BDO: require('../../assets/icons/payments/payment-bdo.png')
  },
  cardNetworkLogo: {
    VISA: require('../../assets/icons/payments/payment-visa.png'),
    MASTERCARD: require('../../assets/icons/payments/payment-mastercard.png')
  },
  demoQr: {
    GCASH: require('../../assets/payments/qr-gcash-demo.png'),
    MAYA: require('../../assets/payments/qr-maya-demo.png'),
    QR_PH: require('../../assets/payments/qr-qrph-demo.png')
  } as Record<string, number>
} as const;

export type QrMethod = keyof typeof ASSETS.demoQr;

export function hasDemoQr(rail: string): rail is QrMethod {
  return rail === 'GCASH' || rail === 'MAYA' || rail === 'QR_PH';
}
