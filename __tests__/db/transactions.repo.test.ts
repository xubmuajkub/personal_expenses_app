/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import {
  createTransaction,
  listTransactions,
  getTransaction,
  deleteTransaction,
} from '@/db/repos/transactions';
import { toMicro } from '@/domain/money';

jest.mock('expo-sqlite', () => require('./_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('./_mock').expoCryptoMock);

const UID = 'u1';
const ACCT = 'acct-1';
const CAT = 'cat-1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`txn-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  // Insert prerequisite account and category rows to satisfy any FK checks
  await (db as any).execAsync(`
    INSERT INTO accounts (id, user_id, name, type, currency, created_at, updated_at)
    VALUES ('${ACCT}', '${UID}', 'Cash', 'cash', 'LAK', datetime('now'), datetime('now'));
    INSERT INTO categories (id, user_id, name, kind, created_at, updated_at)
    VALUES ('${CAT}', '${UID}', 'Food', 'expense', datetime('now'), datetime('now'));
  `);
  return db;
}

const BASE_INPUT = {
  user_id: UID,
  account_id: ACCT,
  category_id: CAT,
  kind: 'expense' as const,
  amount_micro: toMicro(100),
  currency: 'LAK' as const,
  fx_rate_to_base: 1,
  occurred_at: '2026-01-15T10:00:00.000Z',
  source: 'manual' as const,
};

describe('transactions repo', () => {
  it('creates and computes amount_base_micro', async () => {
    const db = await freshDb();
    const t = await createTransaction(db as any, { ...BASE_INPUT, fx_rate_to_base: 2 });
    expect(t.amount_base_micro).toBe(toMicro(100) * 2);
  });

  it('lists with filters', async () => {
    const db = await freshDb();
    await createTransaction(db as any, {
      ...BASE_INPUT, occurred_at: '2026-01-10T00:00:00.000Z',
    });
    await createTransaction(db as any, {
      ...BASE_INPUT, occurred_at: '2026-02-10T00:00:00.000Z',
    });
    const jan = await listTransactions(db as any, {
      user_id: UID, from: '2026-01-01', to: '2026-01-31',
    });
    expect(jan).toHaveLength(1);
  });

  it('getTransaction returns null when missing', async () => {
    const db = await freshDb();
    expect(await getTransaction(db as any, 'nope')).toBeNull();
  });

  it('enqueues outbox on create', async () => {
    const db = await freshDb();
    await createTransaction(db as any, BASE_INPUT);
    const ob = await (db as any).getAllAsync('SELECT * FROM outbox');
    expect(ob).toHaveLength(1);
    expect(ob[0]!.op).toBe('insert');
    expect(ob[0]!.table_name).toBe('transactions');
  });

  it('soft-deletes and enqueues delete outbox', async () => {
    const db = await freshDb();
    const t = await createTransaction(db as any, BASE_INPUT);
    await deleteTransaction(db as any, t.id);
    expect(await getTransaction(db as any, t.id)).toBeNull();
    const ob = await (db as any).getAllAsync("SELECT * FROM outbox WHERE op = 'delete'");
    expect(ob).toHaveLength(1);
  });
});
