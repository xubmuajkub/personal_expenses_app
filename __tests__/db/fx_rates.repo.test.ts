/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { getRate, setRate } from '@/db/repos/fx_rates';

jest.mock('expo-sqlite', () => require('./_mock').expoSqliteMock);

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`fx-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db;
}

describe('fx_rates repo', () => {
  it('returns 1 when from === to', async () => {
    const db = await freshDb();
    expect(await getRate(db as any, 'LAK', 'LAK')).toBe(1);
  });

  it('returns 1 when no rate stored', async () => {
    const db = await freshDb();
    expect(await getRate(db as any, 'USD', 'LAK')).toBe(1);
  });

  it('sets and retrieves exact date rate', async () => {
    const db = await freshDb();
    await setRate(db as any, '2026-01-15', 'USD', 'LAK', 21000);
    expect(await getRate(db as any, 'USD', 'LAK', '2026-01-15')).toBe(21000);
  });

  it('falls back to most recent when exact date missing', async () => {
    const db = await freshDb();
    await setRate(db as any, '2026-01-10', 'USD', 'LAK', 20500);
    await setRate(db as any, '2026-01-15', 'USD', 'LAK', 21000);
    // Request a date not stored — should return most recent (2026-01-15)
    expect(await getRate(db as any, 'USD', 'LAK', '2026-01-20')).toBe(21000);
  });

  it('upserts when same date/pair exists', async () => {
    const db = await freshDb();
    await setRate(db as any, '2026-01-15', 'USD', 'LAK', 21000);
    await setRate(db as any, '2026-01-15', 'USD', 'LAK', 21500);
    expect(await getRate(db as any, 'USD', 'LAK', '2026-01-15')).toBe(21500);
  });

  it('does not enqueue outbox (no outbox rows)', async () => {
    const db = await freshDb();
    await setRate(db as any, '2026-01-15', 'USD', 'LAK', 21000);
    const ob = await (db as any).getAllAsync('SELECT * FROM outbox');
    expect(ob).toHaveLength(0);
  });
});
