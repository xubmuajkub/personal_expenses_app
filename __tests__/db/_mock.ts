/**
 * Shared expo-sqlite mock backed by better-sqlite3 (in-memory).
 * Also exports expoCryptoMock for use with expo-crypto.
 * Usage in test files:
 *   jest.mock('expo-sqlite', () => require('./_mock').expoSqliteMock);
 *   jest.mock('expo-crypto', () => require('./_mock').expoCryptoMock);
 */

const sqlite = require('better-sqlite3');
const { randomUUID } = require('crypto');

export const expoCryptoMock = {
  randomUUID: () => randomUUID() as string,
  getRandomBytesAsync: async (byteCount: number) => new Uint8Array(byteCount).fill(1),
};

export const expoSqliteMock = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  openDatabaseAsync: jest.fn(async (_name: string) => {
    const db = sqlite(':memory:');
    return {
      execAsync: async (sql: string) => db.exec(sql),
      runAsync: async (sql: string, params: unknown[] = []) => db.prepare(sql).run(...params),
      getAllAsync: async <T>(sql: string, params: unknown[] = []) =>
        db.prepare(sql).all(...params) as T[],
      // Limitation: nested withTransactionAsync is not supported by this mock — concurrent BEGINs will fail.
      withTransactionAsync: async (fn: () => Promise<void>) => {
        db.exec('BEGIN');
        try { await fn(); db.exec('COMMIT'); }
        catch (e) { db.exec('ROLLBACK'); throw e; }
      },
      closeAsync: async () => { db.close(); },
    };
  }),
};
