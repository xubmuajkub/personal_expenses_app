-- 0017_cron_recurring.sql
-- confirm_recurring RPC + pg_cron schedule for the recurring engine.
--
-- Manual step required after deploying:
--   Set app.settings.recurring_fn_url in Supabase dashboard → Database → Settings → Custom Postgres Config
--   e.g. ALTER DATABASE postgres SET "app.settings.recurring_fn_url" =
--          'https://djlnshaigsrxphasosow.functions.supabase.co/recurring-engine-cron';

-- ── confirm_recurring RPC ────────────────────────────────────────────────────
-- Inserts a transaction from the recurring rule template, advances next_run_at
-- by 31 days (simplified per plan), bumps sync_version, and returns the new txn id.

CREATE OR REPLACE FUNCTION confirm_recurring(rule_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule        recurring_rules%ROWTYPE;
  v_tmpl        JSONB;
  v_txn_id      UUID;
  v_now         TIMESTAMPTZ := now();
  v_next_run    TIMESTAMPTZ;
  v_fx_rate     REAL := 1.0;
  v_amount_base BIGINT;
BEGIN
  -- Lock the rule row
  SELECT * INTO v_rule
  FROM recurring_rules
  WHERE id = rule_id AND enabled AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recurring rule not found or not eligible: %', rule_id;
  END IF;

  v_tmpl := v_rule.template_txn::JSONB;

  -- Get today's FX rate (currency → LAK); fall back to 1 if not available
  SELECT rate INTO v_fx_rate
  FROM fx_rates
  WHERE date = (v_now AT TIME ZONE 'UTC')::DATE::TEXT
    AND from_curr = (v_tmpl->>'currency')
    AND to_curr   = 'LAK'
  LIMIT 1;

  IF v_fx_rate IS NULL THEN
    v_fx_rate := 1.0;
  END IF;

  v_amount_base := ROUND((v_tmpl->>'amount_micro')::BIGINT * v_fx_rate);

  -- Generate transaction id
  v_txn_id := gen_random_uuid();

  -- Insert transaction
  INSERT INTO transactions (
    id, user_id, account_id, category_id, kind,
    amount_micro, currency, fx_rate_to_base, amount_base_micro,
    occurred_at, merchant, note, source, source_ref,
    created_at, updated_at, sync_version
  ) VALUES (
    v_txn_id,
    v_rule.user_id,
    (v_tmpl->>'account_id')::UUID,
    NULLIF(v_tmpl->>'category_id', '')::UUID,
    (v_tmpl->>'kind'),
    (v_tmpl->>'amount_micro')::BIGINT,
    (v_tmpl->>'currency'),
    v_fx_rate,
    v_amount_base,
    v_now,
    NULLIF(v_tmpl->>'merchant', ''),
    NULLIF(v_tmpl->>'note', ''),
    'recurring',
    'recurring:' || rule_id::TEXT || ':' || v_now::TEXT,
    v_now,
    v_now,
    1
  );

  -- Advance next_run_at by 31 days (simplified)
  v_next_run := v_rule.next_run_at + INTERVAL '31 days';

  -- Update the rule
  UPDATE recurring_rules
  SET
    next_run_at    = v_next_run,
    updated_at     = v_now,
    sync_version   = sync_version + 1
  WHERE id = rule_id;

  RETURN v_txn_id;
END;
$$;

-- Grant to authenticated users (RLS still applies on underlying tables)
GRANT EXECUTE ON FUNCTION confirm_recurring(UUID) TO authenticated;

-- ── pg_cron schedule ─────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: remove existing job before (re-)scheduling
SELECT cron.unschedule('recurring-engine-hourly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recurring-engine-hourly');

SELECT cron.schedule(
  'recurring-engine-hourly',
  '5 * * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.settings.recurring_fn_url'),
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')));
  $$);
