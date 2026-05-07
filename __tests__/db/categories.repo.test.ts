/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} from '@/db/repos/categories';

jest.mock('expo-sqlite', () => require('./_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('./_mock').expoCryptoMock);

const UID = 'u1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`cat-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db;
}

describe('categories repo', () => {
  it('creates and lists', async () => {
    const db = await freshDb();
    const c = await createCategory(db as any, {
      user_id: UID, name: 'Food', kind: 'expense',
    });
    const list = await listCategories(db as any, UID);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(c.id);
    expect(list[0]!.kind).toBe('expense');
  });

  it('filters by kind', async () => {
    const db = await freshDb();
    await createCategory(db as any, { user_id: UID, name: 'Food', kind: 'expense' });
    await createCategory(db as any, { user_id: UID, name: 'Salary', kind: 'income' });
    const expenses = await listCategories(db as any, UID, 'expense');
    expect(expenses).toHaveLength(1);
    expect(expenses[0]!.name).toBe('Food');
  });

  it('getCategory returns null when missing', async () => {
    const db = await freshDb();
    const result = await getCategory(db as any, 'nonexistent');
    expect(result).toBeNull();
  });

  it('enqueues outbox on create', async () => {
    const db = await freshDb();
    await createCategory(db as any, { user_id: UID, name: 'Food', kind: 'expense' });
    const ob = await (db as any).getAllAsync('SELECT * FROM outbox');
    expect(ob).toHaveLength(1);
    expect(ob[0]!.op).toBe('insert');
    expect(ob[0]!.table_name).toBe('categories');
  });

  it('updates and bumps sync_version', async () => {
    const db = await freshDb();
    const c = await createCategory(db as any, { user_id: UID, name: 'Food', kind: 'expense' });
    await updateCategory(db as any, c.id, { name: 'Groceries', color: '#FF0000' });
    const list = await listCategories(db as any, UID);
    expect(list[0]!.name).toBe('Groceries');
    expect(list[0]!.color).toBe('#FF0000');
    expect(list[0]!.sync_version).toBe(2);
  });

  it('soft-deletes', async () => {
    const db = await freshDb();
    const c = await createCategory(db as any, { user_id: UID, name: 'Food', kind: 'expense' });
    await deleteCategory(db as any, c.id);
    const list = await listCategories(db as any, UID);
    expect(list).toHaveLength(0);
  });
});
