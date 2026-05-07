import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';

export interface OutboxRow {
  id: number;
  op: 'insert' | 'update' | 'delete';
  table_name: string;
  row_id: string;
  payload: string;
  enqueued_at: string;
  attempts: number;
  last_error: string | null;
}

const MAX_BACKOFF_MS = 60_000;
function backoff(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempts);
}

function classify(err: PostgrestError | null): 'retry' | 'drop' | 'stale' {
  if (!err) return 'drop';
  if (err.code === 'PT401') return 'stale';
  if (err.code && err.code.startsWith('4')) return 'drop'; // 4xx → don't loop
  return 'retry';
}

export async function flushOutbox(
  db: SQLiteDatabase,
  sb: SupabaseClient,
  opts: { now?: () => number } = {},
): Promise<{ flushed: number; deferred: number; dropped: number }> {
  void opts; // opts reserved for future backoff scheduling
  let flushed = 0, deferred = 0, dropped = 0;

  for (;;) {
    const rows = await db.getAllAsync<OutboxRow>(
      `SELECT * FROM outbox ORDER BY id ASC LIMIT 1`,
    );
    const row = rows[0];
    if (!row) break;

    const payload = JSON.parse(row.payload);

    let err: PostgrestError | null = null;
    if (row.op === 'insert' || row.op === 'update') {
      const r = await sb.from(row.table_name).upsert(payload, { onConflict: 'id' });
      err = r.error;
    } else {
      // soft delete: send updated row with deleted_at set
      const r = await sb.from(row.table_name).upsert(payload, { onConflict: 'id' });
      err = r.error;
    }

    if (!err) {
      await db.runAsync(`DELETE FROM outbox WHERE id = ?`, [row.id]);
      flushed++;
      continue;
    }

    const verdict = classify(err);
    if (verdict === 'drop') {
      await db.runAsync(
        `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
        [err.message, row.id],
      );
      // 4xx loops indefinitely — promote to dead-letter by deleting after 5 tries.
      if (row.attempts >= 4) {
        await db.runAsync(`DELETE FROM outbox WHERE id = ?`, [row.id]);
        dropped++;
        continue;
      }
      deferred++;
      break;
    } else if (verdict === 'stale') {
      // Caller's responsibility to re-pull and retry. Mark and break.
      await db.runAsync(
        `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
        [err.message, row.id],
      );
      deferred++;
      break;
    } else {
      // network/5xx: backoff and stop the cycle
      const wait = backoff(row.attempts);
      await db.runAsync(
        `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
        [err.message, row.id],
      );
      // signal caller to schedule retry after `wait`
      deferred++;
      void wait; // wait used by orchestrator
      break;
    }
  }

  return { flushed, deferred, dropped };
}
