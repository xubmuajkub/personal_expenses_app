import type { SQLiteDatabase } from 'expo-sqlite';

export interface SavingsRateResult {
  income_micro: number;
  spend_micro: number;
  /** Value between 0..1 (or negative if spend > income). */
  rate: number;
}

export async function savingsRate(
  db: SQLiteDatabase,
  user_id: string,
  from: string,
  to: string,
): Promise<SavingsRateResult> {
  const rows = await db.getAllAsync<{ kind: string; total: number }>(
    `SELECT kind, COALESCE(SUM(amount_base_micro), 0) AS total
     FROM transactions
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND occurred_at >= ?
       AND occurred_at <= ?
       AND kind IN ('expense', 'income')
     GROUP BY kind`,
    [user_id, from, to],
  );

  let income_micro = 0;
  let spend_micro = 0;
  for (const row of rows) {
    if (row.kind === 'income') income_micro = row.total;
    else if (row.kind === 'expense') spend_micro = row.total;
  }

  const rate = income_micro === 0 ? 0 : (income_micro - spend_micro) / income_micro;
  return { income_micro, spend_micro, rate };
}
