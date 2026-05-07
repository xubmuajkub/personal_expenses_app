import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';

type BindValue = string | number | null | boolean | Uint8Array;

export const SYNCED_TABLES = [
  'profiles',
  'accounts',
  'categories',
  'transactions',
  'transfers',
  'budgets',
  'merchant_rules',
  'notif_parse_rules',
  'recurring_rules',
  'fx_rates',
  'push_tokens',
] as const;
export type SyncedTable = typeof SYNCED_TABLES[number];

const PAGE = 500;

export async function pullTable(
  db: SQLiteDatabase,
  sb: SupabaseClient,
  table: SyncedTable,
): Promise<number> {
  const cursor = await readCursor(db, table);
  let total = 0;
  let nextCursor = cursor;
  for (;;) {
    const q = sb.from(table).select('*').gt('updated_at', nextCursor).order('updated_at', { ascending: true }).limit(PAGE);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    await mergeRows(db, table, data);
    nextCursor = data[data.length - 1].updated_at;
    total += data.length;
    if (data.length < PAGE) break;
  }
  if (nextCursor !== cursor) await writeCursor(db, table, nextCursor);
  return total;
}

export async function pullAll(db: SQLiteDatabase, sb: SupabaseClient): Promise<number> {
  let n = 0;
  for (const t of SYNCED_TABLES) n += await pullTable(db, sb, t);
  return n;
}

async function readCursor(db: SQLiteDatabase, table: string): Promise<string> {
  const rows = await db.getAllAsync<{ last_sync_at: string }>(
    `SELECT last_sync_at FROM sync_state WHERE table_name = ?`, [table]);
  return rows[0]?.last_sync_at ?? '1970-01-01T00:00:00Z';
}

async function writeCursor(db: SQLiteDatabase, table: string, ts: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_state (table_name, last_sync_at) VALUES (?, ?)
     ON CONFLICT(table_name) DO UPDATE SET last_sync_at = excluded.last_sync_at`,
    [table, ts]);
}

// Per-row SELECT + INSERT OR REPLACE inside one transaction. Acceptable for
// personal-scale data; revisit batch upsert if any synced table grows past ~10k rows.
async function mergeRows(db: SQLiteDatabase, table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const first = rows[0];
  if (!first) return;
  const keys = Object.keys(first);
  const placeholders = '(' + keys.map(() => '?').join(',') + ')';
  const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES ${placeholders}`;
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      const rowId = r['id'] as BindValue;
      const local = await db.getAllAsync<{ sync_version: number }>(
        `SELECT sync_version FROM ${table} WHERE id = ?`, [rowId]);
      const localV = local[0]?.sync_version ?? 0;
      const remoteV = typeof r['sync_version'] === 'number' ? r['sync_version'] : 0;
      if (remoteV >= localV) {
        await db.runAsync(sql, keys.map((k) => normalize(r[k])));
      }
    }
  });
}

// Postgres returns timestamps as ISO strings; this normalizer never sees a JS Date.
// Booleans become 0/1; nested objects become JSON strings.
function normalize(v: unknown): BindValue {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v && typeof v === 'object') return JSON.stringify(v);
  return v as BindValue;
}
