# Google OAuth setup

## Prerequisites

- GCP project linked to the Supabase project.
- Supabase project ref: `djlnshaigsrxphasosow`.

## Step 1 — Create OAuth client IDs in Google Cloud Console

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create **three** OAuth 2.0 client IDs:

   | Type    | Settings                                                                                             |
   |---------|------------------------------------------------------------------------------------------------------|
   | **iOS** | Application type: iOS; Bundle ID: `online.dolemi.peapp`                                             |
   | **Android** | Application type: Android; Package: `online.dolemi.peapp`; SHA-1 from `eas credentials`     |
   | **Web** | Application type: Web; Authorised redirect URI: `https://djlnshaigsrxphasosow.supabase.co/auth/v1/callback` |

3. Note the client IDs (and the Web client secret).

## Step 2 — Enable Google provider in Supabase

1. Go to Supabase → Authentication → Providers → Google.
2. Toggle **Enabled**.
3. Paste the **Web client ID** and **Web client secret**.
4. Save.

## Step 3 — Populate .env

```
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS=<ios-client-id>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_ANDROID=<android-client-id>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB=<web-client-id>.apps.googleusercontent.com
```

## Redirect URIs

- iOS: `personalexpenses://`
- Android: `personalexpenses://`
- Supabase callback: `https://djlnshaigsrxphasosow.supabase.co/auth/v1/callback`

## Testing

After configuring, the "Continue with Google" button on the sign-in screen will launch the browser flow. Without these keys set, `signInWithGoogle()` throws:

```
Google OAuth is not configured. Set EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB in .env ...
```

This error is surfaced in the UI so the user knows what to fix.
