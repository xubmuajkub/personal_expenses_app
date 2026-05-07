# Personal Expense Tracker — Design

**Date:** 2026-05-07
**Status:** Spec, awaiting implementation plan
**Owner:** jasoncruises@gmail.com

## 1. Purpose

A solo personal expense tracker for iOS and Android. Primary capture path on Android is automatic, by reading push notifications from the BCELOne banking app (Lao). On iOS the app is manual-entry plus a share-sheet fallback. Data syncs via Supabase across devices and supports full offline use.

The app is intentionally a single solo-user application: no shared budgets, no bill-pay, no investment tracking.

## 2. Goals and non-goals

### Goals

- Capture expenses with minimal friction. Quick-add reachable in <3 taps from home.
- Auto-capture BCELOne notifications on Android with configurable, user-tunable parsing rules.
- Multi-currency: LAK, THB, USD. User-configurable base currency (default LAK). FX snapshotted at write time.
- Multi-account with cross-account transfers, including cross-currency.
- Budgets: monthly per-category with 80% / 100% alerts.
- Recurring expenses: per-rule choice between auto-create and confirm-first.
- Receipts: attach photo per transaction.
- Reports dashboard: pie by category, monthly trends, savings rate, custom date range.
- Offline-first: full read/write offline, sync on reconnect.
- Export CSV; JSON backup and restore.
- Search transactions; filter by date, category, account, amount, source.

### Non-goals

- Investment/asset tracking (stocks, crypto).
- Bill payment execution.
- Direct bank API integration. BCEL has no public API.
- Multi-user / shared budgets.
- Web application.
- ML-based auto-categorisation (rule-based only).
- OCR on receipts.
- Tagging beyond category.

## 3. High-level architecture

```
+---------------------------------------------------------+
|  Mobile app (React Native + Expo dev build)             |
|  +-----------+  +-------------+  +--------------------+ |
|  | UI screens|  | Domain logic|  | Sync engine        | |
|  | Expo      |--| TS modules  |--| outbox + pull      | |
|  | Router    |  |             |  |                    | |
|  +-----------+  +-------------+  +--------------------+ |
|        |              |                  |              |
|        +--------------+------------------+              |
|                       v                                 |
|              +-----------------+                        |
|              | expo-sqlite     |  local source of truth |
|              | (encrypted)     |                        |
|              +-----------------+                        |
|  Android-only:                                          |
|  +-------------------------------------------+          |
|  | NotificationListenerService (Kotlin)      |--+       |
|  | -> Expo Modules bridge -> notif-capture   |  |       |
|  +-------------------------------------------+  |       |
+--------------------------------------------------+------+
                                                  |
                  +-------------------------------+
                  v  network
+----------------------------------------------------------+
|  Supabase                                                |
|  +-----------+  +---------+  +-----------------------+   |
|  | Postgres  |  | Auth    |  | Storage               |   |
|  | (synced   |  | email + |  | receipt photos        |   |
|  |  tables)  |  | Google  |  |                       |   |
|  +-----------+  +---------+  +-----------------------+   |
|  +----------------------------------------------------+  |
|  | Edge Functions (cron):                             |  |
|  |   fx-rates-cron        daily 00:10 UTC             |  |
|  |   recurring-engine-cron hourly                     |  |
|  |   push-notif-fanout    triggered                   |  |
|  +----------------------------------------------------+  |
|  Realtime subscriptions for live row updates             |
+----------------------------------------------------------+
```

Principles:

- Local SQLite is the source of truth for the running app. UI never blocks on the network.
- All writes hit SQLite first, are queued in `outbox`, then drained to Supabase opportunistically.
- Pulls combine Supabase Realtime (live, while app open) with a delta fetch on app start.
- Server cron jobs handle FX fetch, recurring auto-create, push fan-out.
- The Android notification listener is a native module exposed to JS through the Expo Modules API.

## 4. Stack and key dependencies

- **Mobile:** React Native + Expo (dev build, not managed workflow — required for native notif module).
- **Routing:** Expo Router (file-based).
- **Local DB:** expo-sqlite, encrypted (SQLCipher passphrase via expo-secure-store).
- **Remote:** Supabase (Postgres, Auth, Storage, Realtime, Edge Functions).
- **Connectivity:** @react-native-community/netinfo.
- **State:** zustand for UI state; thin repository layer over SQLite for data.
- **Auth:** Supabase Auth — email+password and Google OAuth (via expo-auth-session).
- **Push:** Expo Push Notifications, fan-out from Supabase Edge Function.
- **Local notifications:** expo-notifications.
- **Charts:** Victory Native (or react-native-gifted-charts; final pick at impl time).
- **FX:** exchangerate.host (free), refreshed daily by Edge Function; manual override per txn.
- **Crash reporting:** Sentry (free tier).
- **E2E:** Maestro.
- **Native (Android):** Kotlin, Expo Modules API, NotificationListenerService.

