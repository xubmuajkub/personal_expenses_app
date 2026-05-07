import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SYNCED_TABLES, pullTable, type SyncedTable } from './pull';

let channel: RealtimeChannel | null = null;

export function startRealtime(db: SQLiteDatabase, sb: SupabaseClient, userId: string): void {
  if (channel) stopRealtime(sb);
  channel = sb.channel(`u:${userId}`);
  for (const t of SYNCED_TABLES) {
    channel.on('postgres_changes',
      { event: '*', schema: 'public', table: t, filter: `user_id=eq.${userId}` },
      () => {
        pullTable(db, sb, t as SyncedTable).catch((e) => {
          console.error('[realtime] pullTable failed', t, e);
        });
      });
  }
  channel.subscribe();
}

export function stopRealtime(sb: SupabaseClient): void {
  if (channel) {
    void sb.removeChannel(channel);
    channel = null;
  }
}
