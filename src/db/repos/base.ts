import type { SQLiteDatabase } from 'expo-sqlite';

export function nowIso(): string {
  return new Date().toISOString();
}

export function notDeleted(): string {
  return 'deleted_at IS NULL';
}

export async function enqueueOutbox(
  db: SQLiteDatabase,
  op: 'insert' | 'update' | 'delete',
  table_name: string,
  row_id: string,
  payload: unknown,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO outbox (op, table_name, row_id, payload, enqueued_at)
     VALUES (?, ?, ?, ?, ?)`,
    [op, table_name, row_id, JSON.stringify(payload), nowIso()],
  );
}
