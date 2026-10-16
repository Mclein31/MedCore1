import { describe, expect, it } from 'vitest';
import { memoryStorage, TokenStore, type SecureStorage } from '../src/lib/tokenStore';

const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789-_ABCDE';
const OTHER = 'ZYXWVUTSRQPONMLKJIHGFEDCBA9876543210_-abcde';

describe('TokenStore', () => {
  it('starts signed out and restores a token saved by a previous launch', async () => {
    const store = new TokenStore(memoryStorage(TOKEN));
    expect(store.get()).toBeNull();
    await expect(store.restore()).resolves.toBe(TOKEN);
    expect(store.get()).toBe(TOKEN);
  });

  it('writes the token to secure storage and clears it from memory and storage', async () => {
    const storage = memoryStorage();
    const store = new TokenStore(storage);
    await store.set(TOKEN);
    expect(store.get()).toBe(TOKEN);
    expect(storage.current()).toBe(TOKEN);
    await store.clear();
    expect(store.get()).toBeNull();
    expect(storage.current()).toBeNull();
  });

  it('refuses malformed tokens', async () => {
    const storage = memoryStorage();
    const store = new TokenStore(storage);
    await expect(store.set('short')).rejects.toThrow();
    await expect(store.set(`${TOKEN} injected`)).rejects.toThrow();
    expect(store.get()).toBeNull();
    expect(storage.current()).toBeNull();
  });

  it('discards a corrupt saved value instead of sending it', async () => {
    const storage = memoryStorage('not a token\n');
    const store = new TokenStore(storage);
    await expect(store.restore()).resolves.toBeNull();
    expect(storage.current()).toBeNull();
  });

  it('treats an unreadable keychain as signed out', async () => {
    const storage: SecureStorage = {
      read: async () => {
        throw new Error('keychain locked');
      },
      write: async () => undefined,
      remove: async () => undefined,
    };
    const store = new TokenStore(storage);
    await expect(store.restore()).resolves.toBeNull();
  });

  it('keeps the session in memory when the keychain refuses a write', async () => {
    const storage: SecureStorage = {
      read: async () => null,
      write: async () => {
        throw new Error('no keychain');
      },
      remove: async () => undefined,
    };
    const store = new TokenStore(storage);
    await expect(store.set(TOKEN)).resolves.toBeUndefined();
    expect(store.get()).toBe(TOKEN);
  });

  it('never lets a slow sign-in write land after a later sign-out', async () => {
    let releaseWrite!: () => void;
    let stored: string | null = null;
    const storage: SecureStorage = {
      read: async () => stored,
      write: (token) =>
        new Promise<void>((resolve) => {
          releaseWrite = () => {
            stored = token;
            resolve();
          };
        }),
      remove: async () => {
        stored = null;
      },
    };
    const store = new TokenStore(storage);
    const signingIn = store.set(TOKEN);
    const signingOut = store.clear();
    expect(store.get()).toBeNull();
    // Let the queued keychain write start, then finish it after the sign-out was requested.
    await new Promise((resolve) => setTimeout(resolve, 0));
    releaseWrite();
    await Promise.all([signingIn, signingOut]);
    expect(stored).toBeNull();
    expect(store.get()).toBeNull();
  });

  it('applies writes in order', async () => {
    const storage = memoryStorage();
    const store = new TokenStore(storage);
    await Promise.all([store.set(TOKEN), store.clear(), store.set(OTHER)]);
    expect(storage.current()).toBe(OTHER);
    expect(store.get()).toBe(OTHER);
  });

  it('keeps working after a failed remove', async () => {
    let fail = true;
    const inner = memoryStorage();
    const storage: SecureStorage = {
      ...inner,
      remove: async () => {
        if (fail) throw new Error('boom');
        return inner.remove();
      },
    };
    const store = new TokenStore(storage);
    await expect(store.clear()).rejects.toThrow('boom');
    fail = false;
    await store.set(TOKEN);
    expect(inner.current()).toBe(TOKEN);
  });
});
