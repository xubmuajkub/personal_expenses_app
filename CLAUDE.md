# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

v1.1.0 in development (Soft Pulse UI refactor on `feat/soft-pulse-ui`). v1.0.0 shipped (tag + notes). Codebase is implemented; read existing code in `src/` and `app/` before suggesting changes.

## Authoritative specs

- Functional: [`docs/superpowers/specs/2026-05-07-personal-expenses-design.md`](docs/superpowers/specs/2026-05-07-personal-expenses-design.md) — scope, architecture, data model, sync semantics, acceptance criteria. §14 "Decision log" records every Q/A from brainstorming; defer to it rather than inventing alternatives.
- UI / visual language: [`docs/superpowers/specs/2026-05-13-soft-pulse-ui-refactor-design.md`](docs/superpowers/specs/2026-05-13-soft-pulse-ui-refactor-design.md) — Soft Pulse: dark midnight base, neon pulse blob accents, dark frosted glass surfaces via `expo-blur`. Atoms live in `src/ui/atoms/` (Glass, Pulse, Surface, Gradient, Stack). Tokens in `src/ui/theme.ts`; **no inline color or font literals** in screens — always import from `theme`. The prior cream/aurora spec [`2026-05-07-personal-expenses-ui.md`](docs/superpowers/specs/2026-05-07-personal-expenses-ui.md) is superseded.

Implementation plan: [`docs/superpowers/plans/2026-05-07-personal-expenses.md`](docs/superpowers/plans/2026-05-07-personal-expenses.md). Task 0.4 establishes the design tokens; every UI task downstream consumes them.

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
- **`TxnRow` MUST NOT be wrapped in `<Glass>`.** BlurView in a long list destroys scroll performance on Android. `TxnRow` renders on `<Surface variant="flat">`. See [`docs/superpowers/specs/2026-05-13-soft-pulse-ui-refactor-design.md`](docs/superpowers/specs/2026-05-13-soft-pulse-ui-refactor-design.md) §9 and the comment at the top of `src/ui/TxnRow.tsx`.
- **Hand-built UI primitives only.** No NativeBase, Tamagui, RN Paper, Magnus, UI Kitten, or any component framework. All primitives live under `src/ui/`; icons via `lucide-react-native`; backdrop blur via `expo-blur`.

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

- `npm start` — Expo dev server (dev-client)
- `npm run ios` / `npm run android` — native run via Expo
- `npm test` — Jest (jest-expo preset, runInBand)
- `npm run lint` — ESLint, fails on any warning
- `npm run typecheck` — `tsc --noEmit` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- `npm run format` — Prettier write

## Workflow

This project uses the `superpowers` skill set. New work goes through brainstorming → spec → plan → execution (subagent-driven). Don't start coding without a committed plan in `docs/superpowers/plans/`.
