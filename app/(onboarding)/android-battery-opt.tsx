import { View, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useOnboarding } from '@/store/onboarding';
import { color, space } from '@/ui/theme';

export default function AndroidBatteryOpt() {
  const finish = useOnboarding((s) => s.finish);

  function open() {
    Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
  }

  async function done() {
    await finish();
    router.replace('/');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1, padding: space(6), justifyContent: 'center' }}>
        <Text variant="display3" style={{ marginBottom: space(2) }}>
          Keep notifications working
        </Text>
        <Text variant="body" tone="muted" style={{ marginBottom: space(6) }}>
          Some Android phones aggressively kill background services. Disable battery optimisation
          for this app to make sure BCEL alerts get captured.
        </Text>
        <Button title="Open battery settings" onPress={open} variant="secondary" />
        <View style={{ height: space(3) }} />
        <Button title="Done" onPress={done} />
      </View>
    </SafeAreaView>
  );
}
