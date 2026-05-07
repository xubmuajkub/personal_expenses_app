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

export async function updateProfile(
  db: SQLiteDatabase,
  user_id: string,
  fields: { display_name?: string },
): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    if (fields.display_name !== undefined) {
      await db.runAsync(
        `UPDATE profiles SET display_name = ?, updated_at = ?, sync_version = sync_version + 1
         WHERE id = ?`,
        [fields.display_name, now, user_id],
      );
    }
    const after = await db.getAllAsync<Profile>(`SELECT * FROM profiles WHERE id = ?`, [user_id]);
    if (after[0]) await enqueueOutbox(db, 'update', 'profiles', user_id, after[0]);
  });
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

