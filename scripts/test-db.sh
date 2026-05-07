#!/usr/bin/env bash
set -euo pipefail
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_helpers.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke.sql
echo "OK: RLS smoke passed"
