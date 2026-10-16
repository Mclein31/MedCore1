// Card details exist only in component memory. Only brand and last four digits
// may enter the API or encrypted retry storage. No gateway is contacted.
export function validateCard(number: string, expiry: string, cvv: string, now = new Date()) {
  const digits = number.replace(/[ -]/g, '');
  const prefix = Number(digits.slice(0, 4));
  const mastercard =
    /^\d{16}$/.test(digits) && (/^5[1-5]/.test(digits) || (prefix >= 2221 && prefix <= 2720));
  const brand = /^4\d{12}(\d{3})?(\d{3})?$/.test(digits) ? 'VISA' : mastercard ? 'MASTERCARD' : null;
  let sum = 0;
  for (let i = digits.length - 1, double = false; i >= 0; i--, double = !double) {
    let value = Number(digits[i]);
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  }
  const match = /^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/.exec(expiry.trim());
  const expired =
    !match ||
    2000 + Number(match[2]) < now.getFullYear() ||
    (2000 + Number(match[2]) === now.getFullYear() && Number(match[1]) < now.getMonth() + 1);
  const errors = {
    number: !brand || sum % 10 !== 0 ? 'Enter a valid Visa or Mastercard number.' : null,
    expiry: expired ? 'Enter a current expiration date as MM/YY.' : null,
    cvv: !/^\d{3}$/.test(cvv) ? 'Enter the 3-digit security code.' : null,
  };
  return { errors, valid: !errors.number && !errors.expiry && !errors.cvv, brand, last4: digits.slice(-4) };
}
