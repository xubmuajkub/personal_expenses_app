import type { SQLiteDatabase } from 'expo-sqlite';
import { spendByCategory } from './reports/spend_by_category';

export interface BudgetStatus {
  budget_id: string;
  category_id: string;
  category_name: string;
  limit_micro: number;
  spend_micro: number;
  pct: number;        // 0..1+
  threshold: 0 | 80 | 100;
}

export async function monthBudgetStatuses(
  db: SQLiteDatabase, user_id: string, monthStart: Date,
): Promise<BudgetStatus[]> {
  // Use local calendar date to avoid UTC-offset surprises when called with new Date()
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthKey = `${year}-${pad(month + 1)}-01`;
  const from = monthKey;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const to = `${nextYear}-${pad(nextMonth + 1)}-01`;

  const budgets = await db.getAllAsync<{
    id: string; category_id: string; limit_amount_micro: number;
  }>(
    `SELECT id, category_id, limit_amount_micro FROM budgets
     WHERE user_id = ? AND month = ? AND deleted_at IS NULL`,
    [user_id, monthKey]);

  const slices = await spendByCategory(db, user_id, from, to);
  const sliceByCat = new Map(slices.map((s) => [s.category_id, s.total_micro]));

  const cats = await db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name FROM categories WHERE user_id = ? AND deleted_at IS NULL`, [user_id]);
  const nameByCat = new Map(cats.map((c) => [c.id, c.name]));

  return budgets.map((b) => {
    const spend = sliceByCat.get(b.category_id) ?? 0;
    const pct = b.limit_amount_micro > 0 ? spend / b.limit_amount_micro : 0;
    const threshold = pct >= 1 ? 100 : pct >= 0.8 ? 80 : 0;
    return {
      budget_id: b.id,
      category_id: b.category_id,
      category_name: nameByCat.get(b.category_id) ?? '?',
      limit_micro: b.limit_amount_micro,
      spend_micro: spend,
      pct,
      threshold: threshold as 0 | 80 | 100,
    };
  });
}
