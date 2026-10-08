// Shared non-reseeding project suite. Real PostgreSQL checks are opt-in and
// require a strictly named local validation database, never the hospital DB.
export {};
await import('./auditFinancials');
await import('../apps/dashboard/__tests__/auth');
await import('../apps/server/__tests__/patientWorkflows');
if (process.env.MEDCORE_VALIDATION_DATABASE_URL) await import('../apps/server/__tests__/paymentsPostgres');
else console.log('[SKIP] Real PostgreSQL checks: set MEDCORE_VALIDATION_DATABASE_URL for a dedicated local validation database.');
