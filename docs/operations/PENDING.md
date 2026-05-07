# Pending user actions

## Supabase project link — DONE 2026-05-08

`supabase login`, `supabase link --project-ref djlnshaigsrxphasosow`, and `supabase db push` all completed. All 15 migrations are applied to the remote project.

## What does NOT block on this

- Phase 2 (local SQLite + repos)
- Phase 3 (sync engine code) up to the point of integration tests
- Phase 0 work (already complete)

## What DOES block

- Phase 4 onwards (auth, onboarding, end-to-end flows)
- Edge function deploys (Phase 6, 11, 12)
- The RLS smoke test in Task 1.16
- Any `supabase db reset` verification step in Phase 1 — skipped during write, must be run after link
