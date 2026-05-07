# E2E Test Setup (Maestro)

## Prerequisites

- Node.js 18+
- Maestro CLI
- A running iOS Simulator or Android Emulator (or physical device)
- App built with `npx expo run:ios` or `npx expo run:android`

## Install Maestro CLI

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
# Restart your terminal or add ~/.maestro/bin to PATH
export PATH="$HOME/.maestro/bin:$PATH"
maestro --version   # should print a version string
```

## Run all flows

```bash
bash e2e/run.sh
```

Or run a single flow:

```bash
maestro test e2e/flows/01_signup_onboarding.yaml
```

## Flows

| File | Description |
|------|-------------|
| `01_signup_onboarding.yaml` | Create account → complete onboarding |
| `02_quick_add.yaml`         | Add a 50,000 LAK expense via FAB |
| `03_transfer.yaml`          | Transfer between two accounts |
| `04_offline_sync.yaml`      | Log while offline, verify sync on reconnect |
| `05_export_restore.yaml`    | Export JSON backup and restore |

## Offline sync (flow 04) — manual steps

Maestro cannot toggle airplane mode / system radio programmatically on iOS physical devices or in most emulator configurations.

**Android emulator:**

```bash
# Enable airplane mode
adb shell settings put global airplane_mode_on 1
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true

# Disable airplane mode
adb shell settings put global airplane_mode_on 0
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false
```

**iOS Simulator:** Toggle via Simulator menu → Features → Network Condition → Offline (or use the Network Link Conditioner).

**Physical device:** Toggle manually in Settings → Airplane Mode.

## Verifying sync (flow 04 post-step)

After restoring network, check that the offline transaction appeared in Supabase:

```bash
# Using Supabase CLI
supabase db query "SELECT id, amount, created_at FROM transactions ORDER BY created_at DESC LIMIT 5"
```

## Environment variables for test runs

Set these before running Maestro if your flows use `${ENV_VAR}` substitution:

```bash
export MAESTRO_APP_ID=la.personalexpenses.app
maestro test e2e/flows/01_signup_onboarding.yaml \
  --env RANDOM=$(date +%s)
```
