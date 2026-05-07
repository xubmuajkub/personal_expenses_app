import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { flushOutbox } from './outbox';
import { pullAll, pullTable, SYNCED_TABLES } from './pull';
import { startRealtime, stopRealtime } from './realtime';
import { isOnline, onNetworkChange, startNetworkWatcher } from './network';
import { monthBudgetStatuses } from '@/domain/budgets';
import { fireBudgetAlert } from '@/lib/local_notifs';
import { format } from '@/domain/money';

let cycling = false;
const lastSeenAlerts = new Map<string, number>();

async function checkBudgetCrossings(deps: SyncDeps): Promise<void> {
  const statuses = await monthBudgetStatuses(deps.db, deps.userId, new Date());
  for (const s of statuses) {
    const prev = lastSeenAlerts.get(s.budget_id) ?? 0;
    if (s.threshold > prev && s.threshold > 0) {
      await fireBudgetAlert({
        category_name: s.category_name,
        threshold: s.threshold as 80 | 100,
        spend: format(s.spend_micro, 'LAK'),
        limit: format(s.limit_micro, 'LAK'),
      });
    }
    lastSeenAlerts.set(s.budget_id, s.threshold);
  }
}

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
    await checkBudgetCrossings(deps);
  } finally {
    cycling = false;
  }
}

export function stopSync(deps: { sb: SupabaseClient }): void {
  stopRealtime(deps.sb);
}

export { pullTable, SYNCED_TABLES };
