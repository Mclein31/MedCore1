import { manilaDate } from '@medcore/domain';
import { sql } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { documentCounters } from '../db/schema';

export type DocumentKind = 'ENC' | 'SOA' | 'OR' | 'PN' | 'CLM';

/**
 * Next number in a gap-free yearly sequence for the facility. The row lock taken
 * by the upsert serializes concurrent callers, and a rolled-back transaction
 * returns its number, so official receipts stay strictly sequential.
 */
export async function nextDocumentNumber(tx: DbOrTx, facilityId: string, kind: DocumentKind, now: Date): Promise<string> {
  const year = Number(manilaDate(now).slice(0, 4));
  const [row] = await tx
    .insert(documentCounters)
    .values({ facilityId, kind, year, nextValue: 2 })
    .onConflictDoUpdate({
      target: [documentCounters.facilityId, documentCounters.kind, documentCounters.year],
      set: { nextValue: sql`${documentCounters.nextValue} + 1` },
    })
    .returning({ next: documentCounters.nextValue });
  const value = row!.next - 1;
  return `${kind}-${year}-${String(value).padStart(6, '0')}`;
}
