-- supabase/tests/rls_smoke.sql
BEGIN;
SELECT auth.set_auth_user('00000000-0000-0000-0000-000000000001');
INSERT INTO accounts (user_id, name, type, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'Cash', 'cash', 'LAK');

-- Switch to other user, ensure not visible.
SELECT auth.set_auth_user('00000000-0000-0000-0000-000000000002');
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM accounts) THEN
    RAISE EXCEPTION 'RLS leak: other user can see accounts';
  END IF;
END $$;
ROLLBACK;
