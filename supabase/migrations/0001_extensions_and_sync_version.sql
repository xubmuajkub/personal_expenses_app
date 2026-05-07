-- 0001_extensions_and_sync_version.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- enforce_sync_version: rejects stale updates on synced tables.
-- Custom SQLSTATE 'PT401' avoids built-in serialization_failure auto-retry.
CREATE OR REPLACE FUNCTION enforce_sync_version() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.sync_version <= OLD.sync_version THEN
    RAISE EXCEPTION 'stale_write' USING ERRCODE = 'PT401';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- Helper to attach the trigger and a default updated_at touch.
CREATE OR REPLACE FUNCTION attach_sync_triggers(tbl regclass) RETURNS void AS $$
BEGIN
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_sync_version ON %s', tbl);
  EXECUTE format(
    'CREATE TRIGGER trg_sync_version BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION enforce_sync_version()', tbl);
END $$ LANGUAGE plpgsql;