No Redux. No React Query for synced data (SQLite is the cache). React Query may be used only for non-synced server-only calls.

## 5. Data model

All synced tables share these columns: `id` (uuid), `user_id` (uuid, FK to `auth.users`), `created_at`, `updated_at`, `deleted_at` (soft delete), `sync_version` (integer, monotonically increasing per row).

```
users (managed by Supabase Auth)
  id, email, display_name, base_currency (default 'LAK')

accounts
  id, user_id, name, type (cash | bank | credit_card | other),
  currency (LAK | THB | USD), opening_balance, archived

categories
  id, user_id, name, icon, color,
  kind (expense | income), archived
  -- seeded on first login: Food, Transport, Bills, Health,
  --   Shopping, Entertainment, Transfer, Salary, Other

transactions
  id, user_id, account_id, category_id (nullable for transfers),
  kind (expense | income | transfer),
  amount (numeric, in native currency),
  currency (LAK | THB | USD),
  fx_rate_to_base (numeric, snapshot at write time),
  amount_base (numeric, computed: amount * fx_rate_to_base),
  occurred_at (timestamptz),
  merchant (text, nullable),
  note (text, nullable),
  receipt_url (text, nullable),
  source (manual | notif | recurring | import),
  source_ref (text, nullable)         -- e.g. notif key for dedup

transfers
  id, user_id, from_txn_id, to_txn_id,
  fx_rate (only when cross-currency)

budgets
  id, user_id, category_id,
  month (date, first-of-month),
  limit_amount, limit_currency

merchant_rules                          -- auto-categorisation
  id, user_id, pattern (text or regex),
  category_id, account_id (nullable),
  hit_count, last_used_at

notif_parse_rules                       -- BCELOne parser config
  id, user_id, app_package (e.g. 'la.bcel.bcelone'),
  regex (text),
  field_map (jsonb: {amount: '$1', currency: '$2', merchant: '$3'}),
  priority (int), enabled (bool)

recurring_rules
  id, user_id,
  template_txn (jsonb: account_id, category_id, amount,
    currency, note, merchant, kind),
  cadence (cron-style or 'monthly_day_N' / 'weekly_dow_N'),
  mode (auto | confirm),
  next_run_at (timestamptz),
  end_date (nullable)

fx_rates                                -- daily cache
  date (date), from_curr, to_curr, rate
  PRIMARY KEY (date, from_curr, to_curr)

push_tokens
  id, user_id, expo_token, platform (ios | android), last_seen_at

raw_notifs                              -- LOCAL ONLY (SQLite)
  id, package, title, text, posted_at, key,
  processed (bool), parsed_txn_id (nullable)
  -- ring-buffered to last 200 entries for parser tuning

outbox                                  -- LOCAL ONLY (SQLite)
  id, op (insert | update | delete),
  table_name, row_id, payload (json),
  enqueued_at, attempts, last_error
```

### Money representation

- Postgres: `numeric(18,4)`.
- SQLite: integer micro-units (×10000) to avoid JS float drift.
- Display: per-currency formatter (LAK no decimals; THB and USD two decimals).

### Soft delete

`deleted_at IS NOT NULL` filters out from queries. Required so deletion propagates correctly across devices over the sync layer.

### RLS

Every user-scoped table enables RLS with a single policy:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON <table>
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### sync_version enforcement

A trigger on every synced table rejects stale writes:

```sql
CREATE OR REPLACE FUNCTION enforce_sync_version() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.sync_version <= OLD.sync_version THEN
    -- custom SQLSTATE in user-defined class 'PT' to avoid clashing
    -- with built-in serialization_failure (40001) auto-retry behaviour
    RAISE EXCEPTION 'stale_write' USING ERRCODE = 'PT401';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;
```

Client treats `PT401` as "re-pull row, merge, retry".

## 6. Sync engine

### Write path

```
UI action
  -> SQLite transaction:
       insert/update/delete domain row (sync_version++)
       insert outbox row
  -> kick sync worker
```

### Sync worker

A singleton, triggered on app start, on network-up, and after each write.

