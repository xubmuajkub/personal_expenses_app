import type { SQLiteDatabase } from 'expo-sqlite';
import type { TxnKind, Currency } from '@/domain/types';
import { enqueueOutbox, nowIso } from './base';
import * as Crypto from 'expo-crypto';

export type RecurringMode = 'auto' | 'confirm';

export interface TemplateTxn {
  account_id: string;
  category_id?: string;
  kind: TxnKind;
  amount_micro: number;
  currency: Currency;
  merchant?: string;
  note?: string;
}

export interface RecurringRule {
  id: string;
  user_id: string;
  name: string;
  template_txn: string; // JSON-encoded TemplateTxn
  cadence: string;
  mode: RecurringMode;
  next_run_at: string;
  last_notified_at: string | null;
  end_date: string | null;
  enabled: number; // SQLite boolean: 0 | 1
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

export interface CreateRecurringRuleInput {
  user_id: string;
  name: string;
  template_txn: TemplateTxn;
  cadence: string;
  mode: RecurringMode;
  next_run_at: string;
  end_date?: string;
}

export interface UpdateRecurringRuleInput {
  name?: string;
  template_txn?: TemplateTxn;
  cadence?: string;
  mode?: RecurringMode;
  next_run_at?: string;
  end_date?: string | null;
  enabled?: boolean;
}

export async function createRecurringRule(
  db: SQLiteDatabase,
  input: CreateRecurringRuleInput,
): Promise<RecurringRule> {
  const id = Crypto.randomUUID();
  const now = nowIso();
  const row: RecurringRule = {
    id,
    user_id: input.user_id,
    name: input.name,
    template_txn: JSON.stringify(input.template_txn),
    cadence: input.cadence,
    mode: input.mode,
    next_run_at: input.next_run_at,
    last_notified_at: null,
    end_date: input.end_date ?? null,
    enabled: 1,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_version: 1,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO recurring_rules
         (id, user_id, name, template_txn, cadence, mode, next_run_at,
          last_notified_at, end_date, enabled, created_at, updated_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?, ?, 1)`,
      [
        id, row.user_id, row.name, row.template_txn, row.cadence, row.mode,
        row.next_run_at, row.end_date, now, now,
      ],
    );
    await enqueueOutbox(db, 'insert', 'recurring_rules', id, row);
  });
  return row;
}

export async function listRecurringRules(
  db: SQLiteDatabase,
  user_id: string,
): Promise<RecurringRule[]> {
  return db.getAllAsync<RecurringRule>(
    `SELECT * FROM recurring_rules WHERE user_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
    [user_id],
  );
}

export async function getRecurringRule(
  db: SQLiteDatabase,
  id: string,
): Promise<RecurringRule | null> {
  const rows = await db.getAllAsync<RecurringRule>(
    `SELECT * FROM recurring_rules WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return rows[0] ?? null;
}

export async function updateRecurringRule(
  db: SQLiteDatabase,
  id: string,
  input: UpdateRecurringRuleInput,
): Promise<RecurringRule | null> {
  const now = nowIso();
  const sets: string[] = ['updated_at = ?', 'sync_version = sync_version + 1'];
  const vals: (string | number | null)[] = [now];

  if (input.name !== undefined) { sets.push('name = ?'); vals.push(input.name); }
  if (input.template_txn !== undefined) {
    sets.push('template_txn = ?');
    vals.push(JSON.stringify(input.template_txn));
  }
  if (input.cadence !== undefined) { sets.push('cadence = ?'); vals.push(input.cadence); }
  if (input.mode !== undefined) { sets.push('mode = ?'); vals.push(input.mode); }
  if (input.next_run_at !== undefined) { sets.push('next_run_at = ?'); vals.push(input.next_run_at); }
  if ('end_date' in input) { sets.push('end_date = ?'); vals.push(input.end_date ?? null); }
  if (input.enabled !== undefined) { sets.push('enabled = ?'); vals.push(input.enabled ? 1 : 0); }

  vals.push(id);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE recurring_rules SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    const after = await db.getAllAsync<RecurringRule>(
      `SELECT * FROM recurring_rules WHERE id = ?`, [id],
    );
    if (after[0]) await enqueueOutbox(db, 'update', 'recurring_rules', id, after[0]);
  });
  const updated = await db.getAllAsync<RecurringRule>(
    `SELECT * FROM recurring_rules WHERE id = ?`, [id],
  );
  return updated[0] ?? null;
}

export async function deleteRecurringRule(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE recurring_rules
         SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1
       WHERE id = ?`,
      [now, now, id],
    );
    await enqueueOutbox(db, 'delete', 'recurring_rules', id, { id, deleted_at: now });
  });
}
