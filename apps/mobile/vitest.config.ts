import { defineConfig } from 'vitest/config';

// Tests cover the plain TypeScript modules (API client, token storage); nothing here imports React Native.
export default defineConfig({ test: { include: ['test/**/*.test.ts'], environment: 'node' } });
