import type { SQLiteDatabase } from 'expo-sqlite';
import { enqueueOutbox, nowIso } from './base';
import * as Crypto from 'expo-crypto';

export interface MerchantRule {
  id: string;
  user_id: string;
  pattern: string;
  is_regex: boolean;
  category_id: string;
  account_id: string | null;
  hit_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

interface MerchantRuleRow {
  id: string;
  user_id: string;
  pattern: string;
  is_regex: number;
  category_id: string;
  account_id: string | null;
  hit_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

function toRule(r: MerchantRuleRow): MerchantRule {
  return { ...r, is_regex: r.is_regex !== 0 };
}

export interface CreateMerchantRuleInput {
  user_id: string;
  pattern: string;
  is_regex: boolean;
  category_id: string;
  account_id?: string | null;
}

export async function createMerchantRule(
  db: SQLiteDatabase,
  input: CreateMerchantRuleInput,
): Promise<MerchantRule> {
  const id = Crypto.randomUUID();
  const now = nowIso();
  const row: MerchantRule = {
    id,
    user_id: input.user_id,
    pattern: input.pattern,
    is_regex: input.is_regex,
    category_id: input.category_id,
    account_id: input.account_id ?? null,
    hit_count: 0,
    last_used_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_version: 1,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO merchant_rules
         (id, user_id, pattern, is_regex, category_id, account_id,
          hit_count, created_at, updated_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 1)`,
      [id, row.user_id, row.pattern, row.is_regex ? 1 : 0,
       row.category_id, row.account_id, now, now],
    );
    await enqueueOutbox(db, 'insert', 'merchant_rules', id, row);
  });
  return row;
}

export async function listMerchantRules(
  db: SQLiteDatabase,
  user_id: string,
): Promise<MerchantRule[]> {
  const rows = await db.getAllAsync<MerchantRuleRow>(
    `SELECT * FROM merchant_rules
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY hit_count DESC, last_used_at DESC NULLS LAST, created_at ASC`,
    [user_id],
  );
  return rows.map(toRule);
}

export async function getMerchantRule(
  db: SQLiteDatabase,
  id: string,
): Promise<MerchantRule | null> {
  const rows = await db.getAllAsync<MerchantRuleRow>(
    `SELECT * FROM merchant_rules WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return toRule(row);
}

export async function updateMerchantRule(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Pick<MerchantRule, 'pattern' | 'is_regex' | 'category_id' | 'account_id'>>,
): Promise<void> {
  const now = nowIso();
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.pattern !== undefined) { sets.push('pattern = ?'); vals.push(patch.pattern); }
  if (patch.is_regex !== undefined) { sets.push('is_regex = ?'); vals.push(patch.is_regex ? 1 : 0); }
  if (patch.category_id !== undefined) { sets.push('category_id = ?'); vals.push(patch.category_id); }
  if (patch.account_id !== undefined) { sets.push('account_id = ?'); vals.push(patch.account_id); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?', 'sync_version = sync_version + 1');
  vals.push(now);
  vals.push(id);
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE merchant_rules SET ${sets.join(', ')} WHERE id = ?`, vals);
    const after = await db.getAllAsync<MerchantRuleRow>(
      `SELECT * FROM merchant_rules WHERE id = ?`, [id],
    );
    if (after[0]) await enqueueOutbox(db, 'update', 'merchant_rules', id, after[0]);
  });
}

export async function deleteMerchantRule(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE merchant_rules SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1
       WHERE id = ?`,
      [now, now, id],
    );
    await enqueueOutbox(db, 'delete', 'merchant_rules', id, { id, deleted_at: now });
  });
}
