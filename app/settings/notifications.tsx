import { useCallback, useState } from 'react';
import { View, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { color, space } from '@/ui/theme';
import { scheduleDailyNudge, cancelDailyNudge } from '@/lib/local_notifs';

const STORAGE_KEY = 'notif_daily_nudge';

export default function NotificationsSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void AsyncStorage.getItem(STORAGE_KEY).then((val) => {
        setEnabled(val === 'true');
        setLoading(false);
      });
    }, []),
  );

  const handleToggle = async (value: boolean) => {
    setEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEY, String(value));
    if (value) {
      await scheduleDailyNudge().catch(() => {
        setEnabled(false);
        void AsyncStorage.setItem(STORAGE_KEY, 'false');
      });
    } else {
      await cancelDailyNudge();
    }
  };

  return (
    <Sheet title="Notifications">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: space(4),
          borderBottomWidth: 1,
          borderBottomColor: color.hairline,
        }}
      >
        <View style={{ flex: 1, marginRight: space(4) }}>
          <Text variant="bodyLg">Daily nudge</Text>
          <Text variant="caption" tone="muted" style={{ marginTop: space(1) }}>
            Remind you to log today&apos;s spending at 8 PM.
          </Text>
        </View>
        {!loading && (
          <Switch
            value={enabled}
            onValueChange={(v) => { void handleToggle(v); }}
            trackColor={{ false: color.hairline, true: color.indigo500 }}
            thumbColor={color.onDarkFg}
          />
        )}
      </View>
    </Sheet>
  );
}
