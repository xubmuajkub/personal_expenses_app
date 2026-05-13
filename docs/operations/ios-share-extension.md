# iOS Share Extension

The `PersonalExpensesShare` share extension lets you share plain text from any iOS app directly into the expense tracker's "Add transaction" screen.

## How it works

1. From any iOS app (Safari, Messages, Notes, etc.), tap **Share** and choose **Personal Expenses**.
2. The extension grabs the shared text and opens the host app via `personalexpenses://share?text=<urlencoded-text>`.
3. The app's root layout intercepts that URL and pushes `/txn/new?prefill=<text>`.
4. The new-transaction screen attempts to parse the text using your notification parse rules (with `app_package: manual`). If a rule matches, the amount, currency, and merchant are auto-filled. Otherwise, the raw text populates the note field.

## Setup after cloning

Run prebuild and open Xcode once:

```bash
npx expo prebuild --clean
open ios/personalexpenses.xcworkspace
```

Xcode may regenerate `MainInterface.storyboard` — let it.

## Auto-fill with parse rules

The share extension path uses `app_package: manual` when calling the notif parser. To enable automatic amount/currency/merchant extraction from shared text:

1. Open the app and go to **Settings > Notification Parse Rules**.
2. Create a new rule with:
   - **App package**: `manual`
   - **Regex**: a pattern that matches the text you commonly share (e.g. `(\d[\d,\.]+)\s*(LAK|THB|USD)`)
   - **Field map**: `{ "amount": "$1", "currency": "$2" }`
3. Save. The next time you share matching text, the fields will auto-populate.

If no rule matches, the full text lands in the **Note** field so you can fill in the rest manually.

## Bundle identifier

The extension uses bundle ID `online.dolemi.peapp.share`. Ensure your Apple Developer provisioning profile covers it (add the extension App ID in the Apple Developer portal if needed).