```
1. Auth: abort if no session.
2. Drain outbox in FIFO order:
   for each row:
     call Supabase REST (insert/update/delete on table)
     on success: delete outbox row
     on 4xx (validation/RLS): mark failed, log, skip
     on 5xx/network: bump attempts, exponential backoff, stop cycle
3. Pull deltas:
   for each synced table:
     SELECT * FROM <table>
       WHERE updated_at > local.last_sync_<table>
       INCLUDING soft-deleted rows
     upsert into SQLite, comparing sync_version
       (remote wins when remote.sync_version >= local.sync_version)
     update local.last_sync_<table> = max(updated_at)
4. Subscribe to Realtime channel for live updates while app is open.
```

### Conflict resolution

Last-write-wins via `updated_at` and `sync_version`. Acceptable because the app is solo-user; same row touched offline on two devices simultaneously is rare.

### Outbox guarantees

- At-least-once delivery; server ops are idempotent via `id` and `sync_version` checks.
- FIFO ordering ensures parents (accounts, categories) are flushed before children (transactions).

### Receipt uploads

Receipt photos are uploaded as part of the same outbox sequence as the parent transaction. The local row stores a `pending-<uuid>` URL until the upload succeeds, then the canonical URL is patched in.

### Cold-start recovery

Outbox rows survive process death. On next launch the sync worker resumes draining.

## 7. BCELOne notification capture (Android)

### Native module

A Kotlin module wraps `NotificationListenerService` and exposes events through the Expo Modules API.

```
NotificationListenerService.onNotificationPosted(sbn)
  filter sbn.packageName against user's allowed list
    (default: 'la.bcel.bcelone'; user can extend)
  extract title, text, bigText, postTime, key
  emit JS event 'notif:received'
    { package, title, text, postedAt, key }
  also persist raw notif into local raw_notifs table
```

### JS handler

```
onNotifReceived(raw):
  1. Dedup: skip if raw_notifs.key already processed.
  2. Fetch enabled notif_parse_rules for raw.package, ordered by priority.
  3. For each rule: regex match against raw.text. First match wins.
  4. If no rule matches:
       create txn { kind=expense, amount=null, status=unparsed }
       fire local notif: "New BCEL alert — tap to log"
       return.
  5. Match found:
       extract fields via field_map (amount, currency, merchant)
       resolve account_id (rule.account_id or default BCEL account)
       snapshot fx_rate
       set source='notif', source_ref=raw.key
  6. Auto-categorise:
       merchant_rules pattern match -> category_id
       else most-recent txn for same merchant -> category_id
       else null and mark for review.
  7. Write txn (goes through outbox).
  8. Local notif with 5-second undo + deep-link to edit.
```

### Permissions UX

- First-run wizard explains why notification access is needed and deep-links to Settings → Notification access.
- Permission state is rechecked on each app start; banner appears if revoked.
- A second wizard step covers OEM battery optimisation, which kills background services on Xiaomi/Oppo/Huawei devices.

### iOS fallback

- Share extension: BCELOne notif → swipe → Share → "Log to ExpenseTracker" → opens app with pre-filled add screen.
- Manual entry available everywhere.

### Parser tuning

`raw_notifs` keeps the last ~200 raw notifications. Settings → Notif rules provides:

- A list of rules with priority and enable toggle.
- A tester pane: paste raw text or pick from `raw_notifs`, tap "Test rule", see extraction live.

This lets the user fix parsing without rebuilding the app.

### Dedup against manual entries

Heuristic: a notif-sourced txn is a likely duplicate of an existing manual txn if `(account_id, amount, occurred_at ± 5 min)` match. On collision, prompt the user to merge or keep both.

## 8. Screens and navigation

Expo Router file-based layout:

```
app/
  (auth)/
    sign-in.tsx              email+pw + Google button
    sign-up.tsx
    forgot-password.tsx
  (onboarding)/
    welcome.tsx
    pick-base-currency.tsx
    create-first-account.tsx
    android-notif-permission.tsx     (Android only)
    android-battery-opt.tsx          (Android only)
  (tabs)/
    index.tsx                Home / dashboard
    transactions.tsx         List + search/filter
    add.tsx                  Quick-add tab
    budgets.tsx              Per-category bars + alerts
    more.tsx                 Settings hub
  txn/
    [id].tsx                 Detail / edit
    new.tsx                  Full add form
  transfer/
    new.tsx                  From/to account, amounts, FX
  accounts/
    index.tsx                List with balances
    [id].tsx                 Account detail + history
    new.tsx
  categories/
    index.tsx
    [id].tsx
  recurring/
    index.tsx                List
    [id].tsx                 Edit
    new.tsx
  reports/
    index.tsx                Dashboard
    trends.tsx               6/12-month line
    by-category.tsx          Pie + drill-down
    savings-rate.tsx         Income vs expense
  settings/
    index.tsx
    profile.tsx
    base-currency.tsx
    notif-rules.tsx          BCEL rule editor + tester
    merchant-rules.tsx
    fx.tsx                   Manual rate override
    data.tsx                 Export CSV / JSON / Restore
    about.tsx
  _layout.tsx                Root: auth gate, theme, providers
```

