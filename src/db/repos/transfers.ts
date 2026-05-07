import type { SQLiteDatabase } from 'expo-sqlite';
import type { Transfer } from '@/domain/types';
import { enqueueOutbox, nowIso } from './base';
import * as Crypto from 'expo-crypto';

export interface CreateTransferInput {
  user_id: string;
  from_txn_id: string;
  to_txn_id: string;
  fx_rate?: number;
}

export async function createTransfer(
  db: SQLiteDatabase,
  input: CreateTransferInput,
): Promise<Transfer> {
  const id = Crypto.randomUUID();
  const now = nowIso();
  const row: Transfer = {
    id,
    user_id: input.user_id,
    from_txn_id: input.from_txn_id,
    to_txn_id: input.to_txn_id,
    fx_rate: input.fx_rate ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_version: 1,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO transfers (id, user_id, from_txn_id, to_txn_id, fx_rate,
         created_at, updated_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, row.user_id, row.from_txn_id, row.to_txn_id, row.fx_rate, now, now],
    );
    await enqueueOutbox(db, 'insert', 'transfers', id, row);
  });
  return row;
}

export async function listTransfers(db: SQLiteDatabase, user_id: string): Promise<Transfer[]> {
  return db.getAllAsync<Transfer>(
    `SELECT * FROM transfers WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
    [user_id],
  );
}

export async function deleteTransfer(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  // Fetch the paired txn ids first
  const rows = await db.getAllAsync<{ from_txn_id: string; to_txn_id: string }>(
    `SELECT from_txn_id, to_txn_id FROM transfers WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  const transfer = rows[0];
  if (!transfer) return;

  await db.withTransactionAsync(async () => {
    // Soft-delete the transfer record itself
    await db.runAsync(
      `UPDATE transfers SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1 WHERE id = ?`,
      [now, now, id],
    );
    await enqueueOutbox(db, 'delete', 'transfers', id, { id, deleted_at: now });
    // Soft-delete the paired transactions inline (same transaction — no nested BEGIN)
    for (const txn_id of [transfer.from_txn_id, transfer.to_txn_id]) {
      await db.runAsync(
        `UPDATE transactions SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1 WHERE id = ?`,
        [now, now, txn_id],
      );
      await enqueueOutbox(db, 'delete', 'transactions', txn_id, { id: txn_id, deleted_at: now });
    }
  });
}
