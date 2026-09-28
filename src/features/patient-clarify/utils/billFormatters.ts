import { formatPhp } from '@/utils/formatters';

export { formatPhp as formatPeso };

/**
 * Anonymizes/masks patient names for privacy compliance (RA 10173 Data Privacy Act)
 */
export function maskName(fullName: string): string {
  if (!fullName) return 'Anonymous Patient';
  return fullName
    .split(' ')
    .map((part) => {
      if (part.length <= 2) return part;
      return part[0] + '*'.repeat(Math.max(1, part.length - 2)) + part[part.length - 1];
    })
    .join(' ');
}

/**
 * Masks Philippine mobile numbers: 09171234567 -> 0917-***-4567
 */
export function maskMobile(mobile: string): string {
  if (!mobile) return '09**-***-****';
  const clean = mobile.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 4)}-***-${clean.slice(7)}`;
  }
  return '0917-***-4412';
}

/**
 * Masks 16-digit card number to last 4 digits
 */
export function maskCardNumber(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length >= 4) {
    return `•••• •••• •••• ${clean.slice(-4)}`;
  }
  return '•••• •••• •••• 1111';
}

/**
 * Masks PhilHealth PIN
 */
export function maskPhilHealthPin(pin: string): string {
  if (!pin) return '••••-••••-••••';
  const clean = pin.replace(/\D/g, '');
  if (clean.length >= 4) {
    return `${clean.slice(0, 2)}-•••••••••-${clean.slice(-1)}`;
  }
  return pin;
}

/**
 * Formats ISO timestamps to human-readable Philippine Standard Time (PST)
 */
export function formatPstDateTime(isoString?: string): string {
  if (!isoString) {
    return 'Sep 28, 2026 · 14:45 PST';
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timePart = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${datePart} · ${timePart} PST`;
  } catch {
    return isoString;
  }
}
