import { openDb } from '@/db/sqlite';
import { runMigrations } from '@/db/migrations';
import { m001_init } from '@/db/migrations/001_init';
import { getSupabase } from '@/lib/supabase';
import { startSync, stopSync } from '@/sync';

let started = false;
let bootDeps: { sb: ReturnType<typeof getSupabase> } | null = null;

export async function bootSyncForUser(userId: string): Promise<void> {
  if (started) return;
  started = true;
  const db = await openDb();
  await runMigrations(db, [m001_init]);
  const sb = getSupabase();
  bootDeps = { sb };
  // Seed default categories on the server (idempotent).
  void sb.rpc('seed_default_categories');
  await startSync({ db, sb, userId });
}

export function stopSyncForUser(): void {
  if (!started) return;
  if (bootDeps) stopSync(bootDeps);
  started = false;
  bootDeps = null;
}
