import type { SQLiteDatabase } from 'expo-sqlite';
import { enqueueOutbox, nowIso } from './base';
import * as Crypto from 'expo-crypto';

export interface NotifParseRule {
  id: string;
  user_id: string;
  app_package: string;
  regex: string;
  field_map: Record<string, string>;
  priority: number;
  enabled: boolean;
  default_account_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

interface NotifParseRuleRow {
  id: string;
  user_id: string;
  app_package: string;
  regex: string;
  field_map: string;
  priority: number;
  enabled: number;
  default_account_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

function toRule(r: NotifParseRuleRow): NotifParseRule {
  return {
    ...r,
    field_map: typeof r.field_map === 'string' ? JSON.parse(r.field_map) : r.field_map,
    enabled: r.enabled !== 0,
  };
}

export interface CreateNotifParseRuleInput {
  user_id: string;
  app_package: string;
  regex: string;
  field_map: Record<string, string>;
  priority?: number;
  enabled?: boolean;
  default_account_id?: string | null;
}

export async function createNotifParseRule(
  db: SQLiteDatabase,
  input: CreateNotifParseRuleInput,
): Promise<NotifParseRule> {
  const id = Crypto.randomUUID();
  const now = nowIso();
  const row: NotifParseRule = {
    id,
    user_id: input.user_id,
    app_package: input.app_package,
    regex: input.regex,
    field_map: input.field_map,
    priority: input.priority ?? 100,
    enabled: input.enabled ?? true,
    default_account_id: input.default_account_id ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_version: 1,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO notif_parse_rules
         (id, user_id, app_package, regex, field_map, priority, enabled, default_account_id, created_at, updated_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id, row.user_id, row.app_package, row.regex,
        JSON.stringify(row.field_map), row.priority,
        row.enabled ? 1 : 0, row.default_account_id, now, now,
      ],
    );
    await enqueueOutbox(db, 'insert', 'notif_parse_rules', id, row);
  });
  return row;
}

export async function listNotifParseRules(
  db: SQLiteDatabase,
  user_id: string,
): Promise<NotifParseRule[]> {
  const rows = await db.getAllAsync<NotifParseRuleRow>(
    `SELECT * FROM notif_parse_rules
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY priority DESC, created_at ASC`,
    [user_id],
  );
  return rows.map(toRule);
}

export async function getNotifParseRule(
  db: SQLiteDatabase,
  id: string,
): Promise<NotifParseRule | null> {
  const rows = await db.getAllAsync<NotifParseRuleRow>(
    `SELECT * FROM notif_parse_rules WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return toRule(row);
}

export async function updateNotifParseRule(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Pick<NotifParseRule, 'app_package' | 'regex' | 'field_map' | 'priority' | 'enabled' | 'default_account_id'>>,
): Promise<void> {
  const now = nowIso();
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.app_package !== undefined) { sets.push('app_package = ?'); vals.push(patch.app_package); }
  if (patch.regex !== undefined) { sets.push('regex = ?'); vals.push(patch.regex); }
  if (patch.field_map !== undefined) { sets.push('field_map = ?'); vals.push(JSON.stringify(patch.field_map)); }
  if (patch.priority !== undefined) { sets.push('priority = ?'); vals.push(patch.priority); }
  if (patch.enabled !== undefined) { sets.push('enabled = ?'); vals.push(patch.enabled ? 1 : 0); }
  if (patch.default_account_id !== undefined) { sets.push('default_account_id = ?'); vals.push(patch.default_account_id); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?', 'sync_version = sync_version + 1');
  vals.push(now);
  vals.push(id);
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE notif_parse_rules SET ${sets.join(', ')} WHERE id = ?`, vals);
    const after = await db.getAllAsync<NotifParseRuleRow>(
      `SELECT * FROM notif_parse_rules WHERE id = ?`, [id],
    );
    if (after[0]) await enqueueOutbox(db, 'update', 'notif_parse_rules', id, after[0]);
  });
}

export async function deleteNotifParseRule(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE notif_parse_rules SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1
       WHERE id = ?`,
      [now, now, id],
    );
    await enqueueOutbox(db, 'delete', 'notif_parse_rules', id, { id, deleted_at: now });
  });
}

export interface RawNotifRow {
  id: number;
  package: string;
  title: string | null;
  text: string | null;
  posted_at: string;
  key: string;
  processed: number;
  parsed_txn_id: string | null;
}

export async function listRecentRawNotifs(
  db: SQLiteDatabase,
  limit = 20,
): Promise<RawNotifRow[]> {
  return db.getAllAsync<RawNotifRow>(
    `SELECT * FROM raw_notifs ORDER BY id DESC LIMIT ?`,
    [limit],
  );
}
