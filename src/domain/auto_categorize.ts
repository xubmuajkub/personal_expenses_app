import type { SQLiteDatabase } from 'expo-sqlite';
import { enqueueOutbox, nowIso } from '@/db/repos/base';

export interface AutoCatResult {
  category_id: string | null;
  account_id: string | null;
  rule_id: string | null;
  source: 'rule' | 'last_used' | 'none';
}

interface RuleRow {
  id: string;
  pattern: string;
  is_regex: number;
  category_id: string;
  account_id: string | null;
}

interface LastTxnRow {
  category_id: string | null;
  account_id: string;
}

export async function resolveAutoCategory(
  db: SQLiteDatabase,
  user_id: string,
  merchant: string,
): Promise<AutoCatResult> {
  if (!merchant) return { category_id: null, account_id: null, rule_id: null, source: 'none' };

  const rules = await db.getAllAsync<RuleRow>(
    `SELECT id, pattern, is_regex, category_id, account_id FROM merchant_rules
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY hit_count DESC, last_used_at DESC NULLS LAST`,
    [user_id],
  );

  for (const r of rules) {
    const hit = r.is_regex
      ? new RegExp(r.pattern, 'i').test(merchant)
      : merchant.toLowerCase().includes(r.pattern.toLowerCase());
    if (hit) {
      return {
        category_id: r.category_id,
        account_id: r.account_id,
        rule_id: r.id,
        source: 'rule',
      };
    }
  }

  const last = await db.getAllAsync<LastTxnRow>(
    `SELECT category_id, account_id FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL AND merchant = ?
     ORDER BY occurred_at DESC LIMIT 1`,
    [user_id, merchant],
  );

  const lastRow = last[0];
  if (lastRow?.category_id) {
    return {
      category_id: lastRow.category_id,
      account_id: lastRow.account_id,
      rule_id: null,
      source: 'last_used',
    };
  }

  return { category_id: null, account_id: null, rule_id: null, source: 'none' };
}

export async function bumpRuleHit(db: SQLiteDatabase, rule_id: string): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE merchant_rules
       SET hit_count = hit_count + 1,
           last_used_at = ?,
           updated_at = ?,
           sync_version = sync_version + 1
       WHERE id = ?`,
      [now, now, rule_id],
    );
    const after = await db.getAllAsync<{ id: string; hit_count: number }>(
      `SELECT id, hit_count FROM merchant_rules WHERE id = ?`,
      [rule_id],
    );
    if (after[0]) {
      await enqueueOutbox(db, 'update', 'merchant_rules', rule_id, { id: rule_id, updated_at: now });
    }
  });
}
