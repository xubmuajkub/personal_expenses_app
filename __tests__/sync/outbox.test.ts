/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('expo-sqlite', () => require('../db/_mock').expoSqliteMock);

import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { flushOutbox } from '@/sync/outbox';

function fakeSupabase(behavior: 'ok' | 'pt401' | 'net5xx' | 'rls403') {
  return {
    from: () => ({
      upsert: async () => {
        switch (behavior) {
          case 'ok': return { error: null };
          case 'pt401': return { error: { code: 'PT401', message: 'stale' } };
          case 'net5xx': return { error: { code: '50000', message: 'boom' } };
          case 'rls403': return { error: { code: '42501', message: 'rls' } };
        }
      },
    }),
  } as any;
}

describe('outbox flush', () => {
  async function db() {
    const x = await SQLite.openDatabaseAsync(`ob-${Math.random()}.db`);
    await runMigrations(x as any, [m001_init]);
    await (x as any).runAsync(
      `INSERT INTO outbox (op, table_name, row_id, payload, enqueued_at)
       VALUES ('insert','accounts','a1','{"id":"a1"}', ?)`, [new Date().toISOString()]);
    return x as any;
  }

  it('drains on success', async () => {
    const x = await db();
    const r = await flushOutbox(x, fakeSupabase('ok'));
    expect(r.flushed).toBe(1);
    const left = await x.getAllAsync('SELECT * FROM outbox');
    expect(left).toHaveLength(0);
  });

  it('defers on PT401', async () => {
    const x = await db();
    const r = await flushOutbox(x, fakeSupabase('pt401'));
    expect(r.deferred).toBe(1);
    const left = await x.getAllAsync('SELECT * FROM outbox');
    expect(left).toHaveLength(1);
  });

  it('drops after retries on persistent 4xx', async () => {
    const x = await db();
    for (let i = 0; i < 6; i++) await flushOutbox(x, fakeSupabase('rls403'));
    const left = await x.getAllAsync('SELECT * FROM outbox');
    expect(left).toHaveLength(0);
  });
});
