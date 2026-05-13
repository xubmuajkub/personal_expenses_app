import { useCallback, useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Text } from '@/ui/Text';
import { Chip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Pie } from '@/ui/charts/Pie';
import { color, space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { spendByCategory } from '@/domain/reports/spend_by_category';
import type { CategorySlice } from '@/domain/reports/spend_by_category';
import { periodToRange, PERIOD_LABELS } from '@/domain/reports/period';
import type { PeriodKey } from '@/domain/reports/period';
import { useAuth } from '@/store/auth';

const PERIODS: PeriodKey[] = ['this_month', 'last_month', 'last_3', 'last_6', 'last_12', 'custom'];

const PALETTE = [
  color.pulseIndigo,
  color.pulseLilac,
  color.pulsePink,
  color.pulseDeep,
  color.catFood,
  color.catTransport,
];

export default function ByCategoryScreen() {
  const userId = useAuth((s) => s.user?.id)!;
  const [period, setPeriod] = useState<PeriodKey>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [slices, setSlices] = useState<CategorySlice[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = await openDb();
      const range = periodToRange(
        period,
        period === 'custom' ? { from: customFrom, to: customTo } : undefined,
      );
      const result = await spendByCategory(db, userId, range.from, range.to);
      setSlices(result);
    } finally {
      setRefreshing(false);
    }
  }, [userId, period, customFrom, customTo]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const total = slices.reduce((s, c) => s + c.total_micro, 0);

  const pieData = slices.map((s, i) => ({
    x: s.category_name ?? 'Uncategorised',
    y: s.total_micro,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingBottom: space(15) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <View style={{ paddingHorizontal: space(4), paddingTop: space(8) }}>
        <Text variant="display2" style={{ marginBottom: space(4) }}>By category</Text>

        {/* Period picker */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(4) }}>
          {PERIODS.map((p) => (
            <Chip
              key={p}
              label={PERIOD_LABELS[p]}
              selected={period === p}
              onPress={() => setPeriod(p)}
            />
          ))}
        </View>

        {period === 'custom' && (
          <View>
            <Field label="From (YYYY-MM-DD)" value={customFrom} onChangeText={setCustomFrom} />
            <Field label="To (YYYY-MM-DD)" value={customTo} onChangeText={setCustomTo} />
          </View>
        )}

        {/* Chart */}
        <Pie data={pieData} height={260} />

        {/* Legend */}
        <View style={{ marginTop: space(5) }}>
          {slices.map((s, i) => (
            <View
              key={s.category_id ?? 'none'}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: space(2),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: PALETTE[i % PALETTE.length],
                  }}
                />
                <Text variant="body">{s.category_name ?? 'Uncategorised'}</Text>
              </View>
              <Text variant="body" tone="muted">
                {total > 0 ? `${Math.round((s.total_micro / total) * 100)}%` : '0%'}
              </Text>
            </View>
          ))}
          {slices.length === 0 && (
            <Text variant="body" tone="muted" style={{ textAlign: 'center', marginTop: space(8) }}>
              No data for this period
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
