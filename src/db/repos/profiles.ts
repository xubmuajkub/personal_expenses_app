import type { SQLiteDatabase } from 'expo-sqlite';
import type { Currency } from '@/domain/types';
import { enqueueOutbox, nowIso } from './base';

export interface Profile {
  id: string;
  display_name: string | null;
  base_currency: Currency;
  created_at: string;
  updated_at: string;
  sync_version: number;
}

export async function getProfile(db: SQLiteDatabase, user_id: string): Promise<Profile | null> {
  const rows = await db.getAllAsync<Profile>(
    `SELECT * FROM profiles WHERE id = ?`,
    [user_id],
  );
  return rows[0] ?? null;
}

export async function setBaseCurrency(
  db: SQLiteDatabase,
  user_id: string,
  base_currency: Currency,
): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE profiles SET base_currency = ?, updated_at = ?, sync_version = sync_version + 1
       WHERE id = ?`,
      [base_currency, now, user_id],
    );
    const after = await db.getAllAsync<Profile>(`SELECT * FROM profiles WHERE id = ?`, [user_id]);
    if (after[0]) await enqueueOutbox(db, 'update', 'profiles', user_id, after[0]);
  });
}

export async function upsertProfile(
  db: SQLiteDatabase,
  user_id: string,
  display_name: string | null,
  base_currency: Currency = 'LAK',
): Promise<Profile> {
  const now = nowIso();
  const existing = await getProfile(db, user_id);
  if (existing) return existing;

  const row: Profile = {
    id: user_id,
    display_name,
    base_currency,
    created_at: now,
    updated_at: now,
    sync_version: 1,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO profiles (id, display_name, base_currency, created_at, updated_at, sync_version)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [user_id, display_name, base_currency, now, now],
    );
    await enqueueOutbox(db, 'insert', 'profiles', user_id, row);
  });
  return row;
}
