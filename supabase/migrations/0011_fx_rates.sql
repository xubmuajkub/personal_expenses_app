-- 0011_fx_rates.sql
-- fx_rates is shared (no user_id). Read-only for all authenticated users.
CREATE TABLE fx_rates (
  date date NOT NULL,
  from_curr text NOT NULL CHECK (from_curr IN ('LAK','THB','USD')),
  to_curr text NOT NULL CHECK (to_curr IN ('LAK','THB','USD')),
  rate numeric(18,8) NOT NULL CHECK (rate > 0),
  PRIMARY KEY (date, from_curr, to_curr)
);
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY fx_rates_read ON fx_rates FOR SELECT
  USING (auth.uid() IS NOT NULL);
-- Writes only via service role (Edge Function) — no INSERT/UPDATE policy.
