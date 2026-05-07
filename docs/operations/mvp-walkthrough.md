# MVP Manual Walkthrough Checklist

**Status: AWAITING USER**

Run on a physical device (iOS or Android) after `npx expo prebuild --clean && npx expo run:ios` (or `run:android`).

## Steps

- [ ] 1. Sign up with a new email address; confirm onboarding flow starts automatically.
- [ ] 2. Pick **LAK** as base currency; create a "BCEL Savings" bank account.
- [ ] 3. Tap the **+** floating button; add a **50,000 LAK** Food expense. Confirm it saves and navigates back.
- [ ] 4. Open the **Transactions** tab; verify the row is visible with correct amount and category.
- [ ] 5. Pull-to-refresh on the **Home** tab; confirm the "This month" total updates to 50,000 LAK.
- [ ] 6. Kill the app completely; reopen it. Confirm data persists (row and total still visible).
- [ ] 7. Enable **Airplane mode**; log a **10,000 LAK** expense. Confirm the row appears immediately in the Transactions tab.
- [ ] 8. Restore network connectivity; wait ~10 seconds; verify the outbox has drained by inspecting the `transactions` table in the Supabase dashboard — both rows should be present.

## Notes

- FX rates default to 1:1 (LAK→LAK) when no rates are seeded. This is expected for MVP.
- If onboarding does not complete, check that `onboarding` store `completed` flag is persisted correctly.
