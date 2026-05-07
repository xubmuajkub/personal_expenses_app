import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false,
    shouldShowBanner: true, shouldShowList: true,
  }),
});

export async function ensureNotifPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return !!req.granted;
}

export async function scheduleDailyNudge(hour = 20, minute = 0): Promise<string> {
  const ok = await ensureNotifPermission();
  if (!ok) throw new Error('notification permission denied');
  await Notifications.cancelScheduledNotificationAsync('daily-nudge').catch(() => {});
  const id = await Notifications.scheduleNotificationAsync({
    identifier: 'daily-nudge',
    content: { title: "Log today's spend", body: 'Tap to add a transaction' },
    trigger: Platform.OS === 'android'
      ? { type: SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'reminders' }
      : { type: SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  return id;
}

export async function cancelDailyNudge(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('daily-nudge').catch(() => {});
}

export async function fireBudgetAlert(args: {
  category_name: string; threshold: 80 | 100; spend: string; limit: string;
}): Promise<void> {
  const ok = await ensureNotifPermission();
  if (!ok) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: args.threshold === 100 ? `${args.category_name} budget exceeded` : `${args.category_name} 80%`,
      body: `${args.spend} of ${args.limit}`,
    },
    trigger: null,
  });
}
