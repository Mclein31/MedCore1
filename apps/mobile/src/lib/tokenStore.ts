/**
 * Holds the patient's bearer token. The only durable copy lives in the OS
 * keychain (expo-secure-store); this class keeps a memory copy for requests
 * and serializes keychain writes so a slow sign-in write can never land after
 * a later sign-out and resurrect the session.
 */
export interface SecureStorage {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  remove(): Promise<void>;
}

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,128}$/;

export class TokenStore {
  private value: string | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: SecureStorage) {}

  /** The token for the next request, or null when signed out. */
  get(): string | null {
    return this.value;
  }

  /** Load the token saved by a previous launch. A corrupt or unreadable entry counts as signed out. */
  async restore(): Promise<string | null> {
    await this.queue;
    let saved: string | null = null;
    try {
      saved = await this.storage.read();
    } catch {
      saved = null;
    }
    if (saved !== null && !TOKEN_SHAPE.test(saved)) {
      saved = null;
      await this.storage.remove().catch(() => undefined);
    }
    this.value = saved;
    return saved;
  }

  /** Save a new token. If the keychain refuses, the session still works until the app closes. */
  set(token: string): Promise<void> {
    if (!TOKEN_SHAPE.test(token)) return Promise.reject(new Error('Refusing to store a malformed token.'));
    this.value = token;
    return this.enqueue(async () => {
      try {
        await this.storage.write(token);
      } catch {
        // Kept in memory only; the patient signs in again next launch.
      }
    });
  }

  /** Forget the token everywhere. Memory is cleared first so no further request can use it. */
  clear(): Promise<void> {
    this.value = null;
    return this.enqueue(() => this.storage.remove());
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const next = this.queue.catch(() => undefined).then(task);
    this.queue = next.catch(() => undefined);
    return next;
  }
}

/** In-memory storage for tests and for platforms without a keychain. */
export function memoryStorage(
  initial: string | null = null,
): SecureStorage & { current: () => string | null } {
  let stored = initial;
  return {
    current: () => stored,
    read: async () => stored,
    write: async (token) => {
      stored = token;
    },
    remove: async () => {
      stored = null;
    },
  };
}
