import type { SQLiteDatabase } from 'expo-sqlite';
import type { Currency } from './types';
import { listAccounts } from '@/db/repos/accounts';
import { getRate } from '@/db/repos/fx_rates';

export interface AccountBalance {
  account_id: string;
  account_name: string;
  currency: Currency;
  balance_micro: number;
  balance_base_micro: number;
}

export async function computeBalances(
  db: SQLiteDatabase,
  user_id: string,
  base_currency: Currency = 'LAK',
  opts: { includeArchived?: boolean } = {},
): Promise<AccountBalance[]> {
  const accounts = await listAccounts(db, user_id);
  const visible = opts.includeArchived ? accounts : accounts.filter((a) => !a.archived);

  const results: AccountBalance[] = [];

  for (const account of visible) {
    // Sum: opening_balance + income + transfer-in - expense - transfer-out
    // In the transaction model, income and transfer-to are positive amounts,
    // expense and transfer-from are negative amounts (by convention in balance calc).
    // All transactions stored with positive amount_micro; kind determines sign.
    const rows = await db.getAllAsync<{ net: number }>(
      `SELECT
         ? +
         COALESCE(SUM(CASE WHEN kind = 'income'   THEN  amount_micro ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN kind = 'expense'  THEN  amount_micro ELSE 0 END), 0) +
         COALESCE(SUM(CASE WHEN kind = 'transfer' AND account_id = ? THEN
           -- Determine if this is the "to" side or "from" side
           -- We look at whether this txn's id appears as to_txn_id in transfers
           CASE WHEN t.id IN (SELECT to_txn_id FROM transfers WHERE deleted_at IS NULL)
             THEN  amount_micro
             ELSE -amount_micro
           END
         ELSE 0 END), 0) AS net
       FROM transactions t
       WHERE t.user_id = ? AND t.account_id = ? AND t.deleted_at IS NULL`,
      [account.opening_balance_micro, account.id, user_id, account.id],
    );

    const balance_micro = rows[0]?.net ?? account.opening_balance_micro;
    const rate = await getRate(db, account.currency, base_currency);
    const balance_base_micro = Math.round(balance_micro * rate);

    results.push({
      account_id: account.id,
      account_name: account.name,
      currency: account.currency,
      balance_micro,
      balance_base_micro,
    });
  }

  return results;
}
