-- 0005_transactions.sql
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('expense','income','transfer')),
  amount numeric(18,4) NOT NULL,
  currency text NOT NULL CHECK (currency IN ('LAK','THB','USD')),
  fx_rate_to_base numeric(18,8) NOT NULL,
  amount_base numeric(18,4) NOT NULL,
  occurred_at timestamptz NOT NULL,
  merchant text,
  note text,
  receipt_url text,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','notif','recurring','import')),
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX txn_user_occurred_at ON transactions (user_id, occurred_at DESC);
CREATE INDEX txn_user_updated_at ON transactions (user_id, updated_at);
CREATE INDEX txn_user_account ON transactions (user_id, account_id);
CREATE INDEX txn_user_category ON transactions (user_id, category_id);
CREATE UNIQUE INDEX txn_source_ref_unique
  ON transactions (user_id, source, source_ref)
  WHERE source_ref IS NOT NULL;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY transactions_owner_all ON transactions
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('transactions');
