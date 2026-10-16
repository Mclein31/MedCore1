import { describe, expect, it } from 'vitest';
import { SessionToken } from '../src/lib/sessionToken';

const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789-_ABCDE';

function memory(initial: string | null = null) {
  let stored = initial;
  return {
    current: () => stored,
    read: async () => stored,
    write: async (token: string) => {
      stored = token;
    },
    remove: async () => {
      stored = null;
    },
  };
}

describe('SessionToken (the bearer token kept in SecureStore)', () => {
  it('restores a token saved by a previous launch', async () => {
    const session = new SessionToken(memory(TOKEN));
    await expect(session.get()).resolves.toBeNull();
    await expect(session.restore()).resolves.toBe(TOKEN);
    await expect(session.get()).resolves.toBe(TOKEN);
  });

  it('writes on sign-in and removes on sign-out', async () => {
    const storage = memory();
    const session = new SessionToken(storage);
    await session.set(TOKEN);
    expect(storage.current()).toBe(TOKEN);
    await session.set(null);
    expect(storage.current()).toBeNull();
    await expect(session.get()).resolves.toBeNull();
  });

  it('treats an unreadable keychain as signed out', async () => {
    const session = new SessionToken({
      read: async () => {
        throw new Error('locked');
      },
      write: async () => undefined,
      remove: async () => undefined,
    });
    await expect(session.restore()).resolves.toBeNull();
  });

  it('keeps the session in memory when the keychain refuses a write', async () => {
    const session = new SessionToken({
      read: async () => null,
      write: async () => {
        throw new Error('no keychain');
      },
      remove: async () => undefined,
    });
    await session.set(TOKEN);
    await expect(session.get()).resolves.toBe(TOKEN);
  });

  it('never lets a slow sign-in write land after a later sign-out', async () => {
    let release!: () => void;
    let stored: string | null = null;
    const session = new SessionToken({
      read: async () => stored,
      write: (token) =>
        new Promise<void>((resolve) => {
          release = () => {
            stored = token;
            resolve();
          };
        }),
      remove: async () => {
        stored = null;
      },
    });
    const signingIn = session.set(TOKEN);
    const signingOut = session.set(null);
    await new Promise((resolve) => setTimeout(resolve, 0));
    release();
    await Promise.all([signingIn, signingOut]);
    expect(stored).toBeNull();
    await expect(session.get()).resolves.toBeNull();
  });
});
