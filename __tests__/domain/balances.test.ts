/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { computeBalances } from '@/domain/balances';
import { toMicro } from '@/domain/money';

jest.mock('expo-sqlite', () => require('../db/_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('../db/_mock').expoCryptoMock);

const UID = 'u1';
const BASE = 'LAK' as const;

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`b-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db as any;
}

async function insertAccount(
  db: any,
  id: string,
  currency: string,
  opening: number,
) {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_micro, archived, created_at, updated_at, sync_version)
     VALUES (?, ?, ?, 'cash', ?, ?, 0, ?, ?, 1)`,
    [id, UID, `Acct-${id}`, currency, opening, now, now],
  );
}

async function insertTxn(
  db: any,
  id: string,
  account_id: string,
  kind: string,
  amount_micro: number,
  currency: string = BASE,
) {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO transactions
       (id, user_id, account_id, kind, amount_micro, currency,
        fx_rate_to_base, amount_base_micro, occurred_at, source, created_at, updated_at, sync_version)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'manual', ?, ?, 1)`,
    [id, UID, account_id, kind, amount_micro, currency, amount_micro, now, now, now],
  );
}

async function insertTransfer(db: any, from_txn_id: string, to_txn_id: string) {
  const now = new Date().toISOString();
  const id = `xfer-${Math.random().toString(36).slice(2)}`;
  await db.runAsync(
    `INSERT INTO transfers (id, user_id, from_txn_id, to_txn_id, created_at, updated_at, sync_version)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [id, UID, from_txn_id, to_txn_id, now, now],
  );
}

describe('computeBalances', () => {
  it('includes opening balance', async () => {
    const db = await freshDb();
    await insertAccount(db, 'a1', 'LAK', toMicro(100000));
    const balances = await computeBalances(db, UID, BASE);
    expect(balances).toHaveLength(1);
    expect(balances[0]?.balance_micro).toBe(toMicro(100000));
  });

  it('adds income and subtracts expenses', async () => {
    const db = await freshDb();
    await insertAccount(db, 'a1', 'LAK', toMicro(50000));
    await insertTxn(db, 't1', 'a1', 'income', toMicro(30000));
    await insertTxn(db, 't2', 'a1', 'expense', toMicro(10000));
    const balances = await computeBalances(db, UID, BASE);
    // 50000 + 30000 - 10000 = 70000
    expect(balances[0]?.balance_micro).toBe(toMicro(70000));
  });

  it('accounts for transfers between accounts', async () => {
    const db = await freshDb();
    await insertAccount(db, 'a1', 'LAK', toMicro(100000));
    await insertAccount(db, 'a2', 'LAK', 0);
    // Transfer 20000 from a1 to a2
    await insertTxn(db, 'from-t', 'a1', 'transfer', toMicro(20000));
    await insertTxn(db, 'to-t', 'a2', 'transfer', toMicro(20000));
    await insertTransfer(db, 'from-t', 'to-t');
    const balances = await computeBalances(db, UID, BASE);
    const a1Balance = balances.find((b) => b.account_id === 'a1')?.balance_micro ?? -1;
    const a2Balance = balances.find((b) => b.account_id === 'a2')?.balance_micro ?? -1;
    // a1: 100000 - 20000 = 80000
    expect(a1Balance).toBe(toMicro(80000));
    // a2: 0 + 20000 = 20000
    expect(a2Balance).toBe(toMicro(20000));
  });
});
