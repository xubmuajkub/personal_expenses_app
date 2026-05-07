import type { SQLiteDatabase } from 'expo-sqlite';
import { parseNotif, type ParseRule } from './notif_parser';
import { resolveAutoCategory, bumpRuleHit } from './auto_categorize';
import { createTransaction } from '@/db/repos/transactions';
import { getRate } from '@/db/repos/fx_rates';
import { getProfile } from '@/db/repos/profiles';
import { nowIso } from '@/db/repos/base';
import type { NotifPayload } from '@/native/types';

export async function processNotif(
  db: SQLiteDatabase, user_id: string, payload: NotifPayload,
): Promise<{ created: boolean; txn_id?: string; reason?: string }> {
  // dedup
  const dup = await db.getAllAsync<{ key: string }>(
    `SELECT key FROM raw_notifs WHERE key = ?`, [payload.key]);
  if (dup.length) return { created: false, reason: 'dup' };

  await db.runAsync(
    `INSERT INTO raw_notifs (package, title, text, posted_at, key, processed)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [payload.package, payload.title, payload.text,
     new Date(payload.postedAt).toISOString(), payload.key]);

  const ruleRows = await db.getAllAsync<ParseRule & { enabled: number }>(
    `SELECT id, app_package, regex, field_map, priority, default_account_id
     FROM notif_parse_rules
     WHERE user_id = ? AND enabled = 1 AND deleted_at IS NULL AND app_package = ?
     ORDER BY priority DESC`,
    [user_id, payload.package]);

  const rules = ruleRows.map((r) => ({
    ...r,
    field_map: typeof r.field_map === 'string' ? JSON.parse(r.field_map as unknown as string) : r.field_map,
  }));

  const parsed = parseNotif(payload, rules);
  const profile = await getProfile(db, user_id);
  const baseCurr = profile?.base_currency ?? 'LAK';

  if (!parsed) {
    return { created: false, reason: 'no_rule_match' };
  }

  // Resolve account
  const matchedRule = rules.find((r) => r.id === parsed.rule_id);
  let account_id = matchedRule?.default_account_id ?? null;
  if (!account_id) {
    const accs = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM accounts WHERE user_id = ? AND archived = 0 AND deleted_at IS NULL ORDER BY created_at LIMIT 1`,
      [user_id]);
    account_id = accs[0]?.id ?? null;
  }
  if (!account_id) return { created: false, reason: 'no_account' };

  // Auto categorize
  const auto = parsed.merchant
    ? await resolveAutoCategory(db, user_id, parsed.merchant)
    : { category_id: null, account_id: null, rule_id: null, source: 'none' as const };

  // Dedup against manual entry near the same time / amount
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const fiveMinAhead = new Date(Date.now() + 5 * 60_000).toISOString();
  const collisions = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM transactions
     WHERE user_id = ? AND account_id = ? AND amount_micro = ?
       AND occurred_at BETWEEN ? AND ? AND deleted_at IS NULL
     LIMIT 1`,
    [user_id, account_id, parsed.amount_micro, fiveMinAgo, fiveMinAhead]);
  if (collisions[0]) {
    await db.runAsync(
      `UPDATE raw_notifs SET processed = 1, parsed_txn_id = ? WHERE key = ?`,
      [collisions[0].id, payload.key]);
    return { created: false, reason: 'collision_with_manual' };
  }

  const rate = await getRate(db, parsed.currency, baseCurr);
  const txnInput: Parameters<typeof createTransaction>[1] = {
    user_id,
    account_id,
    kind: 'expense',
    amount_micro: parsed.amount_micro,
    currency: parsed.currency,
    fx_rate_to_base: rate,
    occurred_at: new Date(payload.postedAt).toISOString(),
    source: 'notif',
    source_ref: payload.key,
  };
  if (auto.category_id) txnInput.category_id = auto.category_id;
  if (parsed.merchant) txnInput.merchant = parsed.merchant;
  const txn = await createTransaction(db, txnInput);
  if (auto.rule_id) await bumpRuleHit(db, auto.rule_id);
  await db.runAsync(
    `UPDATE raw_notifs SET processed = 1, parsed_txn_id = ? WHERE key = ?`,
    [txn.id, payload.key]);
  void nowIso;
  return { created: true, txn_id: txn.id };
}
