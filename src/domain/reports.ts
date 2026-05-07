import type { SQLiteDatabase } from 'expo-sqlite';

export async function monthSpendBase(
  db: SQLiteDatabase,
  user_id: string,
  monthStart: Date,
): Promise<number> {
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).toISOString();
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString();
  const rows = await db.getAllAsync<{ s: number }>(
    `SELECT COALESCE(SUM(amount_base_micro), 0) AS s FROM transactions
     WHERE user_id = ? AND kind = 'expense'
       AND deleted_at IS NULL
       AND occurred_at >= ? AND occurred_at < ?`,
    [user_id, start, end],
  );
  return rows[0]?.s ?? 0;
}

export async function monthIncomeBase(
  db: SQLiteDatabase,
  user_id: string,
  monthStart: Date,
): Promise<number> {
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).toISOString();
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString();
  const rows = await db.getAllAsync<{ s: number }>(
    `SELECT COALESCE(SUM(amount_base_micro), 0) AS s FROM transactions
     WHERE user_id = ? AND kind = 'income'
       AND deleted_at IS NULL
       AND occurred_at >= ? AND occurred_at < ?`,
    [user_id, start, end],
  );
  return rows[0]?.s ?? 0;
}
