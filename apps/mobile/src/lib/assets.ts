// Stable filename-based asset registry.
//
// Every image in the app is referenced ONLY through this file, using static
// relative paths. To replace any visual (e.g. swap a placeholder provider
// logo for the official brand mark), overwrite the file at the same path —
// no code changes required. See assets/icons/ICON_MANIFEST.md.

export const ASSETS = {
  avatarDefault: require('../../assets/icons/profile/profile-default.png'),
  providerLogo: {
    GCASH: require('../../assets/icons/payments/payment-gcash.png'),
    MAYA: require('../../assets/icons/payments/payment-maya.png'),
    QR_PH: require('../../assets/icons/payments/payment-qrph.png')
  } as Record<string, number>,
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
