import { View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Gradient, Pulse } from '@/ui/atoms';
import { color, space } from '@/ui/theme';

export default function Welcome() {
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Gradient
        preset="hero"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Pulse
        color={color.pulseLilac}
        size={360}
        opacity={0.5}
        blur={60}
        style={{ position: 'absolute', top: -100, left: -80 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: space(6), justifyContent: 'center' }}>
          <Text variant="display2" tone="onPulse" style={{ marginBottom: space(4) }}>
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
    </View>
  );
}
