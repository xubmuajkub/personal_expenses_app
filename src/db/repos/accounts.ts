import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';
import type { Account, AccountType, Currency } from '@/domain/types';
import { enqueueOutbox, nowIso } from './base';
import * as Crypto from 'expo-crypto';

export interface CreateAccountInput {
  user_id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  opening_balance_micro?: number;
}

export async function createAccount(
  db: SQLiteDatabase,
  input: CreateAccountInput,
): Promise<Account> {
  const id = Crypto.randomUUID();
  const now = nowIso();
  const row: Account = {
    id,
    user_id: input.user_id,
    name: input.name,
    type: input.type,
    currency: input.currency,
    opening_balance_micro: input.opening_balance_micro ?? 0,
    archived: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_version: 1,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO accounts (id, user_id, name, type, currency,
         opening_balance_micro, archived, created_at, updated_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 1)`,
      [id, row.user_id, row.name, row.type, row.currency,
        row.opening_balance_micro, now, now],
    );
    await enqueueOutbox(db, 'insert', 'accounts', id, row);
  });
  return row;
}

export async function listAccounts(db: SQLiteDatabase, user_id: string): Promise<Account[]> {
  return db.getAllAsync<Account>(
    `SELECT * FROM accounts
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY archived ASC, name ASC`,
    [user_id],
  ).then((rows) => rows.map((r) => ({ ...r, archived: !!(r as unknown as { archived: number }).archived })));
}

export async function updateAccount(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Pick<Account, 'name' | 'archived' | 'opening_balance_micro'>>,
): Promise<void> {
  const now = nowIso();
  const sets: string[] = [];
  const vals: SQLiteBindValue[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); vals.push(patch.name); }
  if (patch.archived !== undefined) { sets.push('archived = ?'); vals.push(patch.archived ? 1 : 0); }
  if (patch.opening_balance_micro !== undefined) {
    sets.push('opening_balance_micro = ?'); vals.push(patch.opening_balance_micro);
  }
  if (sets.length === 0) return;
  sets.push('updated_at = ?', 'sync_version = sync_version + 1');
  vals.push(now);
  vals.push(id);
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`, vals);
    const after = await db.getAllAsync<Account>(`SELECT * FROM accounts WHERE id = ?`, [id]);
    if (after[0]) await enqueueOutbox(db, 'update', 'accounts', id, after[0]);
  });
}

export async function deleteAccount(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE accounts SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1 WHERE id = ?`,
      [now, now, id],
    );
    await enqueueOutbox(db, 'delete', 'accounts', id, { id, deleted_at: now });
  });
}
