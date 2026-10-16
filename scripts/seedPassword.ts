// Seeded accounts share the password from SEED_PASSWORD (see scripts/seedPostgres.ts).
// Scripts read it from the environment so no credential lives in the repository.
export function seedPassword(): string {
  const value = process.env.SEED_PASSWORD;
  if (!value) throw new Error('Set SEED_PASSWORD to the password the target database was seeded with.');
  return value;
}
