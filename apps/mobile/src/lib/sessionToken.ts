// Keep the current token in memory even when the device cannot persist it.
// Serialize writes so a slow login write cannot undo a later logout.
export class SessionToken {
  private value: string | null = null;
  private writes: Promise<void> = Promise.resolve();

  constructor(private storage: {
    read: () => Promise<string | null>;
    write: (token: string) => Promise<void>;
    remove: () => Promise<void>;
  }) {}

  get = async () => this.value;

  async restore() {
    try { this.value = await this.storage.read(); } catch { this.value = null; }
    return this.value;
  }

  async set(token: string | null) {
    this.value = token;
    const write = this.writes.catch(() => {}).then(async () => {
      if (token) {
        try { await this.storage.write(token); } catch { /* Session remains in memory. */ }
      } else {
        await this.storage.remove();
      }
    });
    this.writes = write;
    await write;
  }
}
