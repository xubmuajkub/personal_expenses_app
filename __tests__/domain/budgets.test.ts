/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { upsertBudget } from '@/db/repos/budgets';
import { monthBudgetStatuses } from '@/domain/budgets';
import { toMicro } from '@/domain/money';

jest.mock('expo-sqlite', () => require('../db/_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('../db/_mock').expoCryptoMock);

const UID = 'u1';
const MONTH = new Date(2026, 4, 1);  // Local date: May 2026

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`budgets-domain-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  // Seed an account and category
  await (db as any).execAsync(`
    INSERT INTO accounts (id, user_id, name, type, currency, created_at, updated_at, sync_version)
    VALUES ('a1', '${UID}', 'Cash', 'cash', 'LAK', datetime('now'), datetime('now'), 1);
    INSERT INTO categories (id, user_id, name, kind, created_at, updated_at, sync_version)
    VALUES ('cat-food', '${UID}', 'Food', 'expense', datetime('now'), datetime('now'), 1),
           ('cat-transport', '${UID}', 'Transport', 'expense', datetime('now'), datetime('now'), 1);
  `);
  return db as any;
}

async function insertTxn(db: any, amount: number, category_id: string, when = '2026-05-10T00:00:00Z') {
  const id = Math.random().toString(36).slice(2);
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO transactions
       (id, user_id, account_id, category_id, kind, amount_micro, currency,
        fx_rate_to_base, amount_base_micro, occurred_at, source, created_at, updated_at, sync_version)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [id, UID, 'a1', category_id, 'expense', amount, 'LAK', 1, amount, when, 'manual', now, now],
  );
}

describe('monthBudgetStatuses', () => {
  it('threshold is 0 when pct < 0.8', async () => {
    const db = await freshDb();
    await upsertBudget(db, {
      user_id: UID, category_id: 'cat-food',
      month: '2026-05-01', limit_amount_micro: toMicro(1000), limit_currency: 'LAK',
    });
    await insertTxn(db, toMicro(500), 'cat-food');  // 50%
    const statuses = await monthBudgetStatuses(db, UID, MONTH);
    expect(statuses).toHaveLength(1);
    expect(statuses[0]!.threshold).toBe(0);
    expect(statuses[0]!.pct).toBeCloseTo(0.5);
  });

  it('threshold is 80 when pct = 0.8 exactly', async () => {
    const db = await freshDb();
    await upsertBudget(db, {
      user_id: UID, category_id: 'cat-food',
      month: '2026-05-01', limit_amount_micro: toMicro(1000), limit_currency: 'LAK',
    });
    await insertTxn(db, toMicro(800), 'cat-food');  // 80%
    const statuses = await monthBudgetStatuses(db, UID, MONTH);
    expect(statuses[0]!.threshold).toBe(80);
    expect(statuses[0]!.pct).toBeCloseTo(0.8);
  });

  it('threshold is 80 when pct is between 0.8 and 1', async () => {
    const db = await freshDb();
    await upsertBudget(db, {
      user_id: UID, category_id: 'cat-food',
      month: '2026-05-01', limit_amount_micro: toMicro(1000), limit_currency: 'LAK',
    });
    await insertTxn(db, toMicro(900), 'cat-food');  // 90%
    const statuses = await monthBudgetStatuses(db, UID, MONTH);
    expect(statuses[0]!.threshold).toBe(80);
  });

  it('threshold is 100 when pct = 1 exactly', async () => {
    const db = await freshDb();
    await upsertBudget(db, {
      user_id: UID, category_id: 'cat-food',
      month: '2026-05-01', limit_amount_micro: toMicro(1000), limit_currency: 'LAK',
    });
    await insertTxn(db, toMicro(1000), 'cat-food');  // 100%
    const statuses = await monthBudgetStatuses(db, UID, MONTH);
    expect(statuses[0]!.threshold).toBe(100);
    expect(statuses[0]!.pct).toBeCloseTo(1.0);
  });

  it('threshold is 100 when pct > 1', async () => {
    const db = await freshDb();
    await upsertBudget(db, {
      user_id: UID, category_id: 'cat-food',
      month: '2026-05-01', limit_amount_micro: toMicro(1000), limit_currency: 'LAK',
    });
    await insertTxn(db, toMicro(1500), 'cat-food');  // 150%
    const statuses = await monthBudgetStatuses(db, UID, MONTH);
    expect(statuses[0]!.threshold).toBe(100);
    expect(statuses[0]!.pct).toBeCloseTo(1.5);
  });

  it('returns correct category_name', async () => {
    const db = await freshDb();
    await upsertBudget(db, {
      user_id: UID, category_id: 'cat-food',
      month: '2026-05-01', limit_amount_micro: toMicro(500), limit_currency: 'LAK',
    });
    const statuses = await monthBudgetStatuses(db, UID, MONTH);
    expect(statuses[0]!.category_name).toBe('Food');
  });

  it('excludes deleted budgets', async () => {
    const db = await freshDb();
    const b = await upsertBudget(db, {
      user_id: UID, category_id: 'cat-food',
      month: '2026-05-01', limit_amount_micro: toMicro(500), limit_currency: 'LAK',
    });
    await db.runAsync(`UPDATE budgets SET deleted_at = datetime('now') WHERE id = ?`, [b.id]);
    const statuses = await monthBudgetStatuses(db, UID, MONTH);
    expect(statuses).toHaveLength(0);
  });
});
