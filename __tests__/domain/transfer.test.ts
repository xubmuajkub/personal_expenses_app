/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { createTransfer } from '@/domain/transfer';
import { toMicro } from '@/domain/money';
import type { Account } from '@/domain/types';

jest.mock('expo-sqlite', () => require('../db/_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('../db/_mock').expoCryptoMock);

const UID = 'u1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`tr-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db as any;
}

async function insertAccount(db: any, id: string, currency: string): Promise<Account> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_micro, archived, created_at, updated_at, sync_version)
     VALUES (?, ?, ?, 'bank', ?, 0, 0, ?, ?, 1)`,
    [id, UID, `Acct-${id}`, currency, now, now],
  );
  return {
    id,
    user_id: UID,
    name: `Acct-${id}`,
    type: 'bank',
    currency: currency as any,
    opening_balance_micro: 0,
    archived: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_version: 1,
  };
}

async function insertRate(db: any, from: string, to: string, rate: number) {
  const today = new Date().toISOString().slice(0, 10);
  await db.runAsync(
    `INSERT INTO fx_rates (date, from_curr, to_curr, rate) VALUES (?, ?, ?, ?)
     ON CONFLICT (date, from_curr, to_curr) DO UPDATE SET rate = excluded.rate`,
    [today, from, to, rate],
  );
}

describe('createTransfer', () => {
  it('creates paired transactions and computes cross-currency toAmount', async () => {
    const db = await freshDb();
    const usdAccount = await insertAccount(db, 'a-usd', 'USD');
    const lakAccount = await insertAccount(db, 'a-lak', 'LAK');

    // 1 USD = 21000 LAK
    await insertRate(db, 'USD', 'LAK', 21000);
    await insertRate(db, 'USD', 'LAK', 21000);
    // Base rates
    await insertRate(db, 'USD', 'LAK', 21000);
    await insertRate(db, 'LAK', 'LAK', 1);

    const result = await createTransfer(db, {
      user_id: UID,
      from_account: usdAccount,
      to_account: lakAccount,
      from_amount_micro: toMicro(1), // 1 USD
      occurred_at: new Date().toISOString(),
      base_currency: 'LAK',
    });

    // 1 USD → 21000 LAK
    expect(result.toAmount).toBe(toMicro(21000));

    // Both transaction rows should exist
    const txns = await db.getAllAsync(
      `SELECT * FROM transactions WHERE id IN (?, ?)`,
      [result.fromTxnId, result.toTxnId],
    );
    expect(txns).toHaveLength(2);

    // Transfer join row should exist
    const transfers = await db.getAllAsync(
      `SELECT * FROM transfers WHERE id = ?`,
      [result.transferId],
    );
    expect(transfers).toHaveLength(1);
    expect(transfers[0].from_txn_id).toBe(result.fromTxnId);
    expect(transfers[0].to_txn_id).toBe(result.toTxnId);
  });

  it('uses rate=1 when same currency', async () => {
    const db = await freshDb();
    const a1 = await insertAccount(db, 'a1', 'LAK');
    const a2 = await insertAccount(db, 'a2', 'LAK');

    const result = await createTransfer(db, {
      user_id: UID,
      from_account: a1,
      to_account: a2,
      from_amount_micro: toMicro(5000),
      occurred_at: new Date().toISOString(),
      base_currency: 'LAK',
    });

    expect(result.toAmount).toBe(toMicro(5000));
  });

  it('respects explicit fx_rate override', async () => {
    const db = await freshDb();
    const usdAccount = await insertAccount(db, 'u1', 'USD');
    const lakAccount = await insertAccount(db, 'l1', 'LAK');

    // Store a default rate, but override with a custom one
    await insertRate(db, 'USD', 'LAK', 21000);

    const result = await createTransfer(db, {
      user_id: UID,
      from_account: usdAccount,
      to_account: lakAccount,
      from_amount_micro: toMicro(1),
      fx_rate: 22000,
      occurred_at: new Date().toISOString(),
      base_currency: 'LAK',
    });

    // Should use the override rate 22000
    expect(result.toAmount).toBe(toMicro(22000));
  });
});
