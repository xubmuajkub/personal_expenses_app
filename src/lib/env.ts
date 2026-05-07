type Required = 'SUPABASE_URL' | 'SUPABASE_ANON_KEY';
type Optional =
  | 'GOOGLE_OAUTH_CLIENT_ID_IOS'
  | 'GOOGLE_OAUTH_CLIENT_ID_ANDROID'
  | 'GOOGLE_OAUTH_CLIENT_ID_WEB'
  | 'SENTRY_DSN';

function read(key: Required | Optional): string | undefined {
  return process.env[`EXPO_PUBLIC_${key}`];
}

export const env = {
  SUPABASE_URL: requireVar('SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireVar('SUPABASE_ANON_KEY'),
  GOOGLE_OAUTH_CLIENT_ID_IOS: read('GOOGLE_OAUTH_CLIENT_ID_IOS'),
  GOOGLE_OAUTH_CLIENT_ID_ANDROID: read('GOOGLE_OAUTH_CLIENT_ID_ANDROID'),
  GOOGLE_OAUTH_CLIENT_ID_WEB: read('GOOGLE_OAUTH_CLIENT_ID_WEB'),
  SENTRY_DSN: read('SENTRY_DSN'),
};

function requireVar(key: Required): string {
  const v = read(key);
  if (!v) throw new Error(`missing env EXPO_PUBLIC_${key}`);
  return v;
}
