// Keypad editing never changes financial truth or coerces invalid pasted text.
export function applyAmountKey(value: string, key: string): string {
  if (key === 'backspace') return value.slice(0, -1);
  if (key === 'clear') return '';
  if (!/^\d*(?:\.\d{0,2})?$/.test(value)) return value;
  if (key === '.') return value.includes('.') ? value : (value || '0') + '.';
  if (!/^\d$/.test(key) || /\.\d{2}$/.test(value)) return value;
  return value === '0' ? key : value + key;
}
