import { useCallback, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Ring } from '@/ui/Ring';
import { color, space, shadow } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { openDb } from '@/db/sqlite';
import { monthBudgetStatuses } from '@/domain/budgets';
import { format } from '@/domain/money';
import type { BudgetStatus } from '@/domain/budgets';

function ringColor(threshold: 0 | 80 | 100): string {
  if (threshold >= 100) return color.danger;
  if (threshold >= 80) return color.pink500;
  return color.indigo700;
}

function BudgetRow({ item }: { item: BudgetStatus }) {
  const fill = ringColor(item.threshold);
  return (
    <Pressable
      onPress={() => router.push(`/budgets/${item.budget_id}`)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: space(5),
        paddingVertical: space(4),
        borderBottomWidth: 1,
        borderBottomColor: color.hairline,
      }}
    >
      <Ring value={item.pct} size={56} stroke={5} fillColor={fill}>
        <Text variant="caption" style={{ fontSize: 10 }}>
          {Math.round(item.pct * 100)}%
        </Text>
      </Ring>
      <View style={{ marginLeft: space(4), flex: 1 }}>
        <Text variant="bodyLg">{item.category_name}</Text>
        <Text variant="caption" tone="muted">
          {format(item.spend_micro, 'LAK')} / {format(item.limit_micro, 'LAK')}
        </Text>
      </View>
    </Pressable>
  );
}

export default function BudgetsTab() {
  const userId = useAuth((s) => s.user?.id)!;
  const [statuses, setStatuses] = useState<BudgetStatus[]>([]);

  const load = useCallback(async () => {
    const db = await openDb();
    const results = await monthBudgetStatuses(db, userId, new Date());
    setStatuses(results);
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <FlatList
        data={statuses}
        keyExtractor={(item) => item.budget_id}
        contentContainerStyle={{ paddingBottom: space(20) }}
        renderItem={({ item }) => <BudgetRow item={item} />}
        ListEmptyComponent={
          <View style={{ padding: space(8), alignItems: 'center' }}>
            <Text variant="body" tone="muted">No budgets yet.</Text>
          </View>
        }
      />

      <View
        style={{
          position: 'absolute',
          bottom: space(8),
          right: space(5),
          ...shadow.s2,
        }}
      >
        <Button title="+" onPress={() => router.push('/budgets/new')} variant="accent" />
      </View>
    </View>
  );
}
