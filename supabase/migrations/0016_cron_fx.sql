-- 0016_cron_fx.sql
-- Enable pg_cron extension and schedule daily FX rate refresh.
-- Requires the following DB settings to be configured in the Supabase dashboard:
--   app.settings.fx_fn_url      — Edge Function URL, e.g. https://<ref>.functions.supabase.co/fx-rates-cron
--   app.settings.service_role_key — Service role JWT (set via Supabase dashboard > Settings > Vault or DB params)

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: remove existing job before (re-)scheduling
SELECT cron.unschedule('fx-rates-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fx-rates-daily');

SELECT cron.schedule(
  'fx-rates-daily',
  '10 0 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.fx_fn_url'),
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
    );
  $$);
