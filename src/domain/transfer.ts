import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { enqueueOutbox, nowIso } from '@/db/repos/base';
import { applyRate } from './money';
import type { Account, Currency } from './types';
import { getRate } from '@/db/repos/fx_rates';

export interface CreateTransferInput {
  user_id: string;
  from_account: Account;
  to_account: Account;
  from_amount_micro: number;
  fx_rate?: number;
  occurred_at: string;
  base_currency: Currency;
  note?: string;
}

export async function createTransfer(
  db: SQLiteDatabase,
  input: CreateTransferInput,
): Promise<{ transferId: string; fromTxnId: string; toTxnId: string; toAmount: number }> {
  const transferId = Crypto.randomUUID();
  const fromTxnId = Crypto.randomUUID();
  const toTxnId = Crypto.randomUUID();
  const now = nowIso();

  let xrate = input.fx_rate;
  if (input.from_account.currency !== input.to_account.currency) {
    if (!xrate) xrate = await getRate(db, input.from_account.currency, input.to_account.currency);
  } else {
    xrate = 1;
  }
  const toAmount = applyRate(input.from_amount_micro, xrate!);
  const fromBaseRate = await getRate(db, input.from_account.currency, input.base_currency);
  const toBaseRate = await getRate(db, input.to_account.currency, input.base_currency);

  await db.withTransactionAsync(async () => {
    const fromRow = {
      id: fromTxnId,
      user_id: input.user_id,
      account_id: input.from_account.id,
      category_id: null,
      kind: 'transfer' as const,
      amount_micro: input.from_amount_micro,
      currency: input.from_account.currency,
      fx_rate_to_base: fromBaseRate,
      amount_base_micro: applyRate(input.from_amount_micro, fromBaseRate),
      occurred_at: input.occurred_at,
      merchant: null,
      note: input.note ?? null,
      receipt_url: null,
      source: 'manual' as const,
      source_ref: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_version: 1,
    };

    const toRow = {
      ...fromRow,
      id: toTxnId,
      account_id: input.to_account.id,
      amount_micro: toAmount,
      currency: input.to_account.currency,
      fx_rate_to_base: toBaseRate,
      amount_base_micro: applyRate(toAmount, toBaseRate),
    };

    for (const r of [fromRow, toRow]) {
      await db.runAsync(
        `INSERT INTO transactions
           (id, user_id, account_id, category_id, kind,
            amount_micro, currency, fx_rate_to_base, amount_base_micro, occurred_at,
            merchant, note, receipt_url, source, source_ref,
            created_at, updated_at, deleted_at, sync_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          r.id, r.user_id, r.account_id, r.category_id, r.kind,
          r.amount_micro, r.currency, r.fx_rate_to_base, r.amount_base_micro, r.occurred_at,
          r.merchant, r.note, r.receipt_url, r.source, r.source_ref,
          now, now, r.deleted_at,
        ],
      );
      await enqueueOutbox(db, 'insert', 'transactions', r.id, r);
    }

    const transferRow = {
      id: transferId,
      user_id: input.user_id,
      from_txn_id: fromTxnId,
      to_txn_id: toTxnId,
      fx_rate: xrate ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_version: 1,
    };

    await db.runAsync(
      `INSERT INTO transfers (id, user_id, from_txn_id, to_txn_id, fx_rate, created_at, updated_at, deleted_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        transferRow.id, transferRow.user_id, transferRow.from_txn_id, transferRow.to_txn_id,
        transferRow.fx_rate, now, now, transferRow.deleted_at,
      ],
    );
    await enqueueOutbox(db, 'insert', 'transfers', transferId, transferRow);
  });

  return { transferId, fromTxnId, toTxnId, toAmount };
}
