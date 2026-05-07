import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';
import type { Transaction } from './types';
import type { TxnFilters } from '@/store/filters';
import { enqueueOutbox } from '@/db/repos/base';

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // RFC 4180: if the field contains a comma, double-quote, or newline, wrap in
  // double-quotes and escape existing double-quotes by doubling them.
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS = [
  'id', 'user_id', 'account_id', 'category_id', 'kind',
  'amount_micro', 'currency', 'fx_rate_to_base', 'amount_base_micro',
  'occurred_at', 'merchant', 'note', 'source', 'source_ref', 'created_at',
] as const;

function txnToCsvRow(t: Transaction): string {
  return CSV_HEADERS.map((h) => csvEscape(t[h as keyof Transaction])).join(',');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function exportTransactionsCsv(
  db: SQLiteDatabase,
  user_id: string,
  filters: TxnFilters = {},
): Promise<string> {
  const conditions: string[] = ['user_id = ?', 'deleted_at IS NULL'];
  const vals: unknown[] = [user_id];

  if (filters.from) { conditions.push('occurred_at >= ?'); vals.push(filters.from); }
  if (filters.to) { conditions.push('occurred_at <= ?'); vals.push(filters.to); }
  if (filters.kind) { conditions.push('kind = ?'); vals.push(filters.kind); }
  if (filters.currency) { conditions.push('currency = ?'); vals.push(filters.currency); }
  if (filters.amount_min_micro !== undefined) {
    conditions.push('amount_micro >= ?'); vals.push(filters.amount_min_micro);
  }
  if (filters.amount_max_micro !== undefined) {
    conditions.push('amount_micro <= ?'); vals.push(filters.amount_max_micro);
  }
  if (filters.search) {
    conditions.push('(merchant LIKE ? OR note LIKE ?)');
    vals.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.account_ids && filters.account_ids.length > 0) {
    conditions.push(`account_id IN (${filters.account_ids.map(() => '?').join(',')})`);
    vals.push(...filters.account_ids);
  }
  if (filters.category_ids && filters.category_ids.length > 0) {
    conditions.push(`category_id IN (${filters.category_ids.map(() => '?').join(',')})`);
    vals.push(...filters.category_ids);
  }
  if (filters.sources && filters.sources.length > 0) {
    conditions.push(`source IN (${filters.sources.map(() => '?').join(',')})`);
    vals.push(...filters.sources);
  }

  const sql = `SELECT * FROM transactions WHERE ${conditions.join(' AND ')} ORDER BY occurred_at DESC`;
  const rows = await db.getAllAsync<Transaction>(sql, vals as SQLiteBindValue[]);

  const lines = [CSV_HEADERS.join(','), ...rows.map(txnToCsvRow)];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------

export interface JsonBackup {
  version: 1;
  exported_at: string;
  user_id: string;
  transactions: Transaction[];
}

export async function exportAllJson(db: SQLiteDatabase, user_id: string): Promise<string> {
  const transactions = await db.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE user_id = ? AND deleted_at IS NULL ORDER BY occurred_at DESC`,
    [user_id],
  );

  const backup: JsonBackup = {
    version: 1,
    exported_at: new Date().toISOString(),
    user_id,
    transactions,
  };
  return JSON.stringify(backup, null, 2);
}

export async function restoreJson(
  db: SQLiteDatabase,
  user_id: string,
  jsonStr: string,
): Promise<{ restored: number }> {
  const backup = JSON.parse(jsonStr) as JsonBackup;
  if (backup.version !== 1) throw new Error('Unsupported backup version');

  let restored = 0;
  for (const txn of backup.transactions) {
    await db.withTransactionAsync(async () => {
      // Upsert — if the row already exists, replace it.
      await db.runAsync(
        `INSERT OR REPLACE INTO transactions
           (id, user_id, account_id, category_id, kind,
            amount_micro, currency, fx_rate_to_base, amount_base_micro,
            occurred_at, merchant, note, receipt_url, source, source_ref,
            created_at, updated_at, deleted_at, sync_version)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          txn.id, user_id, txn.account_id, txn.category_id, txn.kind,
          txn.amount_micro, txn.currency, txn.fx_rate_to_base, txn.amount_base_micro,
          txn.occurred_at, txn.merchant, txn.note, txn.receipt_url,
          txn.source, txn.source_ref,
          txn.created_at, txn.updated_at, txn.deleted_at, txn.sync_version,
        ],
      );
      // Re-enqueue to outbox so the server receives the restored data.
      await enqueueOutbox(db, 'insert', 'transactions', txn.id, txn);
    });
    restored++;
  }
  return { restored };
}
