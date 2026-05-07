import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getSupabase } from './supabase';
import { env } from './env';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT = AuthSession.makeRedirectUri({ scheme: 'personalexpenses' });

/**
 * Initiates Google OAuth sign-in via Supabase.
 *
 * IMPORTANT: requires EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB (and platform IDs)
 * to be set in .env. See docs/operations/google-oauth-setup.md for setup steps.
 *
 * Throws a clear error if keys are missing rather than silently failing.
 */
export async function signInWithGoogle(): Promise<void> {
  // Validate that Google OAuth is configured before attempting.
  const webClientId = env.GOOGLE_OAUTH_CLIENT_ID_WEB;
  if (!webClientId) {
    throw new Error(
      'Google OAuth is not configured. Set EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB in .env ' +
      'and follow docs/operations/google-oauth-setup.md to complete setup.',
    );
  }

  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: REDIRECT, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('no oauth url returned from Supabase');

  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled or failed');
  }

  const url = new URL(result.url);
  const params = new URLSearchParams(url.hash.slice(1) || url.search.slice(1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) {
    throw new Error('no tokens in OAuth callback — check redirect URI configuration');
  }

  const { error: setErr } = await sb.auth.setSession({ access_token, refresh_token });
  if (setErr) throw setErr;
}
