// Pure single-flight guard for payment attempts. No native imports so it
// stays unit-testable in plain Node.
const inFlight = new Set<string>();

export function beginAttempt(key: string): boolean {
  if (inFlight.has(key)) return false;
  inFlight.add(key);
  return true;
}

export function endAttempt(key: string): void {
  inFlight.delete(key);
}

export function clearAttempts(): void {
  inFlight.clear();
}
