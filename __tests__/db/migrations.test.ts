/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';

jest.mock('expo-sqlite', () => {
  const sqlite = require('better-sqlite3');
  const dbs = new Map<string, any>();
  return {
    openDatabaseAsync: jest.fn(async (name: string) => {
      const db = sqlite(':memory:');
      dbs.set(name, db);
      return {
        execAsync: async (sql: string) => db.exec(sql),
        runAsync: async (sql: string, params: unknown[] = []) => db.prepare(sql).run(...params),
        getAllAsync: async <T>(sql: string, params: unknown[] = []) =>
          db.prepare(sql).all(...params) as T[],
        withTransactionAsync: async (fn: () => Promise<void>) => {
          db.exec('BEGIN');
          try { await fn(); db.exec('COMMIT'); }
          catch (e) { db.exec('ROLLBACK'); throw e; }
        },
        closeAsync: async () => { db.close(); dbs.delete(name); },
      };
    }),
  };
});

describe('migrations', () => {
  it('applies once and is idempotent', async () => {
    const db = await SQLite.openDatabaseAsync('test.db');
    await runMigrations(db as any, [m001_init]);
    await runMigrations(db as any, [m001_init]); // idempotent
    const rows = await (db as any).getAllAsync('SELECT version FROM _migrations');
    expect(rows.map((r: any) => r.version)).toEqual([1]);
  });
});
