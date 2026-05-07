/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { createTransfer, listTransfers, deleteTransfer } from '@/db/repos/transfers';
import { createTransaction } from '@/db/repos/transactions';
import { toMicro } from '@/domain/money';

jest.mock('expo-sqlite', () => require('./_mock').expoSqliteMock);
jest.mock('expo-crypto', () => require('./_mock').expoCryptoMock);

const UID = 'u1';
const ACCT_FROM = 'acct-from';
const ACCT_TO = 'acct-to';

async function freshDb() {
  const db = await SQLite.openDatabaseAsync(`xfer-${Math.random()}.db`);
  await runMigrations(db as any, [m001_init]);
  await (db as any).execAsync(`
    INSERT INTO accounts (id, user_id, name, type, currency, created_at, updated_at)
    VALUES ('${ACCT_FROM}', '${UID}', 'From', 'cash', 'LAK', datetime('now'), datetime('now')),
           ('${ACCT_TO}',   '${UID}', 'To',   'bank', 'LAK', datetime('now'), datetime('now'));
  `);
  return db;
}

async function makePairedTxns(db: any) {
  const from = await createTransaction(db, {
    user_id: UID, account_id: ACCT_FROM, kind: 'transfer',
    amount_micro: toMicro(500), currency: 'LAK', fx_rate_to_base: 1,
    occurred_at: '2026-01-15T10:00:00.000Z', source: 'manual',
  });
  const to = await createTransaction(db, {
    user_id: UID, account_id: ACCT_TO, kind: 'transfer',
    amount_micro: toMicro(500), currency: 'LAK', fx_rate_to_base: 1,
    occurred_at: '2026-01-15T10:00:00.000Z', source: 'manual',
  });
  return { from, to };
}

describe('transfers repo', () => {
  it('creates a transfer and lists it', async () => {
    const db = await freshDb();
    const { from, to } = await makePairedTxns(db);
    const t = await createTransfer(db as any, {
      user_id: UID, from_txn_id: from.id, to_txn_id: to.id,
    });
    const list = await listTransfers(db as any, UID);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(t.id);
  });

  it('enqueues outbox on create', async () => {
    const db = await freshDb();
    const { from, to } = await makePairedTxns(db);
    await createTransfer(db as any, {
      user_id: UID, from_txn_id: from.id, to_txn_id: to.id,
    });
    const ob = await (db as any).getAllAsync("SELECT * FROM outbox WHERE table_name = 'transfers'");
    expect(ob).toHaveLength(1);
    expect(ob[0]!.op).toBe('insert');
  });

  it('soft-deletes transfer and paired transactions', async () => {
    const db = await freshDb();
    const { from, to } = await makePairedTxns(db);
    const t = await createTransfer(db as any, {
      user_id: UID, from_txn_id: from.id, to_txn_id: to.id,
    });
    await deleteTransfer(db as any, t.id);
    const list = await listTransfers(db as any, UID);
    expect(list).toHaveLength(0);
    // Paired txns should also be soft-deleted
    const txns = await (db as any).getAllAsync(
      `SELECT * FROM transactions WHERE id IN ('${from.id}','${to.id}') AND deleted_at IS NULL`
    );
    expect(txns).toHaveLength(0);
  });
});
