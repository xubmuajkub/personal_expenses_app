-- 0008_merchant_rules.sql
CREATE TABLE merchant_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern text NOT NULL,
  is_regex boolean NOT NULL DEFAULT false,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  hit_count int NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX merchant_rules_user_updated_at ON merchant_rules (user_id, updated_at);
ALTER TABLE merchant_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY merchant_rules_owner_all ON merchant_rules
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('merchant_rules');
