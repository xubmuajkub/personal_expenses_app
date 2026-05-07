/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('expo-sqlite', () => require('../db/_mock').expoSqliteMock);

import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { pullTable } from '@/sync/pull';

function fakeSupabase(rows: any[]) {
  return {
    from: () => ({
      select: () => ({
        gt: () => ({
          order: () => ({
            limit: async () => ({ data: rows, error: null }),
          }),
        }),
      }),
    }),
  } as any;
}

describe('pull', () => {
  it('inserts new rows and advances cursor', async () => {
    const x = await SQLite.openDatabaseAsync(`p-${Math.random()}.db`);
    await runMigrations(x as any, [m001_init]);
    const sb = fakeSupabase([
      {
        id: 'a1', user_id: 'u1', name: 'A', type: 'cash', currency: 'LAK',
        opening_balance_micro: 0, archived: false,
        created_at: '2026-05-07T00:00:00Z', updated_at: '2026-05-07T01:00:00Z',
        deleted_at: null, sync_version: 1,
      },
    ]);
    const n = await pullTable(x as any, sb, 'accounts');
    expect(n).toBe(1);
    const cur = await (x as any).getAllAsync(`SELECT last_sync_at FROM sync_state WHERE table_name = 'accounts'`);
    expect(cur[0].last_sync_at).toBe('2026-05-07T01:00:00Z');
  });

  it('does not overwrite a higher local sync_version', async () => {
    const x = await SQLite.openDatabaseAsync(`p2-${Math.random()}.db`);
    await runMigrations(x as any, [m001_init]);
    await (x as any).runAsync(
      `INSERT INTO accounts (id,user_id,name,type,currency,opening_balance_micro,archived,
        created_at,updated_at,sync_version) VALUES ('a1','u1','LOCAL','cash','LAK',0,0,?,?,5)`,
      ['2026-05-07T00:00:00Z', '2026-05-07T00:00:00Z']);
    const sb = fakeSupabase([
      { id:'a1', user_id:'u1', name:'REMOTE', type:'cash', currency:'LAK',
        opening_balance_micro:0, archived:false,
        created_at:'2026-05-07T00:00:00Z', updated_at:'2026-05-07T01:00:00Z',
        deleted_at:null, sync_version:3 },
    ]);
    await pullTable(x as any, sb, 'accounts');
    const r = await (x as any).getAllAsync(`SELECT name FROM accounts WHERE id='a1'`);
    expect(r[0].name).toBe('LOCAL');
  });
});
