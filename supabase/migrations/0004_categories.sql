-- 0004_categories.sql
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  color text,
  kind text NOT NULL CHECK (kind IN ('expense','income')),
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  sync_version bigint NOT NULL DEFAULT 1
);
CREATE INDEX categories_user_updated_at ON categories (user_id, updated_at);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_owner_all ON categories
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
SELECT attach_sync_triggers('categories');

-- Seeds default categories for the calling user. Idempotent.
CREATE OR REPLACE FUNCTION seed_default_categories() RETURNS void AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO categories (user_id, name, icon, color, kind)
  SELECT uid, n, i, c, k FROM (VALUES
    ('Food','utensils','#F59E0B','expense'),
    ('Transport','car','#3B82F6','expense'),
    ('Bills','file-text','#6366F1','expense'),
    ('Health','activity','#EF4444','expense'),
    ('Shopping','shopping-bag','#EC4899','expense'),
    ('Entertainment','film','#8B5CF6','expense'),
    ('Transfer','repeat','#6B7280','expense'),
    ('Other','more-horizontal','#9CA3AF','expense'),
    ('Salary','briefcase','#10B981','income'),
    ('Other Income','plus-circle','#10B981','income')
  ) AS v(n,i,c,k)
  WHERE NOT EXISTS (
    SELECT 1 FROM categories WHERE user_id = uid AND name = v.n AND kind = v.k
  );
END $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
