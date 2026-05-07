import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DB_NAME = 'personal_expenses.db';
const KEY_NAME = 'sqlite_passphrase_v1';

async function getOrCreateKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) return existing;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_NAME, hex);
  return hex;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const key = await getOrCreateKey();
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // expo-sqlite supports SQLCipher when the binary is built with it.
      // Run PRAGMA key=... unconditionally; harmless on stock SQLite (errors trapped).
      try {
        await db.execAsync(`PRAGMA key = '${key}';`);
      } catch {
        // stock SQLite: encryption skipped, log only
        console.warn('SQLCipher not available; DB is plaintext on disk');
      }
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      return db;
    })();
  }
  return dbPromise;
}

export async function closeDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
}
