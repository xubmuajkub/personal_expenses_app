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

  it('drops a row at the dead-letter threshold and continues draining', async () => {
    const x = await (async () => {
      const d = await SQLite.openDatabaseAsync(`ob-${Math.random()}.db`);
      await runMigrations(d as any, [m001_init]);
      // row 1 (lower id): will fail with RLS (4xx) — pre-set attempts = 4 so
      // it dead-letters on the first cycle and does not get re-processed.
      await (d as any).runAsync(
        `INSERT INTO outbox (op, table_name, row_id, payload, enqueued_at, attempts)
         VALUES ('insert','accounts','a1','{"id":"a1"}', ?, 4)`, [new Date().toISOString()]);
      // row 2 (higher id): will succeed
      await (d as any).runAsync(
        `INSERT INTO outbox (op, table_name, row_id, payload, enqueued_at)
         VALUES ('insert','accounts','a2','{"id":"a2"}', ?)`, [new Date().toISOString()]);
      return d as any;
    })();

    // Supabase that always fails for row a1 (rls) and succeeds for row a2
    const attempted = new Set<string>();
    const mixedSb = {
      from: () => ({
        upsert: async (payload: { id: string }) => {
          attempted.add(payload.id);
          if (payload.id === 'a1') return { error: { code: '42501', message: 'rls' } };
          return { error: null };
        },
      }),
    } as any;

    const r = await flushOutbox(x, mixedSb);
    // both rows must have been attempted in the same flush cycle
    expect(attempted.has('a1')).toBe(true);
    expect(attempted.has('a2')).toBe(true);
    // a1 dead-lettered (dropped), a2 succeeded
    expect(r.dropped).toBe(1);
    expect(r.flushed).toBe(1);
    // outbox is now empty
    const left = await x.getAllAsync('SELECT * FROM outbox');
    expect(left).toHaveLength(0);
  });

  it('flushes other rows in the same cycle past a non-terminal 4xx', async () => {
    function staged([first, second]: Array<'ok' | 'rls403' | 'pt401' | 'net5xx'>) {
      let n = 0;
      return {
        from: () => ({
          upsert: async () => {
            const v = n === 0 ? first : second; n++;
            switch (v) {
              case 'ok': return { error: null };
              case 'pt401': return { error: { code: 'PT401', message: 'stale' } };
              case 'net5xx': return { error: { code: '50000', message: 'boom' } };
              case 'rls403': return { error: { code: '42501', message: 'rls' } };
            }
          },
        }),
      } as any;
    }

    const d = await SQLite.openDatabaseAsync(`ob-${Math.random()}.db`);
    await runMigrations(d as any, [m001_init]);
    // row 1 (lower id, attempts=0): fails with non-terminal RLS; loop skips it and moves on
    await (d as any).runAsync(
      `INSERT INTO outbox (op, table_name, row_id, payload, enqueued_at)
       VALUES ('insert','accounts','a1','{"id":"a1"}', ?)`, [new Date().toISOString()]);
    // row 2 (higher id): succeeds
    await (d as any).runAsync(
      `INSERT INTO outbox (op, table_name, row_id, payload, enqueued_at)
       VALUES ('insert','accounts','a2','{"id":"a2"}', ?)`, [new Date().toISOString()]);

    const r = await flushOutbox(d as any, staged(['rls403', 'ok']));

    // a2 flushed; a1 stays in outbox with attempts=1 and last_error containing 'rls'
    expect(r.flushed).toBe(1);
    expect(r.dropped).toBe(0);
    const left = await (d as any).getAllAsync(
      `SELECT attempts, last_error FROM outbox`) as Array<{ attempts: number; last_error: string }>;
    expect(left).toHaveLength(1);
    expect(left[0]!.attempts).toBe(1);
    expect(left[0]!.last_error).toMatch(/rls/i);
  });
});
