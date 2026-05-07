/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { getProfile, setBaseCurrency } from '@/db/repos/profiles';

jest.mock('expo-sqlite', () => require('./_mock').expoSqliteMock);

const UID = 'user-abc';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`profile-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db;
}

async function insertProfile(db: any, id: string, display_name: string | null, base_currency: string) {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO profiles (id, display_name, base_currency, created_at, updated_at, sync_version)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [id, display_name, base_currency, now, now],
  );
}

describe('profiles repo', () => {
  it('returns null when no profile', async () => {
    const db = await freshDb();
    expect(await getProfile(db as any, UID)).toBeNull();
  });

  it('inserts and retrieves profile', async () => {
    const db = await freshDb();
    await insertProfile(db, UID, 'Jason', 'LAK');
    const fetched = await getProfile(db as any, UID);
    expect(fetched?.id).toBe(UID);
    expect(fetched?.base_currency).toBe('LAK');
  });

  it('setBaseCurrency updates and enqueues outbox', async () => {
    const db = await freshDb();
    await insertProfile(db, UID, 'Jason', 'LAK');
    await setBaseCurrency(db as any, UID, 'USD');
    const p = await getProfile(db as any, UID);
    expect(p?.base_currency).toBe('USD');
    expect(p?.sync_version).toBe(2);
    const ob = await (db as any).getAllAsync("SELECT * FROM outbox WHERE op = 'update'");
    expect(ob).toHaveLength(1);
    expect(ob[0]!.table_name).toBe('profiles');
  });
});
