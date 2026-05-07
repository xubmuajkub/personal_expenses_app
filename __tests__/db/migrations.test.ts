/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
jest.mock('expo-sqlite', () => require('./_mock').expoSqliteMock);

describe('migrations', () => {
  it('applies once and is idempotent', async () => {
    const db = await SQLite.openDatabaseAsync('test.db');
    await runMigrations(db as any, [m001_init]);
    await runMigrations(db as any, [m001_init]); // idempotent
    const rows = await (db as any).getAllAsync('SELECT version FROM _migrations');
    expect(rows.map((r: any) => r.version)).toEqual([1]);
  });
});
