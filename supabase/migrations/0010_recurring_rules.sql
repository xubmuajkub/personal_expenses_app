-- 0010_recurring_rules.sql
CREATE TABLE recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_txn jsonb NOT NULL,            -- {account_id, category_id, amount, currency, kind, note, merchant}
  cadence text NOT NULL,                  -- 'monthly_day_15' | 'weekly_dow_3' | cron string
  mode text NOT NULL CHECK (mode IN ('auto','confirm')),
  next_run_at timestamptz NOT NULL,
  last_notified_at timestamptz,
  end_date date,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX rr_user_updated_at ON recurring_rules (user_id, updated_at);
CREATE INDEX rr_due ON recurring_rules (next_run_at)
  WHERE enabled AND deleted_at IS NULL;
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY rr_owner_all ON recurring_rules
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('recurring_rules');
