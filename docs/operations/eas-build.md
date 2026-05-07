# EAS Build Guide

## Prerequisites

- Expo account (https://expo.dev — free tier is fine)
- EAS CLI: `npm install -g eas-cli`
- Icon assets in place (see `assets/icon.placeholder.md`)

## One-time setup

```bash
eas login            # authenticate with your Expo account
eas build:configure  # creates eas.json with default profiles
```

`eas build:configure` is interactive. Accept the defaults for `development`, `preview`, and `production` profiles. The generated `eas.json` will look roughly like:

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

## Build commands

### Android preview (APK, internal distribution)

```bash
eas build --platform android --profile preview
```

EAS will build in the cloud. When complete, scan the QR code or download the APK directly.

### iOS preview (IPA, internal distribution via TestFlight or ad-hoc)

```bash
eas build --platform ios --profile preview
```

You will be prompted to log in to Apple Developer (requires a paid account for device registration). For purely local testing, use `expo run:ios` instead.

### Both platforms

```bash
eas build --platform all --profile preview
```

## Production build + store submission

```bash
eas build --platform android --profile production
eas submit --platform android   # submits to Google Play

eas build --platform ios --profile production
eas submit --platform ios       # submits to App Store Connect
```

## Local builds (no EAS cloud)

```bash
eas build --platform android --profile preview --local
# Requires Android SDK + Gradle on the local machine.
```

## Environment variables

Secret env vars (Sentry DSN, Supabase keys) should be set in the EAS dashboard under **Project → Secrets**, not committed to the repo.

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
```

## Updating the app (OTA)

For JS-only changes, use Expo Updates (no new store build required):

```bash
eas update --branch production --message "Fix: ..."
```
