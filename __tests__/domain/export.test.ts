/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import {
  exportTransactionsCsv,
  exportAllJson,
  restoreJson,
} from '@/domain/export';

jest.mock('expo-sqlite', () => require('../db/_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('../db/_mock').expoCryptoMock);

const UID = 'u1';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`exp-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  await (db as any).execAsync(`
    INSERT INTO accounts (id, user_id, name, type, currency, created_at, updated_at)
    VALUES ('a1', '${UID}', 'Cash', 'cash', 'LAK', datetime('now'), datetime('now'));
  `);
  return db as any;
}

async function insertTxn(
  db: any,
  opts: {
    id?: string;
    when?: string;
    amount?: number;
    note?: string | null;
    merchant?: string | null;
    kind?: 'expense' | 'income';
  } = {},
) {
  const now = new Date().toISOString();
  const id = opts.id ?? Math.random().toString(36).slice(2);
  const when = opts.when ?? '2026-05-05T00:00:00Z';
  const amount = opts.amount ?? 100_0000;
  await db.runAsync(
    `INSERT INTO transactions
       (id, user_id, account_id, kind, amount_micro, currency,
        fx_rate_to_base, amount_base_micro, occurred_at, merchant, note,
        source, created_at, updated_at, sync_version)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [
      id, UID, 'a1', opts.kind ?? 'expense', amount, 'LAK',
      1, amount, when, opts.merchant ?? null, opts.note ?? null,
      'manual', now, now,
    ],
  );
  return id;
}

// ---------------------------------------------------------------------------
// CSV escaping
// ---------------------------------------------------------------------------

describe('exportTransactionsCsv', () => {
  it('produces a header row + data rows', async () => {
    const db = await freshDb();
    await insertTxn(db, { amount: 50_0000 });
    const csv = await exportTransactionsCsv(db, UID);
    const lines = csv.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toContain('id');
    expect(lines[0]).toContain('amount_micro');
  });

  it('escapes double-quotes in note field', async () => {
    const db = await freshDb();
    await insertTxn(db, { note: 'He said "hello"' });
    const csv = await exportTransactionsCsv(db, UID);
    // The note should be escaped as: "He said ""hello"""
    expect(csv).toContain('"He said ""hello"""');
  });

  it('escapes commas in merchant field', async () => {
    const db = await freshDb();
    await insertTxn(db, { merchant: 'Shop, Market' });
    const csv = await exportTransactionsCsv(db, UID);
    expect(csv).toContain('"Shop, Market"');
  });

  it('returns only header when no transactions', async () => {
    const db = await freshDb();
    const csv = await exportTransactionsCsv(db, UID);
    const lines = csv.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
  });

  it('respects kind filter', async () => {
    const db = await freshDb();
    await insertTxn(db, { kind: 'expense' });
    await insertTxn(db, { kind: 'income' });
    const csv = await exportTransactionsCsv(db, UID, { kind: 'income' });
    const lines = csv.split('\n').filter(Boolean);
    // 1 header + 1 income row
    expect(lines).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// JSON backup + restore
// ---------------------------------------------------------------------------

describe('exportAllJson + restoreJson', () => {
  it('round-trips transactions via JSON backup', async () => {
    const db = await freshDb();
    const id = await insertTxn(db, { amount: 200_0000, note: 'Backup me' });

    const json = await exportAllJson(db, UID);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.transactions).toHaveLength(1);
    expect(parsed.transactions[0].id).toBe(id);

    // Now restore into a fresh DB
    const db2 = await freshDb();
    const result = await restoreJson(db2, UID, json);
    expect(result.restored).toBe(1);

    const rows = (await db2.getAllAsync(
      `SELECT id, note FROM transactions WHERE user_id = ?`,
      [UID],
    )) as { id: string; note: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(id);
    expect(rows[0]?.note).toBe('Backup me');
  });

  it('re-enqueues to outbox on restore', async () => {
    const db = await freshDb();
    await insertTxn(db, { amount: 100_0000 });
    const json = await exportAllJson(db, UID);

    const db2 = await freshDb();
    await restoreJson(db2, UID, json);

    const outbox = (await db2.getAllAsync(`SELECT * FROM outbox`)) as { op: string }[];
    expect(outbox.length).toBeGreaterThanOrEqual(1);
    expect(outbox[0]?.op).toBe('insert');
  });

  it('restores multiple transactions', async () => {
    const db = await freshDb();
    await insertTxn(db, { amount: 10_0000, when: '2026-04-01T00:00:00Z' });
    await insertTxn(db, { amount: 20_0000, when: '2026-05-01T00:00:00Z' });
    const json = await exportAllJson(db, UID);

    const db2 = await freshDb();
    const result = await restoreJson(db2, UID, json);
    expect(result.restored).toBe(2);
    const rows = await db2.getAllAsync(`SELECT * FROM transactions WHERE user_id = ?`, [UID]);
    expect(rows).toHaveLength(2);
  });
});
