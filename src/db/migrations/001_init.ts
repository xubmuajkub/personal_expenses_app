import type { Migration } from '../migrations';

export const m001_init: Migration = {
  version: 1,
  async up(db) {
    await db.execAsync(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('cash','bank','credit_card','other')),
        currency TEXT NOT NULL CHECK (currency IN ('LAK','THB','USD')),
        opening_balance_micro INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX accounts_user_updated ON accounts (user_id, updated_at);

      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        kind TEXT NOT NULL CHECK (kind IN ('expense','income')),
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX categories_user_updated ON categories (user_id, updated_at);

      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        category_id TEXT,
        kind TEXT NOT NULL CHECK (kind IN ('expense','income','transfer')),
        amount_micro INTEGER NOT NULL,
        currency TEXT NOT NULL CHECK (currency IN ('LAK','THB','USD')),
        fx_rate_to_base REAL NOT NULL,
        amount_base_micro INTEGER NOT NULL,
        occurred_at TEXT NOT NULL,
        merchant TEXT,
        note TEXT,
        receipt_url TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        source_ref TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX txn_user_occurred ON transactions (user_id, occurred_at DESC);
      CREATE INDEX txn_user_updated ON transactions (user_id, updated_at);
      CREATE INDEX txn_user_account ON transactions (user_id, account_id);
      CREATE INDEX txn_user_category ON transactions (user_id, category_id);
      CREATE UNIQUE INDEX txn_source_ref_unique
        ON transactions (user_id, source, source_ref)
        WHERE source_ref IS NOT NULL;

      CREATE TABLE transfers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        from_txn_id TEXT NOT NULL,
        to_txn_id TEXT NOT NULL,
        fx_rate REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX transfers_user_updated ON transfers (user_id, updated_at);

      CREATE TABLE budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        month TEXT NOT NULL,
        limit_amount_micro INTEGER NOT NULL,
        limit_currency TEXT NOT NULL,
        last_alert_threshold INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1,
        UNIQUE (user_id, category_id, month)
      );

      CREATE TABLE merchant_rules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        pattern TEXT NOT NULL,
        is_regex INTEGER NOT NULL DEFAULT 0,
        category_id TEXT NOT NULL,
        account_id TEXT,
        hit_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE notif_parse_rules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        app_package TEXT NOT NULL,
        regex TEXT NOT NULL,
        field_map TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 100,
        enabled INTEGER NOT NULL DEFAULT 1,
        default_account_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE recurring_rules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        template_txn TEXT NOT NULL,
        cadence TEXT NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('auto','confirm')),
        next_run_at TEXT NOT NULL,
        last_notified_at TEXT,
        end_date TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE fx_rates (
        date TEXT NOT NULL,
        from_curr TEXT NOT NULL,
        to_curr TEXT NOT NULL,
        rate REAL NOT NULL,
        PRIMARY KEY (date, from_curr, to_curr)
      );

      CREATE TABLE push_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expo_token TEXT NOT NULL,
        platform TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        op TEXT NOT NULL CHECK (op IN ('insert','update','delete')),
        table_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        enqueued_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
      CREATE INDEX outbox_fifo ON outbox (id);

      CREATE TABLE raw_notifs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        package TEXT NOT NULL,
        title TEXT,
        text TEXT,
        posted_at TEXT NOT NULL,
        key TEXT NOT NULL UNIQUE,
        processed INTEGER NOT NULL DEFAULT 0,
        parsed_txn_id TEXT
      );

      CREATE TABLE sync_state (
        table_name TEXT PRIMARY KEY,
        last_sync_at TEXT
      );

      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        display_name TEXT,
        base_currency TEXT NOT NULL DEFAULT 'LAK',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
    `);
  },
};