### Quick-add (most-used flow)

```
Tap "+" tab
  -> Modal sheet slides up:
       amount input (numeric keypad shown)
       currency chip (last-used default)
       account chip
       category chip
       [Save]   [More fields -> opens full form]
```

Target: log an expense in fewer than three taps from home.

### Dashboard

- This-month spend in base currency, with delta vs last month.
- Budget rings per category with % used.
- Five most recent transactions.
- Account balances strip.
- Pending recurring confirms (if any).
- Unparsed notifs (if any) — "Tap to categorise".

### Search and filter

In the transactions tab:

- Search bar matches `note` and `merchant`.
- Filter chips: date range, category, account, amount range, source, kind.
- Filter state persists for the session.

## 9. Server logic (Edge Functions)

### fx-rates-cron — daily, 00:10 UTC

```
fetch https://api.exchangerate.host/latest?base=USD&symbols=LAK,THB,USD
upsert today's row into fx_rates with cross-rates
  (LAK<->THB, LAK<->USD, THB<->USD)
on API failure: copy yesterday's row
```

Clients pull `fx_rates` via the standard sync path. New transactions snapshot the day's rate; users can override per transaction.

### recurring-engine-cron — hourly

```
SELECT * FROM recurring_rules
  WHERE enabled
    AND next_run_at <= now()
    AND (end_date IS NULL OR end_date > now())
for each rule:
  if mode = auto:
    insert transaction from template_txn
    advance next_run_at to next occurrence
  if mode = confirm:
    enqueue push: "Confirm: <name>"
    do not advance next_run_at until user confirms
    (mark notified to suppress re-fire)
```

### push-notif-fanout — triggered

A Postgres trigger on `transactions` recomputes the current month's spend per category. When it crosses the 80% or 100% budget threshold (compared to `last_alert_threshold` per user/category/month), it inserts into `push_queue`. The Edge Function drains `push_queue`, looks up `push_tokens` for the user, and posts to the Expo Push API.

### Local notifications

Used in addition to push so behaviour works offline:

- Daily logging nudge (8 PM device-local, opt-in).
- Recurring confirm reminders.
- Budget threshold alerts when crossing detected on-device after sync.

### Why both push and local for budgets

- Local fires immediately on crossing, even offline.
- Push covers the case where another device caused the crossing while this device was offline; push arrives once it reconnects.

## 10. Cross-cutting concerns

### Time

- `occurred_at` stored UTC, displayed in device-local timezone.
- "This month" uses device-local TZ boundaries; reports label the timezone in use.

### State management

- zustand for UI state (modals, filters, current selection).
- A repository layer (`getTxns(filter)`, `addTxn(input)`, …) wraps SQLite. UI subscribes via SQLite change listeners or zustand selectors.

### Error handling

- Sync errors retry silently with backoff. After N consecutive failures a banner surfaces ("Sync issue — tap for details").
- User-facing errors show a toast with an optional report deep-link.
- Crash reporting via Sentry.

### Logging

- Local ring buffer (~1000 lines) exportable from Settings → Data.
- No PII in logs by default; opt-in verbose mode.

### Security

- Supabase Auth handles tokens; refresh handled by SDK.
- Local SQLite is encrypted via SQLCipher. Passphrase derived from a per-device secure-store random key plus the Supabase user id.
- Receipt photos uploaded over HTTPS to a private Storage bucket; access via signed URLs only.
- No third-party analytics SDKs that exfiltrate financial data.

### Testing strategy

- **Unit (Jest):** pure logic — FX math, recurring date calculation, regex parser, sync conflict resolver, budget threshold detector.
- **Integration (Jest + in-memory SQLite + local Supabase Docker):** outbox flush, pull merge, RLS round-trip, trigger behaviour for `sync_version`.
- **E2E (Maestro):** onboarding, quick-add, transfer, search/filter, export, restore.
- **Manual:** notification listener (real Android device required), receipt photo capture, Google sign-in, OEM battery-kill behaviour.

### Observability

Edge Function logs go to Supabase. Optional `health` table per device records last-24h crash and sync-failure counts (aggregates only, no row-level data).

## 11. Project layout

