import type { SQLiteDatabase } from 'expo-sqlite';

export interface MonthlyPoint {
  /** YYYY-MM */
  month: string;
  spend_micro: number;
  income_micro: number;
}

export async function monthlyTrend(
  db: SQLiteDatabase,
  user_id: string,
  monthsBack: number,
): Promise<MonthlyPoint[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const rows = await db.getAllAsync<{ month: string; kind: string; total: number }>(
    `SELECT strftime('%Y-%m', occurred_at) AS month,
            kind,
            COALESCE(SUM(amount_base_micro), 0) AS total
     FROM transactions
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND occurred_at >= ?
       AND occurred_at < ?
       AND kind IN ('expense', 'income')
     GROUP BY month, kind
     ORDER BY month ASC`,
    [user_id, start, end],
  );

  // Collect into a map by month
  const map = new Map<string, MonthlyPoint>();
  for (const row of rows) {
    const existing = map.get(row.month) ?? { month: row.month, spend_micro: 0, income_micro: 0 };
    if (row.kind === 'expense') existing.spend_micro = row.total;
    else if (row.kind === 'income') existing.income_micro = row.total;
    map.set(row.month, existing);
  }

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}
