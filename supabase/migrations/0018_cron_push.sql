-- Unschedule if already exists (idempotent re-run)
SELECT cron.unschedule('push-fanout-1m')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'push-fanout-1m');

SELECT cron.schedule(
  'push-fanout-1m',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.push_fn_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')));
  $$);
