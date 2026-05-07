-- 0003_accounts.sql
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('cash','bank','credit_card','other')),
  currency text NOT NULL CHECK (currency IN ('LAK','THB','USD')),
  opening_balance numeric(18,4) NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX accounts_user_updated_at ON accounts (user_id, updated_at);
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_owner_all ON accounts
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('accounts');
