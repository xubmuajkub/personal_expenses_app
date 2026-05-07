import { Platform, View, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { color, space } from '@/ui/theme';

export default function AndroidNotifPermission() {
  function open() {
    if (Platform.OS === 'android') {
      void Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1, padding: space(6), justifyContent: 'center' }}>
        <Text variant="display3" style={{ marginBottom: space(2) }}>
          BCEL auto-capture
        </Text>
        <Text variant="body" tone="muted" style={{ marginBottom: space(6) }}>
          We need access to notifications to read BCELOne alerts and turn them into transactions.
          Toggle the app on in the next screen.
        </Text>
        <Button title="Open notification access settings" onPress={open} />
        <View style={{ height: space(3) }} />
        <Button
          title="Next"
          variant="secondary"
          onPress={() => router.push('/(onboarding)/android-battery-opt')}
        />
      </View>
    </SafeAreaView>
  );
}
