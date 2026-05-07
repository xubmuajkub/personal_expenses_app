/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { savingsRate } from '@/domain/reports/savings_rate';

jest.mock('expo-sqlite', () => require('../../db/_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('../../db/_mock').expoCryptoMock);

const UID = 'u1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`sr-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  await (db as any).execAsync(`
    INSERT INTO accounts (id, user_id, name, type, currency, created_at, updated_at)
    VALUES ('a1', '${UID}', 'Cash', 'cash', 'LAK', datetime('now'), datetime('now'));
  `);
  return db as any;
}

async function insertTxn(
  db: any,
  when: string,
  amount: number,
  kind: 'expense' | 'income' = 'expense',
) {
  const now = new Date().toISOString();
  const id = Math.random().toString(36).slice(2);
  await db.runAsync(
    `INSERT INTO transactions
       (id, user_id, account_id, kind, amount_micro, currency,
        fx_rate_to_base, amount_base_micro, occurred_at, source, created_at, updated_at, sync_version)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [id, UID, 'a1', kind, amount, 'LAK', 1, amount, when, 'manual', now, now],
  );
}

describe('savingsRate', () => {
  it('computes savings rate as (income - spend) / income', async () => {
    const db = await freshDb();
    await insertTxn(db, '2026-05-05T00:00:00Z', 400_0000, 'income');
    await insertTxn(db, '2026-05-10T00:00:00Z', 100_0000, 'expense');
    const result = await savingsRate(db, UID, '2026-05-01', '2026-05-31');
    expect(result.income_micro).toBe(400_0000);
    expect(result.spend_micro).toBe(100_0000);
    expect(result.rate).toBeCloseTo(0.75);
  });

  it('returns 0 rate when no income', async () => {
    const db = await freshDb();
    await insertTxn(db, '2026-05-05T00:00:00Z', 100_0000, 'expense');
    const result = await savingsRate(db, UID, '2026-05-01', '2026-05-31');
    expect(result.income_micro).toBe(0);
    expect(result.rate).toBe(0);
  });

  it('returns negative rate when spend exceeds income', async () => {
    const db = await freshDb();
    await insertTxn(db, '2026-05-05T00:00:00Z', 100_0000, 'income');
    await insertTxn(db, '2026-05-10T00:00:00Z', 300_0000, 'expense');
    const result = await savingsRate(db, UID, '2026-05-01', '2026-05-31');
    expect(result.rate).toBeCloseTo(-2);
  });

  it('returns zero values when no transactions', async () => {
    const db = await freshDb();
    const result = await savingsRate(db, UID, '2026-05-01', '2026-05-31');
    expect(result.income_micro).toBe(0);
    expect(result.spend_micro).toBe(0);
    expect(result.rate).toBe(0);
  });
});
