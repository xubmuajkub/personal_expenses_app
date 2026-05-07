import type { SQLiteDatabase } from 'expo-sqlite';

export interface CategorySlice {
  category_id: string | null;
  category_name: string | null;
  total_micro: number;
}

export async function spendByCategory(
  db: SQLiteDatabase,
  user_id: string,
  from: string,
  to: string,
): Promise<CategorySlice[]> {
  const rows = await db.getAllAsync<{
    category_id: string | null;
    category_name: string | null;
    total_micro: number;
  }>(
    `SELECT t.category_id,
            c.name AS category_name,
            COALESCE(SUM(t.amount_base_micro), 0) AS total_micro
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id AND c.deleted_at IS NULL
     WHERE t.user_id = ?
       AND t.kind = 'expense'
       AND t.deleted_at IS NULL
       AND t.occurred_at >= ?
       AND t.occurred_at <= ?
     GROUP BY t.category_id
     ORDER BY total_micro DESC`,
    [user_id, from, to],
  );
  return rows;
}
