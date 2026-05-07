# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Pre-implementation. The repository currently contains only a design spec — no application code, no `package.json`, no build tooling. Read the spec before suggesting code changes.

## Authoritative spec

[`docs/superpowers/specs/2026-05-07-personal-expenses-design.md`](docs/superpowers/specs/2026-05-07-personal-expenses-design.md)

That document is the source of truth for scope, architecture, data model, sync semantics, and acceptance criteria. Section 14 ("Decision log") records every Q/A made during brainstorming — when in doubt, defer to those decisions rather than inventing alternatives.

## What this app is, in one paragraph

Solo personal expense tracker for iOS and Android, written in React Native + Expo (dev build). Local SQLite is the source of truth; a custom outbox queue syncs to Supabase Postgres. The Android app captures BCELOne bank push notifications via a Kotlin `NotificationListenerService` exposed through Expo Modules, parses them with user-configurable regex rules stored in the DB, and auto-creates transactions. iOS uses a share extension and manual entry as fallbacks. Multi-currency (LAK / THB / USD) with FX snapshotted at write time. Supabase Edge Functions run cron jobs for FX refresh, recurring transaction creation, and push-notification fan-out.

## Architectural rules to preserve when adding code

- **Local SQLite is the source of truth at runtime.** UI never blocks on the network. All writes go through SQLite + outbox before reaching Supabase. Don't introduce direct-to-server write paths.
- **Sync uses a custom outbox + delta-pull + Realtime subscription**, not WatermelonDB or PowerSync. Conflicts resolve last-write-wins via `sync_version` (monotonic per row) and a Postgres trigger that rejects stale writes with SQLSTATE `PT401`.
- **Money is integer micro-units (×10000) in SQLite, `numeric(18,4)` in Postgres.** Never use JS floats for amounts.
- **`amount_base` is denormalised** (snapshot of `amount * fx_rate_to_base` at write time). Reports read it directly; recomputing is an explicit migration step on base-currency change.
- **Soft deletes only** on synced tables (`deleted_at IS NOT NULL`). Hard deletes break sync propagation.
- **RLS on every user-scoped table**, single `owner_all` policy filtering on `user_id = auth.uid()`.
- **Notification parse rules live in the database**, not in code. The app ships with a tester UI; never hard-code BCELOne regexes in TypeScript.
- **Repository layer over SQLite, zustand for UI state.** No Redux. React Query is only for non-synced server-only calls.

## Planned project layout

See spec §11 for the full tree. Top level will be:

```
app/         Expo Router screens
src/         db, sync, domain, ui, native, store, lib
supabase/    migrations, edge functions, seed.sql
android/     prebuild + Kotlin notif module
ios/         prebuild
e2e/         Maestro flows
docs/        specs and design docs
```

## Commands

None yet — tooling will be set up at the start of implementation. When `package.json` is added, update this section with the actual `dev`, `build`, `test`, and `lint` commands rather than guessing.

## Workflow

This project uses the `superpowers` skill set. The current state of the brainstorming workflow:

- Spec written and committed.
- Next step: invoke `superpowers:writing-plans` to produce the implementation plan from the spec.

Don't start coding until a written plan exists.
