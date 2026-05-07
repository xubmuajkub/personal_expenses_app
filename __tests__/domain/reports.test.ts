/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { monthSpendBase } from '@/domain/reports';

jest.mock('expo-sqlite', () => require('../db/_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('../db/_mock').expoCryptoMock);

const UID = 'u1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`r-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  return db as any;
}

async function insertTxn(
  db: any,
  when: string,
  amount_base_micro: number,
  kind: 'expense' | 'income' = 'expense',
) {
  const now = new Date().toISOString();
  const id = Math.random().toString(36).slice(2);
  await db.runAsync(
    `INSERT INTO transactions
       (id, user_id, account_id, kind, amount_micro, currency,
        fx_rate_to_base, amount_base_micro, occurred_at, source, created_at, updated_at, sync_version)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [
      id, UID, 'a1', kind, amount_base_micro, 'LAK',
      1, amount_base_micro, when, 'manual', now, now,
    ],
  );
}

describe('monthSpendBase', () => {
  it('sums only expenses in the month', async () => {
    const db = await freshDb();
    await insertTxn(db, '2026-05-03T00:00:00Z', 100_0000);
    await insertTxn(db, '2026-05-25T00:00:00Z', 50_0000);
    // Outside the month — should not be included
    await insertTxn(db, '2026-04-30T00:00:00Z', 999_0000);
    const total = await monthSpendBase(db, UID, new Date('2026-05-01T00:00:00Z'));
    expect(total).toBe(150_0000);
  });

  it('returns 0 when no expenses', async () => {
    const db = await freshDb();
    const total = await monthSpendBase(db, UID, new Date('2026-05-01T00:00:00Z'));
    expect(total).toBe(0);
  });

  it('excludes income rows', async () => {
    const db = await freshDb();
    await insertTxn(db, '2026-05-10T00:00:00Z', 200_0000, 'income');
    const total = await monthSpendBase(db, UID, new Date('2026-05-01T00:00:00Z'));
    expect(total).toBe(0);
  });
});
