/**
 * Moves every hospital-activity date in the fictional demo data forward by whole days, so the newest
 * admission lands TARGET_DAYS_AGO days before today. Re-runnable: run it again just before a demo.
 *
 *   DATABASE_URL=postgres://… SHIFT_ALLOW_REMOTE=<host> npm run db:shift-demo-dates            # dry run
 *   DATABASE_URL=postgres://… SHIFT_ALLOW_REMOTE=<host> npm run db:shift-demo-dates -- --apply
 *
 * Safety rails:
 * - Refuses remote hosts unless SHIFT_ALLOW_REMOTE names that exact host (take a Neon branch first).
 * - Only touches activity tables; identity, session, sign-in code, MFA and rate-limit tables are
 *   left alone, so no credential or session lifetime is extended.
 * - The audit log is never rewritten (it stays append-only). Payments, receipts and the patient
 *   timeline are immutable by trigger; their triggers are disabled only inside this transaction for the date shift and
 *   re-enabled before commit.
 * - Runs in one transaction; nothing changes unless every update succeeds.
 */
import { sql } from 'drizzle-orm';
import { createDb, createPool } from './client';

/** Activity tables whose dates describe the hospital story being demonstrated. */
const ACTIVITY_TABLES = [
  'encounters',
  'charges',
  'philhealth_claims',
  'hmo_coverages',
  'ledgers',
  'payments',
  'receipts',
  'promissory_notes',
  'gate_passes',
  'disputes',
  'timeline_events',
  'beds',
] as const;

const IMMUTABLE = [
  { table: 'payments', trigger: 'payments_immutable' },
  { table: 'receipts', trigger: 'receipts_immutable' },
  { table: 'timeline_events', trigger: 'timeline_events_append_only' },
];

const TARGET_DAYS_AGO = Number(process.env.SHIFT_TARGET_DAYS_AGO ?? 1);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const host = new URL(url).hostname;
  const local = ['localhost', '127.0.0.1', '::1', ''];
  if (!local.includes(host) && process.env.SHIFT_ALLOW_REMOTE !== host) {
    throw new Error(`Refusing remote host "${host}". Set SHIFT_ALLOW_REMOTE=${host} for a demo branch.`);
  }
  const apply = process.argv.includes('--apply');
  const pool = createPool(url, { max: 1, statementTimeoutMs: 120_000 });
  const db = createDb(pool);
  try {
    const latest = await db.execute(sql`select max(admitted_at) as latest from encounters`);
    const latestAt = (latest.rows[0] as { latest: Date | string | null }).latest;
    if (!latestAt) throw new Error('No encounters to shift.');
    const days = Math.floor((Date.now() - new Date(latestAt).getTime()) / 86_400_000) - TARGET_DAYS_AGO;
    if (days <= 0) {
      console.warn(`Newest admission is already within ${TARGET_DAYS_AGO} day(s); nothing to do.`);
      return;
    }

    const cols = await db.execute(sql`
      select table_name, column_name, data_type from information_schema.columns
      where table_schema = 'public'
        and data_type in ('timestamp with time zone', 'date')
        and table_name in (${sql.join(
          ACTIVITY_TABLES.map((t) => sql`${t}`),
          sql`, `,
        )})
      order by table_name, column_name`);
    const byTable = new Map<string, string[]>();
    for (const row of cols.rows as { table_name: string; column_name: string }[]) {
      byTable.set(row.table_name, [...(byTable.get(row.table_name) ?? []), row.column_name]);
    }

    console.warn(`Shifting ${byTable.size} tables forward by ${days} day(s)${apply ? '' : ' (dry run)'}:`);
    for (const [table, columns] of byTable) console.warn(`  ${table}: ${columns.join(', ')}`);
    if (!apply) {
      console.warn('Dry run only. Re-run with --apply to write.');
      return;
    }

    await db.transaction(async (tx) => {
      for (const t of IMMUTABLE) {
        await tx.execute(
          sql`alter table ${sql.identifier(t.table)} disable trigger ${sql.identifier(t.trigger)}`,
        );
      }
      for (const [table, columns] of byTable) {
        const sets = columns.map(
          (c) => sql`${sql.identifier(c)} = ${sql.identifier(c)} + make_interval(days => ${days})`,
        );
        await tx.execute(sql`update ${sql.identifier(table)} set ${sql.join(sets, sql`, `)}`);
      }
      for (const t of IMMUTABLE) {
        await tx.execute(
          sql`alter table ${sql.identifier(t.table)} enable trigger ${sql.identifier(t.trigger)}`,
        );
      }
    });
    console.warn('Demo dates shifted.');
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
