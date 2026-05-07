import type { SQLiteDatabase } from 'expo-sqlite';
import type { Currency } from '@/domain/types';

export async function getRate(
  db: SQLiteDatabase,
  from: Currency,
  to: Currency,
  date?: string,
): Promise<number> {
  if (from === to) return 1;

  if (date) {
    // Try exact date first
    const exact = await db.getAllAsync<{ rate: number }>(
      `SELECT rate FROM fx_rates WHERE date = ? AND from_curr = ? AND to_curr = ?`,
      [date, from, to],
    );
    if (exact[0]) return exact[0].rate;
  }

  // Fall back to most recent stored row
  const recent = await db.getAllAsync<{ rate: number }>(
    `SELECT rate FROM fx_rates WHERE from_curr = ? AND to_curr = ? ORDER BY date DESC LIMIT 1`,
    [from, to],
  );
  if (recent[0]) return recent[0].rate;

  // No stored rate; return 1 as a safe fallback (caller should handle this)
  return 1;
}

export async function setRate(
  db: SQLiteDatabase,
  date: string,
  from: Currency,
  to: Currency,
  rate: number,
): Promise<void> {
  // fx_rates is server-managed; no outbox enqueue from the client
  await db.runAsync(
    `INSERT INTO fx_rates (date, from_curr, to_curr, rate) VALUES (?, ?, ?, ?)
     ON CONFLICT (date, from_curr, to_curr) DO UPDATE SET rate = excluded.rate`,
    [date, from, to, rate],
  );
}
