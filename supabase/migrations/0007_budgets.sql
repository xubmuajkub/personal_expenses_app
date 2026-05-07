-- 0007_budgets.sql
CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month date NOT NULL,
  limit_amount numeric(18,4) NOT NULL CHECK (limit_amount > 0),
  limit_currency text NOT NULL CHECK (limit_currency IN ('LAK','THB','USD')),
  last_alert_threshold int NOT NULL DEFAULT 0
    CHECK (last_alert_threshold IN (0, 80, 100)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1,
  UNIQUE (user_id, category_id, month)
);
CREATE INDEX budgets_user_updated_at ON budgets (user_id, updated_at);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY budgets_owner_all ON budgets
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('budgets');
