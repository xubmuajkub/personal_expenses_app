-- 0015_phase1_corrections.sql
--
-- Quality-review corrections to Phase 1 migrations.
-- See review notes from 2026-05-08.
--
-- Note: existing transactions indexes use the prefix `txn_*` while other
-- tables use full table names. We accept that inconsistency and do NOT
-- rename to avoid index rebuild cost; new tables MUST use the full
-- `<table>_user_<col>` pattern going forward.

-- Fix 1: enforce_sync_version supports a per-transaction bypass flag
CREATE OR REPLACE FUNCTION enforce_sync_version() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.sync_version <= OLD.sync_version THEN
    IF current_setting('app.bypass_sync_version', true) = 'on' THEN
      NEW.updated_at = now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'stale_write' USING ERRCODE = 'PT401';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- Update budget_threshold_check to set the bypass flag before its UPDATE
CREATE OR REPLACE FUNCTION budget_threshold_check() RETURNS trigger AS $$
DECLARE
  v_user uuid;
  v_cat uuid;
  v_month date;
  v_spend numeric;
  v_budget budgets%ROWTYPE;
  v_pct numeric;
  v_threshold int;
BEGIN
  v_user := COALESCE(NEW.user_id, OLD.user_id);
  v_cat := COALESCE(NEW.category_id, OLD.category_id);
  v_month := date_trunc('month', COALESCE(NEW.occurred_at, OLD.occurred_at))::date;
  IF v_cat IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_budget FROM budgets
    WHERE user_id = v_user AND category_id = v_cat AND month = v_month
      AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(amount_base), 0) INTO v_spend
    FROM transactions
    WHERE user_id = v_user
      AND category_id = v_cat
      AND kind = 'expense'
      AND deleted_at IS NULL
      AND date_trunc('month', occurred_at)::date = v_month;

  v_pct := (v_spend / v_budget.limit_amount) * 100;
  v_threshold := CASE
    WHEN v_pct >= 100 THEN 100
    WHEN v_pct >= 80 THEN 80
    ELSE 0
  END;

  IF v_threshold > v_budget.last_alert_threshold THEN
    PERFORM set_config('app.bypass_sync_version', 'on', true);
    UPDATE budgets SET last_alert_threshold = v_threshold,
      sync_version = sync_version + 1
      WHERE id = v_budget.id;

    INSERT INTO push_queue (user_id, type, payload)
    VALUES (v_user, 'budget_threshold', jsonb_build_object(
      'budget_id', v_budget.id,
      'category_id', v_cat,
      'month', v_month,
      'threshold', v_threshold,
      'spend_base', v_spend,
      'limit_base', v_budget.limit_amount));
  ELSIF v_threshold < v_budget.last_alert_threshold THEN
    PERFORM set_config('app.bypass_sync_version', 'on', true);
    UPDATE budgets SET last_alert_threshold = v_threshold,
      sync_version = sync_version + 1
      WHERE id = v_budget.id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: RLS policy naming consistency
DROP POLICY IF EXISTS npr_owner_all ON notif_parse_rules;
CREATE POLICY notif_parse_rules_owner_all ON notif_parse_rules
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rr_owner_all ON recurring_rules;
CREATE POLICY recurring_rules_owner_all ON recurring_rules
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Fix 3: missing index on push_tokens for delta-sync pulls
CREATE INDEX IF NOT EXISTS push_tokens_user_updated_at
  ON push_tokens (user_id, updated_at);

-- Fix 5: documentation comment on push_queue
COMMENT ON TABLE push_queue IS
  'Server-only push notification queue. No RLS policy = no client access. '
  'Drained by the push-notif-fanout edge function. Soft delete is intentionally '
  'omitted because rows are short-lived and only flow server -> Expo Push API.';
