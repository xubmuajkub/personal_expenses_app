/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { createAccount, listAccounts, updateAccount, deleteAccount } from '@/db/repos/accounts';

jest.mock('expo-sqlite', () => require('./_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('./_mock').expoCryptoMock);

const UID = 'u1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`acc-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db;
}

describe('accounts repo', () => {
  it('creates and lists', async () => {
    const db = await freshDb();
    const a = await createAccount(db as any, {
      user_id: UID, name: 'Cash', type: 'cash', currency: 'LAK',
    });
    const list = await listAccounts(db as any, UID);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(a.id);
  });

  it('enqueues outbox on create', async () => {
    const db = await freshDb();
    await createAccount(db as any, { user_id: UID, name: 'Cash', type: 'cash', currency: 'LAK' });
    const ob = await (db as any).getAllAsync('SELECT * FROM outbox');
    expect(ob).toHaveLength(1);
    expect(ob[0]!.op).toBe('insert');
    expect(ob[0]!.table_name).toBe('accounts');
  });

  it('updates and bumps sync_version', async () => {
    const db = await freshDb();
    const a = await createAccount(db as any, { user_id: UID, name: 'X', type: 'cash', currency: 'LAK' });
    await updateAccount(db as any, a.id, { name: 'Y' });
    const list = await listAccounts(db as any, UID);
    expect(list[0]!.name).toBe('Y');
    expect(list[0]!.sync_version).toBe(2);
  });

  it('soft-deletes', async () => {
    const db = await freshDb();
    const a = await createAccount(db as any, { user_id: UID, name: 'X', type: 'cash', currency: 'LAK' });
    await deleteAccount(db as any, a.id);
    const list = await listAccounts(db as any, UID);
    expect(list).toHaveLength(0);
  });
});
