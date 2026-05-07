/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { monthlyTrend } from '@/domain/reports/trend';

jest.mock('expo-sqlite', () => require('../../db/_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('../../db/_mock').expoCryptoMock);

const UID = 'u1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`trend-${Math.random()}.db`);
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

describe('monthlyTrend', () => {
  it('aggregates spend and income by month', async () => {
    const db = await freshDb();
    // Use fixed months relative to now (monthlyTrend uses now internally)
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const date1 = `${thisMonth}-05T00:00:00Z`;
    const date2 = `${thisMonth}-15T00:00:00Z`;
    await insertTxn(db, date1, 100_0000, 'expense');
    await insertTxn(db, date2, 200_0000, 'expense');
    await insertTxn(db, date1, 300_0000, 'income');
    const result = await monthlyTrend(db, UID, 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.month).toBe(thisMonth);
    expect(result[0]?.spend_micro).toBe(300_0000);
    expect(result[0]?.income_micro).toBe(300_0000);
  });

  it('returns empty array when no transactions', async () => {
    const db = await freshDb();
    const result = await monthlyTrend(db, UID, 3);
    expect(result).toHaveLength(0);
  });

  it('orders results chronologically', async () => {
    const db = await freshDb();
    const now = new Date();
    // Insert transactions for this month and last month
    const thisY = now.getFullYear();
    const thisM = now.getMonth() + 1;
    const lastM = thisM === 1 ? 12 : thisM - 1;
    const lastY = thisM === 1 ? thisY - 1 : thisY;
    const thisDate = `${thisY}-${String(thisM).padStart(2, '0')}-10T00:00:00Z`;
    const lastDate = `${lastY}-${String(lastM).padStart(2, '0')}-10T00:00:00Z`;
    await insertTxn(db, thisDate, 50_0000, 'expense');
    await insertTxn(db, lastDate, 80_0000, 'expense');
    const result = await monthlyTrend(db, UID, 2);
    expect(result.length).toBeGreaterThanOrEqual(2);
    // Should be ascending
    expect(result[0]!.month <= result[result.length - 1]!.month).toBe(true);
  });
});
