import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/server/src/db/schema.ts',
  out: './apps/server/src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://mclein@localhost:5432/aqromed'
  }
});
