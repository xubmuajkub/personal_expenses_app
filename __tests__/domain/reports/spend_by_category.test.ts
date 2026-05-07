/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { spendByCategory } from '@/domain/reports/spend_by_category';

jest.mock('expo-sqlite', () => require('../../db/_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('../../db/_mock').expoCryptoMock);

const UID = 'u1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`sbc-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  await (db as any).execAsync(`
    INSERT INTO accounts (id, user_id, name, type, currency, created_at, updated_at)
    VALUES ('a1', '${UID}', 'Cash', 'cash', 'LAK', datetime('now'), datetime('now'));
    INSERT INTO categories (id, user_id, name, kind, created_at, updated_at)
    VALUES ('cat-food', '${UID}', 'Food', 'expense', datetime('now'), datetime('now')),
           ('cat-transport', '${UID}', 'Transport', 'expense', datetime('now'), datetime('now'));
  `);
  return db as any;
}

async function insertTxn(
  db: any,
  when: string,
  amount: number,
  category_id: string | null,
  kind: 'expense' | 'income' = 'expense',
) {
  const now = new Date().toISOString();
  const id = Math.random().toString(36).slice(2);
  await db.runAsync(
    `INSERT INTO transactions
       (id, user_id, account_id, category_id, kind, amount_micro, currency,
        fx_rate_to_base, amount_base_micro, occurred_at, source, created_at, updated_at, sync_version)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [id, UID, 'a1', category_id, kind, amount, 'LAK', 1, amount, when, 'manual', now, now],
  );
}

describe('spendByCategory', () => {
  it('groups expenses by category', async () => {
    const db = await freshDb();
    await insertTxn(db, '2026-05-03T00:00:00Z', 100_0000, 'cat-food');
    await insertTxn(db, '2026-05-10T00:00:00Z', 50_0000, 'cat-food');
    await insertTxn(db, '2026-05-15T00:00:00Z', 200_0000, 'cat-transport');
    const result = await spendByCategory(db, UID, '2026-05-01', '2026-05-31');
    expect(result).toHaveLength(2);
    const transport = result.find((r) => r.category_id === 'cat-transport');
    const food = result.find((r) => r.category_id === 'cat-food');
    expect(transport?.total_micro).toBe(200_0000);
    expect(food?.total_micro).toBe(150_0000);
    expect(food?.category_name).toBe('Food');
  });

  it('excludes income rows', async () => {
    const db = await freshDb();
    await insertTxn(db, '2026-05-03T00:00:00Z', 500_0000, 'cat-food', 'income');
    const result = await spendByCategory(db, UID, '2026-05-01', '2026-05-31');
    expect(result).toHaveLength(0);
  });

  it('excludes transactions outside date range', async () => {
    const db = await freshDb();
    await insertTxn(db, '2026-04-30T00:00:00Z', 999_0000, 'cat-food');
    await insertTxn(db, '2026-05-05T00:00:00Z', 100_0000, 'cat-food');
    const result = await spendByCategory(db, UID, '2026-05-01', '2026-05-31');
    expect(result).toHaveLength(1);
    expect(result[0]?.total_micro).toBe(100_0000);
  });

  it('returns empty array when no expenses', async () => {
    const db = await freshDb();
    const result = await spendByCategory(db, UID, '2026-05-01', '2026-05-31');
    expect(result).toHaveLength(0);
  });
});
