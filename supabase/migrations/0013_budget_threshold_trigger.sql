-- 0013_budget_threshold_trigger.sql
-- After a transaction insert/update/delete, recompute spend for the affected
-- (user, category, month) and enqueue a push if a budget threshold is newly crossed.
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
    -- spend dropped under threshold (e.g. txn deleted) — reset
    UPDATE budgets SET last_alert_threshold = v_threshold,
      sync_version = sync_version + 1
      WHERE id = v_budget.id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_budget_threshold
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION budget_threshold_check();
