import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getSupabase } from './supabase';

export async function registerPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return;          // simulator skip
  const cur = await Notifications.getPermissionsAsync();
  let granted = cur.granted;
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;
  const projectId = process.env['EXPO_PUBLIC_EAS_PROJECT_ID']; // populated by EAS build
  const tok = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await getSupabase().from('push_tokens').upsert({
    user_id: userId,
    expo_token: tok.data,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    last_seen_at: new Date().toISOString(),
    sync_version: 1,
  }, { onConflict: 'user_id,expo_token' });
}
