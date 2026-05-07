import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, CategoryKind } from '@/domain/types';
import { enqueueOutbox, nowIso } from './base';
import * as Crypto from 'expo-crypto';

export interface CreateCategoryInput {
  user_id: string;
  name: string;
  icon?: string;
  color?: string;
  kind: CategoryKind;
}

export async function createCategory(
  db: SQLiteDatabase,
  input: CreateCategoryInput,
): Promise<Category> {
  const id = Crypto.randomUUID();
  const now = nowIso();
  const row: Category = {
    id,
    user_id: input.user_id,
    name: input.name,
    icon: input.icon ?? null,
    color: input.color ?? null,
    kind: input.kind,
    archived: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_version: 1,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO categories (id, user_id, name, icon, color, kind,
         archived, created_at, updated_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 1)`,
      [id, row.user_id, row.name, row.icon, row.color, row.kind, now, now],
    );
    await enqueueOutbox(db, 'insert', 'categories', id, row);
  });
  return row;
}

export async function listCategories(
  db: SQLiteDatabase,
  user_id: string,
  kind?: CategoryKind,
): Promise<Category[]> {
  const rows = await db.getAllAsync<Category>(
    `SELECT * FROM categories
     WHERE user_id = ? AND deleted_at IS NULL${kind ? ' AND kind = ?' : ''}
     ORDER BY archived ASC, name ASC`,
    kind ? [user_id, kind] : [user_id],
  );
  return rows.map((r) => ({ ...r, archived: !!(r as unknown as { archived: number }).archived }));
}

export async function getCategory(db: SQLiteDatabase, id: string): Promise<Category | null> {
  const rows = await db.getAllAsync<Category>(
    `SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return { ...row, archived: !!(row as unknown as { archived: number }).archived };
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'archived'>>,
): Promise<void> {
  const now = nowIso();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); vals.push(patch.name); }
  if (patch.icon !== undefined) { sets.push('icon = ?'); vals.push(patch.icon); }
  if (patch.color !== undefined) { sets.push('color = ?'); vals.push(patch.color); }
  if (patch.archived !== undefined) { sets.push('archived = ?'); vals.push(patch.archived ? 1 : 0); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?', 'sync_version = sync_version + 1');
  vals.push(now);
  vals.push(id);
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, vals);
    const after = await db.getAllAsync<Category>(`SELECT * FROM categories WHERE id = ?`, [id]);
    if (after[0]) await enqueueOutbox(db, 'update', 'categories', id, after[0]);
  });
}

export async function deleteCategory(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE categories SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1 WHERE id = ?`,
      [now, now, id],
    );
    await enqueueOutbox(db, 'delete', 'categories', id, { id, deleted_at: now });
  });
}
