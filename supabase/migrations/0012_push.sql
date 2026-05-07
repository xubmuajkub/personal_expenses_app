-- 0012_push.sql
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1,
  UNIQUE (user_id, expo_token)
);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_tokens_owner_all ON push_tokens
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('push_tokens');

-- Server-only queue, no RLS for users. Service role drains it.
CREATE TABLE push_queue (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,                 -- 'budget_threshold','recurring_confirm', etc.
  payload jsonb NOT NULL,
  sent_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_queue_unsent ON push_queue (created_at)
  WHERE sent_at IS NULL;
ALTER TABLE push_queue ENABLE ROW LEVEL SECURITY;
-- No policy = no client access.
