/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { resolveAutoCategory, bumpRuleHit } from '@/domain/auto_categorize';

jest.mock('expo-sqlite', () => require('../db/_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('../db/_mock').expoCryptoMock);

const UID = 'u1';
const CAT_ID = 'cat-1';
const ACC_ID = 'acc-1';
const RULE_ID = 'rule-1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`ac-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db;
}

async function insertRule(
  db: any,
  opts: {
    id?: string;
    pattern: string;
    is_regex?: number;
    category_id?: string;
    account_id?: string | null;
    hit_count?: number;
  },
) {
  const id = opts.id ?? RULE_ID;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO merchant_rules
       (id, user_id, pattern, is_regex, category_id, account_id, hit_count, created_at, updated_at, sync_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      id, UID, opts.pattern,
      opts.is_regex ?? 0,
      opts.category_id ?? CAT_ID,
      opts.account_id ?? ACC_ID,
      opts.hit_count ?? 0,
      now, now,
    ],
  );
}

async function insertTransaction(db: any, merchant: string, category_id: string, account_id: string) {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO transactions
       (id, user_id, account_id, category_id, kind, amount_micro, currency,
        fx_rate_to_base, amount_base_micro, occurred_at, source, created_at, updated_at, sync_version, merchant)
     VALUES (?, ?, ?, ?, 'expense', 1000000, 'LAK', 1.0, 1000000, ?, 'manual', ?, ?, 1, ?)`,
    [`txn-${Math.random()}`, UID, account_id, category_id, now, now, now, merchant],
  );
}

describe('resolveAutoCategory', () => {
  it('returns none for empty merchant', async () => {
    const db = await freshDb();
    const result = await resolveAutoCategory(db as any, UID, '');
    expect(result.source).toBe('none');
    expect(result.category_id).toBeNull();
    expect(result.rule_id).toBeNull();
  });

  it('matches regex rule', async () => {
    const db = await freshDb();
    await insertRule(db, { pattern: '^StarBucks', is_regex: 1 });
    const result = await resolveAutoCategory(db as any, UID, 'StarBucks Coffee');
    expect(result.source).toBe('rule');
    expect(result.category_id).toBe(CAT_ID);
    expect(result.rule_id).toBe(RULE_ID);
  });

  it('does not match regex rule when pattern does not match', async () => {
    const db = await freshDb();
    await insertRule(db, { pattern: '^StarBucks$', is_regex: 1 });
    const result = await resolveAutoCategory(db as any, UID, 'StarBucks Coffee');
    expect(result.source).toBe('none');
  });

  it('matches substring rule case-insensitively', async () => {
    const db = await freshDb();
    await insertRule(db, { pattern: 'starbucks', is_regex: 0 });
    const result = await resolveAutoCategory(db as any, UID, 'STARBUCKS LHONG STREET');
    expect(result.source).toBe('rule');
    expect(result.category_id).toBe(CAT_ID);
  });

  it('regex rule wins over substring rule by hit_count ordering', async () => {
    const db = await freshDb();
    const catId2 = 'cat-2';
    await insertRule(db, {
      id: 'rule-low',
      pattern: 'bucks',
      is_regex: 0,
      category_id: catId2,
      hit_count: 0,
    });
    await insertRule(db, {
      id: 'rule-high',
      pattern: 'star',
      is_regex: 0,
      category_id: CAT_ID,
      hit_count: 10,
    });
    // hit_count DESC puts rule-high first, so CAT_ID wins
    const result = await resolveAutoCategory(db as any, UID, 'starbucks');
    expect(result.category_id).toBe(CAT_ID);
    expect(result.rule_id).toBe('rule-high');
  });

  it('falls back to last_used transaction when no rule matches', async () => {
    const db = await freshDb();
    await insertTransaction(db, 'PhoPa Restaurant', CAT_ID, ACC_ID);
    const result = await resolveAutoCategory(db as any, UID, 'PhoPa Restaurant');
    expect(result.source).toBe('last_used');
    expect(result.category_id).toBe(CAT_ID);
    expect(result.rule_id).toBeNull();
  });

  it('returns none when no rule and no prior transaction', async () => {
    const db = await freshDb();
    const result = await resolveAutoCategory(db as any, UID, 'Unknown Merchant');
    expect(result.source).toBe('none');
    expect(result.category_id).toBeNull();
  });
});

describe('bumpRuleHit', () => {
  it('increments hit_count and enqueues outbox', async () => {
    const db = await freshDb();
    await insertRule(db, { id: RULE_ID, pattern: 'test', hit_count: 3 });
    await bumpRuleHit(db as any, RULE_ID);
    const rows = await (db as any).getAllAsync(
      'SELECT hit_count FROM merchant_rules WHERE id = ?', [RULE_ID],
    );
    expect(rows[0].hit_count).toBe(4);
    const outbox = await (db as any).getAllAsync('SELECT * FROM outbox');
    expect(outbox).toHaveLength(1);
    expect(outbox[0].op).toBe('update');
    expect(outbox[0].table_name).toBe('merchant_rules');
  });
});
