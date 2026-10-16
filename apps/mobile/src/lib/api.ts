import * as Crypto from 'expo-crypto';
import { API_BASE_URL } from '../config';
import { createApiClient, newIdempotencyKey } from './apiClient';
import { keychainStorage } from './secureStorage';
import { TokenStore } from './tokenStore';

export const tokens = new TokenStore(keychainStorage);

type Listener = () => void;
const signedOutListeners = new Set<Listener>();

/** The session provider subscribes so an expired session returns the app to sign-in. */
export function onSignedOut(listener: Listener): () => void {
  signedOutListeners.add(listener);
  return () => signedOutListeners.delete(listener);
}

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  tokens,
  onSignedOut: () => signedOutListeners.forEach((listener) => listener()),
});

export const idempotencyKey = () => newIdempotencyKey(Crypto.randomUUID);

export { ApiRequestError, errorMessage } from './apiClient';
