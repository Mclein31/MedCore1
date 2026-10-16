// Pure, testable guards. Business truth stays on the backend; these only
// validate user input and navigation state on the device.

export function parsePaymentAmount(input: string): number | null {
  const clean = input.trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(clean)) return null;
  const amount = Number(clean.replace(/,/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function validatePaymentAmount(input: string, balance: number): string | null {
  const parsed = parsePaymentAmount(input);
  if (parsed === null) return 'Enter an amount greater than zero, with up to two decimal places.';
  if (!Number.isFinite(balance) || balance <= 0) return 'There is no outstanding balance to pay.';
  if (Math.round(parsed * 100) > Math.round(balance * 100))
    return 'The amount cannot exceed what you currently owe.';
  return null;
}

export function getInitialRoute(user: { id: string } | null): 'Auth' | 'Main' {
  return user ? 'Main' : 'Auth';
}

export function shouldShowPayButton(remainingBalance: number | null | undefined): boolean {
  return (remainingBalance ?? 0) > 0;
}
