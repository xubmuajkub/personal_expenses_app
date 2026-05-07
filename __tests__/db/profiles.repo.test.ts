import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { getProfile, setBaseCurrency, upsertProfile } from '@/db/repos/profiles';

jest.mock('expo-sqlite', () => require('./_mock').expoSqliteMock);

const UID = 'user-abc';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`profile-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db;
}

describe('profiles repo', () => {
  it('returns null when no profile', async () => {
    const db = await freshDb();
    expect(await getProfile(db as any, UID)).toBeNull();
  });

  it('upserts and retrieves profile', async () => {
    const db = await freshDb();
    const p = await upsertProfile(db as any, UID, 'Jason', 'LAK');
    expect(p.id).toBe(UID);
    expect(p.base_currency).toBe('LAK');
    const fetched = await getProfile(db as any, UID);
    expect(fetched?.id).toBe(UID);
  });

  it('setBaseCurrency updates and enqueues outbox', async () => {
    const db = await freshDb();
    await upsertProfile(db as any, UID, 'Jason', 'LAK');
    await setBaseCurrency(db as any, UID, 'USD');
    const p = await getProfile(db as any, UID);
    expect(p?.base_currency).toBe('USD');
    expect(p?.sync_version).toBe(2);
    const ob = await (db as any).getAllAsync("SELECT * FROM outbox WHERE op = 'update'");
    expect(ob).toHaveLength(1);
    expect(ob[0]!.table_name).toBe('profiles');
  });
});
