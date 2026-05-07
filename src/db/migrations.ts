import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export async function runMigrations(db: SQLiteDatabase, migrations: Migration[]): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const rows = await db.getAllAsync<{ version: number }>('SELECT version FROM _migrations');
  const applied = new Set(rows.map((r) => r.version));
  const ordered = [...migrations].sort((a, b) => a.version - b.version);
  for (const m of ordered) {
    if (applied.has(m.version)) continue;
    await db.withTransactionAsync(async () => {
      await m.up(db);
      await db.runAsync('INSERT INTO _migrations (version, applied_at) VALUES (?, ?)', [
        m.version,
        new Date().toISOString(),
      ]);
    });
  }
}
