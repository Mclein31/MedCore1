import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./test/globalSetup.ts'],
    // Files share one database but each creates its own facility, so they can run in parallel.
    fileParallelism: true,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      // SMTP is blanked so a test can never send real email.
      SMTP_USER: '',
      SMTP_PASSWORD: '',
    },
  },
});
