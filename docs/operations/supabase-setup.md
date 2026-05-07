# Supabase setup

## Projects
- prod: djlnshaigsrxphasosow (region ap-southeast-1)

## Local env (.env)
EXPO_PUBLIC_SUPABASE_URL=https://djlnshaigsrxphasosow.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon>

## Service role
Stored in `~/.config/personal-expenses/supabase-service-role` outside the repo.
Used only by Edge Function deploy and migration runs.

## Link status
`supabase login` and `supabase link --project-ref djlnshaigsrxphasosow` are pending user action.
Run these interactively before pushing migrations remotely.

## Phase 6 — FX cron (manual steps required)

After deploying migration `0016_cron_fx.sql` and the `fx-rates-cron` edge function, you must set two
database-level configuration parameters so the pg_cron job can call the function securely.

### Step 1 — Set DB parameters in Supabase dashboard

Go to **Supabase dashboard → Database → Extensions → pg_cron** (ensure it is enabled), then run
these SQL statements in the **SQL Editor** (or via `supabase db execute`):

```sql
ALTER DATABASE postgres SET "app.settings.fx_fn_url" = 'https://djlnshaigsrxphasosow.functions.supabase.co/fx-rates-cron';
ALTER DATABASE postgres SET "app.settings.service_role_key" = '<your-service-role-jwt>';
```

Replace `<your-service-role-jwt>` with the service role key from
**Supabase dashboard → Settings → API → service_role secret**.

> The service role key is never stored in this repo. Store it only in the Supabase dashboard or
> in `~/.config/personal-expenses/supabase-service-role` (already .gitignored).

### Step 2 — Verify cron job exists

```bash
./node_modules/.bin/supabase db execute "SELECT jobname, schedule FROM cron.job WHERE jobname='fx-rates-daily'"
```

Expected output: one row with `jobname = fx-rates-daily` and `schedule = 10 0 * * *`.

### Step 3 — Smoke-test the edge function

```bash
source .env   # sets EXPO_PUBLIC_SUPABASE_ANON_KEY
curl -X POST \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  https://djlnshaigsrxphasosow.functions.supabase.co/fx-rates-cron
```

Expected response body: `ok` (live rates fetched) or `ok-fallback` (yesterday's rates copied).
Any other response: check **Supabase dashboard → Edge Functions → fx-rates-cron → Logs**.

---

## Phase 11 — Recurring engine cron (manual steps required)

After deploying migration `0017_cron_recurring.sql` and the `recurring-engine-cron` edge function,
you must set a database-level configuration parameter so the pg_cron job can call the function.

### Step 1 — Set the recurring function URL

Go to **Supabase dashboard → Database → Settings → Custom Postgres Config** and add:

```sql
ALTER DATABASE postgres SET "app.settings.recurring_fn_url" =
  'https://djlnshaigsrxphasosow.functions.supabase.co/recurring-engine-cron';
```

> `app.settings.service_role_key` was already set in Phase 6. If not, also run:

```sql
ALTER DATABASE postgres SET "app.settings.service_role_key" = '<your-service-role-jwt>';
```

### Step 2 — Verify the recurring cron job

```bash
./node_modules/.bin/supabase db execute \
  "SELECT jobname, schedule FROM cron.job WHERE jobname='recurring-engine-hourly'"
```

Expected: one row with `schedule = 5 * * * *`.

### Step 3 — Smoke-test the recurring edge function

```bash
source .env
curl -s -X POST \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  https://djlnshaigsrxphasosow.functions.supabase.co/recurring-engine-cron | jq .
```

Expected: `{"processed":[],"errors":[],"total":0}` (or processed rules if any are due).
Any other response: check **Supabase dashboard → Edge Functions → recurring-engine-cron → Logs**.