```
personal_expenses/
  app/                    Expo Router screens
  src/
    db/                   SQLite schema, migrations, repositories
    sync/                 outbox, pull, conflict, network detection
    domain/               pure logic: fx, recurring, parser, budget
    ui/                   shared components (Button, Sheet, Chip)
    native/               notif-listener bridge (Android)
    store/                zustand stores
    lib/                  Supabase client, formatters, time utils
  supabase/
    migrations/           SQL schema versions
    functions/
      fx-rates-cron/
      recurring-engine-cron/
      push-notif-fanout/
    seed.sql              default categories, etc.
  android/                Expo prebuild output (Kotlin notif module)
  ios/                    Expo prebuild output
  e2e/                    Maestro flows
  docs/
    superpowers/specs/    design docs
  app.config.ts           Expo config
  package.json
  tsconfig.json
```

## 12. Acceptance criteria

1. **Auth & onboarding:** sign up via email or Google, complete onboarding (currency, first account, Android perms), reach home.
2. **Manual entry:** log an expense in fewer than three taps from home; appears in list immediately; survives app restart.
3. **Multi-currency:** log a THB expense with base = LAK, see correct conversion on dashboard using stored rate.
4. **Multi-account + transfer:** create three accounts, transfer LAK→THB across two of them; balances update correctly on both ends.
5. **Sync:** log offline (airplane mode) on device A; bring online; appears on device B within 30s of B going online.
6. **Conflict:** edit the same transaction on two devices offline; both come online; last-write-wins resolves; no data loss; trigger rejects stale writes.
7. **BCELOne notif (Android):** simulate a notification with a configured rule; transaction auto-creates; auto-categorisation hits a merchant rule; 5-second undo works.
8. **Notif rule editor:** paste raw text into the tester, edit regex, see extraction preview update live.
9. **Categories & budgets:** edit seeded categories; set a budget; cross 80% → local notification fires; cross 100% → push notification arrives on a second device.
10. **Recurring:** create a monthly auto rule (rent) → next month's transaction auto-appears; create a monthly confirm rule (gym) → notification fires, confirm logs the transaction.
11. **Receipts:** attach a photo; appears in detail view; survives offline → online sync.
12. **Reports:** monthly pie + 12-month trend + savings rate + custom date range, all reflecting current data.
13. **Search/filter:** full-text on note and merchant; filter chips for date, category, account, amount, source, kind.
14. **Export/restore:** CSV opens correctly in Sheets/Excel; JSON backup, then wipe local DB, then restore — all data intact.
15. **iOS parity:** every scenario above except notification auto-capture works on iOS (share-sheet substitutes).

## 13. Open risks

| Risk | Mitigation |
|---|---|
| BCELOne notification format unsampled at design time | Rules live in DB with tester UI; production rule set is iterated post-launch from real samples |
| OEM battery kill (Xiaomi/Oppo/Huawei) breaks listener | Onboarding step disables battery optimisation; persistent foreground notification keeps service alive; documented |
| Expo dev build complexity for native notif module | Native code is Android-only and small; if Expo Modules API blocks something, fall back to bare workflow on the Android side only |
| exchangerate.host rate quality for LAK | LAK liquidity is low; user can override per-transaction; later, scrape BCEL published rate as fallback |
| Supabase free tier limits (500MB DB, 1GB Storage) | Solo user well under quota for DB; receipt images compressed on upload (target <200KB) |
| Apple review for share extension | Standard share extension; low risk |
| Google sign-in on Expo dev build | expo-auth-session + Google provider, with documented GCP OAuth client setup step |
| Local SQLite encryption key loss | Key stored in expo-secure-store (Keychain/Keystore); cloud is canonical, local re-hydrates from sync if reset |

## 14. Decision log (pinned)

- Q1 platform: iOS + Android (cross-platform).
- Q2 storage: cloud sync via Supabase.
- Q3 users: solo.
- Q4 features: all (income, expense, budgets, multi-currency, recurring, receipts, reports).
- Q5 phasing: single combined spec (user override of suggested phasing).
- Q6 stack: React Native + Expo.
- Q7 auth: email+password and Google.
- Q8 base currency: user-configurable, default LAK.
- Q9 FX: hybrid (auto fetch + per-txn override).
- Q10 BCEL samples: collect post-Phase-1; parser is config-driven.
- Q11 auto-categorise: merchant rules + last-used.
- Q12 categories: seeded default, fully editable.
- Q13 budgets: monthly per-category with 80/100% alerts.
- Q14 recurring: per-rule auto or confirm.
- Q15 receipts: photo only (no OCR).
- Q16 reports: full dashboard.
- Q17 offline: full offline-first.
- Q18 notifications: local + server push.
- Q19 accounts: multi-account + transfers.
- Q20 export: CSV + JSON backup/restore + filters.
- Q21 sync: custom outbox queue (no PowerSync, no WatermelonDB).
