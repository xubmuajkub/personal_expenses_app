import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { upsertBudget, listBudgets, deleteBudget } from '@/db/repos/budgets';
import { toMicro } from '@/domain/money';

jest.mock('expo-sqlite', () => require('./_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('./_mock').expoCryptoMock);

const UID = 'u1';
const CAT = 'cat-1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`budget-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db;
}

const BASE = {
  user_id: UID,
  category_id: CAT,
  month: '2026-01-01',
  limit_amount_micro: toMicro(500),
  limit_currency: 'LAK' as const,
};

describe('budgets repo', () => {
  it('inserts a new budget', async () => {
    const db = await freshDb();
    const b = await upsertBudget(db as any, BASE);
    const list = await listBudgets(db as any, UID);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(b.id);
    expect(list[0]!.limit_amount_micro).toBe(toMicro(500));
  });

  it('upserts (updates) existing row for same user/category/month', async () => {
    const db = await freshDb();
    const b = await upsertBudget(db as any, BASE);
    await upsertBudget(db as any, { ...BASE, limit_amount_micro: toMicro(1000) });
    const list = await listBudgets(db as any, UID);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(b.id);
    expect(list[0]!.limit_amount_micro).toBe(toMicro(1000));
    expect(list[0]!.sync_version).toBe(2);
  });

  it('filters by month', async () => {
    const db = await freshDb();
    await upsertBudget(db as any, { ...BASE, month: '2026-01-01' });
    await upsertBudget(db as any, { ...BASE, month: '2026-02-01', category_id: 'cat-2' });
    const jan = await listBudgets(db as any, UID, '2026-01-01');
    expect(jan).toHaveLength(1);
    expect(jan[0]!.month).toBe('2026-01-01');
  });

  it('enqueues outbox on insert', async () => {
    const db = await freshDb();
    await upsertBudget(db as any, BASE);
    const ob = await (db as any).getAllAsync("SELECT * FROM outbox WHERE op = 'insert'");
    expect(ob).toHaveLength(1);
    expect(ob[0]!.table_name).toBe('budgets');
  });

  it('soft-deletes', async () => {
    const db = await freshDb();
    const b = await upsertBudget(db as any, BASE);
    await deleteBudget(db as any, b.id);
    expect(await listBudgets(db as any, UID)).toHaveLength(0);
  });
});
