-- 0009_notif_parse_rules.sql
CREATE TABLE notif_parse_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_package text NOT NULL,
  regex text NOT NULL,
  field_map jsonb NOT NULL,         -- {amount:'$1', currency:'$2', merchant:'$3'}
  priority int NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  default_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX npr_user_updated_at ON notif_parse_rules (user_id, updated_at);
CREATE INDEX npr_user_pkg_priority
  ON notif_parse_rules (user_id, app_package, priority DESC)
  WHERE enabled AND deleted_at IS NULL;
ALTER TABLE notif_parse_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY npr_owner_all ON notif_parse_rules
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('notif_parse_rules');
