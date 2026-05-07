import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';
import type { Transaction, TxnKind, TxnSource, Currency } from '@/domain/types';
import { applyRate } from '@/domain/money';
import { enqueueOutbox, nowIso } from './base';
import * as Crypto from 'expo-crypto';

export interface CreateTransactionInput {
  user_id: string;
  account_id: string;
  category_id?: string;
  kind: TxnKind;
  amount_micro: number;
  currency: Currency;
  fx_rate_to_base: number;
  occurred_at: string;
  merchant?: string;
  note?: string;
  source: TxnSource;
  source_ref?: string;
}

export interface ListTransactionsFilter {
  user_id: string;
  from?: string;
  to?: string;
  account_id?: string;
  account_ids?: string[];
  category_id?: string;
  category_ids?: string[];
  kind?: TxnKind;
  source?: TxnSource;
  sources?: TxnSource[];
  currency?: Currency;
  amount_min_micro?: number;
  amount_max_micro?: number;
  search?: string;
  limit?: number;
}

export async function createTransaction(
  db: SQLiteDatabase,
  input: CreateTransactionInput,
): Promise<Transaction> {
  const id = Crypto.randomUUID();
  const now = nowIso();
  const amount_base_micro = applyRate(input.amount_micro, input.fx_rate_to_base);
  const row: Transaction = {
    id,
    user_id: input.user_id,
    account_id: input.account_id,
    category_id: input.category_id ?? null,
    kind: input.kind,
    amount_micro: input.amount_micro,
    currency: input.currency,
    fx_rate_to_base: input.fx_rate_to_base,
    amount_base_micro,
    occurred_at: input.occurred_at,
    merchant: input.merchant ?? null,
    note: input.note ?? null,
    receipt_url: null,
    source: input.source,
    source_ref: input.source_ref ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_version: 1,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO transactions (id, user_id, account_id, category_id, kind,
         amount_micro, currency, fx_rate_to_base, amount_base_micro, occurred_at,
         merchant, note, source, source_ref, created_at, updated_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id, row.user_id, row.account_id, row.category_id, row.kind,
        row.amount_micro, row.currency, row.fx_rate_to_base, row.amount_base_micro,
        row.occurred_at, row.merchant, row.note, row.source, row.source_ref,
        now, now,
      ],
    );
    await enqueueOutbox(db, 'insert', 'transactions', id, row);
  });
  return row;
}

export async function listTransactions(
  db: SQLiteDatabase,
  filter: ListTransactionsFilter,
): Promise<Transaction[]> {
  const conditions: string[] = ['user_id = ?', 'deleted_at IS NULL'];
  const vals: SQLiteBindValue[] = [filter.user_id];

  if (filter.from) { conditions.push('occurred_at >= ?'); vals.push(filter.from); }
  if (filter.to) { conditions.push('occurred_at <= ?'); vals.push(filter.to); }
  if (filter.account_id) { conditions.push('account_id = ?'); vals.push(filter.account_id); }
  if (filter.account_ids && filter.account_ids.length > 0) {
    conditions.push(`account_id IN (${filter.account_ids.map(() => '?').join(',')})`);
    vals.push(...filter.account_ids);
  }
  if (filter.category_id) { conditions.push('category_id = ?'); vals.push(filter.category_id); }
  if (filter.category_ids && filter.category_ids.length > 0) {
    conditions.push(`category_id IN (${filter.category_ids.map(() => '?').join(',')})`);
    vals.push(...filter.category_ids);
  }
  if (filter.kind) { conditions.push('kind = ?'); vals.push(filter.kind); }
  if (filter.source) { conditions.push('source = ?'); vals.push(filter.source); }
  if (filter.sources && filter.sources.length > 0) {
    conditions.push(`source IN (${filter.sources.map(() => '?').join(',')})`);
    vals.push(...filter.sources);
  }
  if (filter.currency) { conditions.push('currency = ?'); vals.push(filter.currency); }
  if (filter.amount_min_micro !== undefined) {
    conditions.push('amount_micro >= ?');
    vals.push(filter.amount_min_micro);
  }
  if (filter.amount_max_micro !== undefined) {
    conditions.push('amount_micro <= ?');
    vals.push(filter.amount_max_micro);
  }
  if (filter.search) {
    conditions.push('(merchant LIKE ? OR note LIKE ?)');
    vals.push(`%${filter.search}%`, `%${filter.search}%`);
  }

  const limit = filter.limit ?? 200;
  vals.push(limit);
  const sql = `SELECT * FROM transactions WHERE ${conditions.join(' AND ')} ORDER BY occurred_at DESC LIMIT ?`;
  return db.getAllAsync<Transaction>(sql, vals);
}

export async function getTransaction(db: SQLiteDatabase, id: string): Promise<Transaction | null> {
  const rows = await db.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return rows[0] ?? null;
}

export interface UpdateTransactionInput {
  receipt_url?: string | null;
  merchant?: string | null;
  note?: string | null;
  category_id?: string | null;
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: string,
  patch: UpdateTransactionInput,
): Promise<void> {
  const now = nowIso();
  const fields: string[] = ['updated_at = ?', 'sync_version = sync_version + 1'];
  const vals: (string | null)[] = [now];

  if ('receipt_url' in patch) { fields.push('receipt_url = ?'); vals.push(patch.receipt_url ?? null); }
  if ('merchant' in patch) { fields.push('merchant = ?'); vals.push(patch.merchant ?? null); }
  if ('note' in patch) { fields.push('note = ?'); vals.push(patch.note ?? null); }
  if ('category_id' in patch) { fields.push('category_id = ?'); vals.push(patch.category_id ?? null); }

  vals.push(id);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
      vals,
    );
    await enqueueOutbox(db, 'update', 'transactions', id, { id, ...patch, updated_at: now });
  });
}

export async function deleteTransaction(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE transactions SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1 WHERE id = ?`,
      [now, now, id],
    );
    await enqueueOutbox(db, 'delete', 'transactions', id, { id, deleted_at: now });
  });
}
