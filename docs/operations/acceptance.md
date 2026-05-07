# Acceptance Checklist — v1.0.0

Run on a physical device (iOS and Android) after `eas build --profile preview` or `npx expo run:ios / run:android`. Tick each item before tagging the release.

**Spec reference:** [§12 Acceptance criteria](../superpowers/specs/2026-05-07-personal-expenses-design.md#12-acceptance-criteria)

---

## Checklist

- [ ] **1. Auth & onboarding** — Sign up via email or Google. Complete the three-step onboarding (pick base currency → create first account → grant Android notification permission). Arrive at the Home tab.

- [ ] **2. Manual entry** — Log an expense in fewer than three taps from the Home screen. Confirm it appears in the transactions list immediately. Kill and reopen the app — the row persists.

- [ ] **3. Multi-currency** — Log a THB expense with base currency set to LAK. Confirm the dashboard shows the LAK-equivalent using the stored rate.

- [ ] **4. Multi-account + transfer** — Create three accounts. Transfer LAK → THB across two accounts. Verify both account balances update correctly (debit on source, credit on destination).

- [ ] **5. Sync (online)** — Log a transaction on device A while online. Within 30 seconds, confirm it appears on device B after B goes online.

- [ ] **6. Conflict resolution** — Edit the same transaction on two devices while both are offline. Bring both online. Confirm last-write-wins resolves the conflict with no data loss. Verify the Supabase trigger rejects stale writes (SQLSTATE `PT401`).

- [ ] **7. BCELOne notification capture (Android)** — Simulate a BCELOne notification matching a configured parse rule. Confirm a transaction is auto-created with the correct category (via merchant rule). The 5-second undo toast fires and, if tapped, rolls back the transaction.

- [ ] **8. Notification rule tester** — Paste raw notification text into the tester in Notification Rules → Edit Rule. Edit the regex. Confirm the extraction preview updates live.

- [ ] **9. Categories & budgets** — Edit a seeded category name. Set a monthly budget. Log expenses to reach 80% of the budget → confirm a local notification fires. Reach 100% → confirm a push notification arrives on a second device.

- [ ] **10. Recurring transactions** — Create a monthly **auto** rule (e.g., rent). Advance the clock or trigger the Edge Function manually → confirm the transaction auto-appears. Create a monthly **confirm** rule (e.g., gym) → confirm the notification fires and tapping "Confirm" logs the transaction.

- [ ] **11. Receipts** — Attach a photo to a transaction. Confirm it appears in the detail view. Log the transaction offline; restore network; confirm the receipt syncs and appears on a second device.

- [ ] **12. Reports** — Open Reports. Verify: monthly pie chart, 12-month bar trend, savings rate gauge, and custom date range selector all reflect current data.

- [ ] **13. Search/filter** — Search by note text and merchant name. Apply filter chips (date range, category, account, amount range, source, kind). Confirm results are correct.

- [ ] **14. Export/restore** — Export filtered CSV; open in Sheets/Excel; verify columns and values. Export JSON backup. Wipe local data (or use a fresh device). Restore from JSON; confirm all transactions are present.

- [ ] **15. iOS parity** — Repeat items 1–6 and 8–14 on an iOS device. Verify the iOS share extension receives text from another app and prefills the new transaction form.

---

## Sign-off

| Tester | Platform | Date | Result |
|--------|----------|------|--------|
|        | iOS      |      |        |
|        | Android  |      |        |
