-- 0006_transfers.sql
CREATE TABLE transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_txn_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  to_txn_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  fx_rate numeric(18,8),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1,
  CHECK (from_txn_id <> to_txn_id)
);
CREATE INDEX transfers_user_updated_at ON transfers (user_id, updated_at);
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY transfers_owner_all ON transfers
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('transfers');
