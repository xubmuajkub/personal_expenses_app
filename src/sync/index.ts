import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { flushOutbox } from './outbox';
import { pullAll, pullTable, SYNCED_TABLES } from './pull';
import { startRealtime, stopRealtime } from './realtime';
import { isOnline, onNetworkChange, startNetworkWatcher } from './network';

let cycling = false;

export interface SyncDeps {
  db: SQLiteDatabase;
  sb: SupabaseClient;
  userId: string;
}

export async function startSync(deps: SyncDeps): Promise<void> {
  startNetworkWatcher();
  onNetworkChange((online) => { if (online) void cycle(deps); });
  startRealtime(deps.db, deps.sb, deps.userId);
  await cycle(deps);
}

export async function cycle(deps: SyncDeps): Promise<void> {
  if (cycling || !isOnline()) return;
  cycling = true;
  try {
    const flush = await flushOutbox(deps.db, deps.sb);
    if (flush.deferred > 0) {
      // possible PT401 — re-pull affected table(s) and try once more
      await pullAll(deps.db, deps.sb);
      await flushOutbox(deps.db, deps.sb);
    }
    // Second pull: pick up any rows written by the re-flush above. Intentional, not a copy/paste.
    await pullAll(deps.db, deps.sb);
  } finally {
    cycling = false;
  }
}

export function stopSync(deps: { sb: SupabaseClient }): void {
  stopRealtime(deps.sb);
}

export { pullTable, SYNCED_TABLES };
