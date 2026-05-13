import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { setBaseCurrency } from '@/db/repos/profiles';
import { openDb } from '@/db/sqlite';
import { useAuth } from '@/store/auth';
import { color, radius, space } from '@/ui/theme';
import type { Currency } from '@/domain/types';

const OPTIONS: Currency[] = ['LAK', 'THB', 'USD'];

export default function PickBaseCurrency() {
  const [selected, setSelected] = useState<Currency>('LAK');
  const [loading, setLoading] = useState(false);
  const userId = useAuth((s) => s.user?.id);

  async function next() {
    if (!userId) return;
    setLoading(true);
    try {
      const db = await openDb();
      await setBaseCurrency(db, userId, selected);
      router.push('/(onboarding)/create-first-account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1, padding: space(6), justifyContent: 'center' }}>
        <Text variant="display3" style={{ marginBottom: space(2) }}>
          Reporting currency
        </Text>
        <Text variant="body" tone="muted" style={{ marginBottom: space(5) }}>
          Reports show totals in this currency. You can still log transactions in any currency.
        </Text>

        {OPTIONS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setSelected(c)}
            style={{
              padding: space(3.5),
              borderRadius: radius.md,
              marginBottom: space(2),
              borderWidth: 1,
              borderColor: selected === c ? color.fg : color.hairline,
              backgroundColor: selected === c ? color.glassMed : color.glassSoft,
            }}
          >
            <Text variant="display3" tone={selected === c ? 'fg' : 'muted'}>
              {c}
            </Text>
          </Pressable>
        ))}

        <View style={{ height: space(4) }} />
        <Button title="Continue" onPress={next} loading={loading} />
      </View>
    </SafeAreaView>
  );
}
