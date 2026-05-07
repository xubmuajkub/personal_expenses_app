import { View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { color, space } from '@/ui/theme';

export default function Welcome() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1, padding: space(6), justifyContent: 'center' }}>
        <Text variant="display2" style={{ marginBottom: space(4) }}>
          Welcome
        </Text>
        <Text variant="bodyLg" tone="muted" style={{ marginBottom: space(8) }}>
          Track your expenses across BCEL, cash, and other accounts. Multi-currency. Offline-first.
        </Text>
        <Button
          title="Get started"
          onPress={() => router.push('/(onboarding)/pick-base-currency')}
        />
      </View>
    </SafeAreaView>
  );
}
