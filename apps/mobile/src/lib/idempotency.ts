import * as Crypto from 'expo-crypto';
import { beginAttempt, endAttempt } from './singleFlight';

export { beginAttempt, endAttempt };

// Idempotency keys guarantee that tapping "Confirm Payment" twice, or an
// automatic network retry, can never create two payments. The SAME key must
// be reused for retries of the SAME payment attempt; a NEW attempt gets a
// NEW key.
export async function generateIdempotencyKey(): Promise<string> {
  try {
    const uuid = await Crypto.randomUUID();
    return `mobile-${uuid}`;
  } catch {
    return `mobile-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}
