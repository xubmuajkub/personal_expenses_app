import { useEffect, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { color, space, shadow } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { openDb } from '@/db/sqlite';
import { getProfile } from '@/db/repos/profiles';
import { computeBalances, type AccountBalance } from '@/domain/balances';
import { format } from '@/domain/money';
import type { Currency } from '@/domain/types';

export default function AccountsIndex() {
  const userId = useAuth((s) => s.user?.id)!;
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [base, setBase] = useState<Currency>('LAK');
  const [totalBase, setTotalBase] = useState(0);

  useEffect(() => {
    void (async () => {
      const db = await openDb();
      const [profile, computed] = await Promise.all([
        getProfile(db, userId),
        computeBalances(db, userId),
      ]);
      const baseCurrency: Currency = (profile?.base_currency ?? 'LAK') as Currency;
      setBase(baseCurrency);
      const computed2 = await computeBalances(db, userId, baseCurrency);
      setBalances(computed2);
      const total = computed2.reduce((sum, b) => sum + b.balance_base_micro, 0);
      setTotalBase(total);
    })();
  }, [userId]);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {/* Total strip */}
      <View
        style={{
          paddingTop: space(14),
          paddingBottom: space(6),
          paddingHorizontal: space(5),
          backgroundColor: color.fg,
        }}
      >
        <Text variant="caption" tone="onDark" caps>Total balance</Text>
        <Text variant="display1" tone="onDark" style={{ marginTop: space(1) }}>
          {format(totalBase, base)}
        </Text>
      </View>

      <FlatList
        data={balances}
        keyExtractor={(item) => item.account_id}
        contentContainerStyle={{ paddingBottom: space(20) }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/accounts/${item.account_id}`)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: space(4),
              paddingHorizontal: space(5),
              borderBottomWidth: 1,
              borderBottomColor: color.hairline,
            }}
          >
            <View style={{ flex: 1, marginRight: space(3) }}>
              <Text variant="bodyLg">{item.account_name}</Text>
              <Text variant="caption" tone="muted" style={{ marginTop: space(0.5) }}>
                {item.currency}
              </Text>
            </View>
            <Text variant="display3">{format(item.balance_micro, item.currency)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ padding: space(8), alignItems: 'center' }}>
            <Text variant="body" tone="muted">No accounts yet.</Text>
          </View>
        }
      />

      {/* Floating + button */}
      <View
        style={{
          position: 'absolute',
          bottom: space(8),
          right: space(5),
          ...shadow.s2,
        }}
      >
        <Button title="+" onPress={() => router.push('/accounts/new')} variant="accent" />
      </View>
    </View>
  );
}
