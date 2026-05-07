/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { processNotif } from '@/domain/notif_pipeline';

jest.mock('expo-sqlite', () => require('../db/_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('../db/_mock').expoCryptoMock);

const UID = 'u1';
const ACC_ID = 'acc-1';
const RULE_ID = 'rule-1';
const now = new Date().toISOString();

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`pipeline-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db as any;
}

async function insertAccount(db: any, id = ACC_ID) {
  await db.runAsync(
    `INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_micro, archived, created_at, updated_at, sync_version)
     VALUES (?, ?, 'BCEL', 'bank', 'LAK', 0, 0, ?, ?, 1)`,
    [id, UID, now, now],
  );
}

async function insertNotifRule(db: any) {
  await db.runAsync(
    `INSERT INTO notif_parse_rules (id, user_id, app_package, regex, field_map, priority, enabled, default_account_id, created_at, updated_at, sync_version)
     VALUES (?, ?, 'la.bcel.bcelone', 'Debit\\s+([\\d,\\.]+)\\s+(LAK|THB|USD)\\s+at\\s+(.+)', '{"amount":"$1","currency":"$2","merchant":"$3"}', 100, 1, NULL, ?, ?, 1)`,
    [RULE_ID, UID, now, now],
  );
}

const BASE_PAYLOAD = {
  package: 'la.bcel.bcelone',
  title: 'BCELOne',
  text: 'Debit 100,000 LAK at Cafe',
  postedAt: Date.now(),
  key: 'notif-key-1',
};

describe('processNotif', () => {
  it('creates a transaction and marks raw_notifs processed', async () => {
    const db = await freshDb();
    await insertAccount(db);
    await insertNotifRule(db);

    const result = await processNotif(db, UID, BASE_PAYLOAD);
    expect(result.created).toBe(true);
    expect(result.txn_id).toBeTruthy();

    const rawRows = (await db.getAllAsync(
      `SELECT processed, parsed_txn_id FROM raw_notifs WHERE key = ?`, [BASE_PAYLOAD.key],
    )) as { processed: number; parsed_txn_id: string }[];
    expect(rawRows[0]?.processed).toBe(1);
    expect(rawRows[0]?.parsed_txn_id).toBe(result.txn_id);
  });

  it('returns reason:dup when notif key already exists', async () => {
    const db = await freshDb();
    await insertAccount(db);
    await insertNotifRule(db);

    await processNotif(db, UID, BASE_PAYLOAD);
    const result = await processNotif(db, UID, BASE_PAYLOAD);
    expect(result.created).toBe(false);
    expect(result.reason).toBe('dup');
  });

  it('returns reason:collision_with_manual when a manual txn exists within ±5 min', async () => {
    const db = await freshDb();
    await insertAccount(db);
    await insertNotifRule(db);

    // Insert a manual transaction with the same amount at roughly now
    const amountMicro = 1_000_000_000; // 100,000 LAK in micro (100000 * 10000)
    const txnNow = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO transactions
         (id, user_id, account_id, category_id, kind, amount_micro, currency,
          fx_rate_to_base, amount_base_micro, occurred_at, source, created_at, updated_at, sync_version)
       VALUES ('manual-1', ?, ?, NULL, 'expense', ?, 'LAK', 1.0, ?, ?, 'manual', ?, ?, 1)`,
      [UID, ACC_ID, amountMicro, amountMicro, txnNow, txnNow, txnNow],
    );

    const result = await processNotif(db, UID, { ...BASE_PAYLOAD, key: 'notif-key-2' });
    expect(result.created).toBe(false);
    expect(result.reason).toBe('collision_with_manual');
  });

  it('returns reason:no_rule_match when package has no matching rule', async () => {
    const db = await freshDb();
    await insertAccount(db);
    // No rule inserted

    const result = await processNotif(db, UID, { ...BASE_PAYLOAD, key: 'notif-key-3' });
    expect(result.created).toBe(false);
    expect(result.reason).toBe('no_rule_match');
  });
});
