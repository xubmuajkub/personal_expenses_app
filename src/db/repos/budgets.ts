import type { SQLiteDatabase } from 'expo-sqlite';
import type { Budget, Currency } from '@/domain/types';
import { enqueueOutbox, nowIso } from './base';
import * as Crypto from 'expo-crypto';

export interface UpsertBudgetInput {
  user_id: string;
  category_id: string;
  month: string;           // YYYY-MM-01
  limit_amount_micro: number;
  limit_currency: Currency;
}

export async function upsertBudget(
  db: SQLiteDatabase,
  input: UpsertBudgetInput,
): Promise<Budget> {
  const now = nowIso();

  // Check if existing row for (user_id, category_id, month)
  const existing = await db.getAllAsync<Budget>(
    `SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND deleted_at IS NULL`,
    [input.user_id, input.category_id, input.month],
  );

  if (existing[0]) {
    const row = existing[0];
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE budgets SET limit_amount_micro = ?, limit_currency = ?,
           updated_at = ?, sync_version = sync_version + 1
         WHERE id = ?`,
        [input.limit_amount_micro, input.limit_currency, now, row.id],
      );
      const after = await db.getAllAsync<Budget>(`SELECT * FROM budgets WHERE id = ?`, [row.id]);
      if (after[0]) await enqueueOutbox(db, 'update', 'budgets', row.id, after[0]);
    });
    const updated = await db.getAllAsync<Budget>(`SELECT * FROM budgets WHERE id = ?`, [row.id]);
    return updated[0] ?? row;
  }

  const id = Crypto.randomUUID();
  const row: Budget = {
    id,
    user_id: input.user_id,
    category_id: input.category_id,
    month: input.month,
    limit_amount_micro: input.limit_amount_micro,
    limit_currency: input.limit_currency,
    last_alert_threshold: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_version: 1,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO budgets (id, user_id, category_id, month, limit_amount_micro, limit_currency,
         last_alert_threshold, created_at, updated_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 1)`,
      [id, row.user_id, row.category_id, row.month,
        row.limit_amount_micro, row.limit_currency, now, now],
    );
    await enqueueOutbox(db, 'insert', 'budgets', id, row);
  });
  return row;
}

export async function listBudgets(
  db: SQLiteDatabase,
  user_id: string,
  month?: string,
): Promise<Budget[]> {
  const conditions = ['user_id = ?', 'deleted_at IS NULL'];
  const vals: unknown[] = [user_id];
  if (month) { conditions.push('month = ?'); vals.push(month); }
  return db.getAllAsync<Budget>(
    `SELECT * FROM budgets WHERE ${conditions.join(' AND ')} ORDER BY month DESC`,
    vals,
  );
}

export async function deleteBudget(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE budgets SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1 WHERE id = ?`,
      [now, now, id],
    );
    await enqueueOutbox(db, 'delete', 'budgets', id, { id, deleted_at: now });
  });
}
