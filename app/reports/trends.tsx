import { useCallback, useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Text } from '@/ui/Text';
import { Chip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Bars } from '@/ui/charts/Bars';
import { color, space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { monthlyTrend } from '@/domain/reports/trend';
import type { MonthlyPoint } from '@/domain/reports/trend';
import { PERIOD_LABELS } from '@/domain/reports/period';
import type { PeriodKey } from '@/domain/reports/period';
import { useAuth } from '@/store/auth';

const PERIODS: PeriodKey[] = ['this_month', 'last_month', 'last_3', 'last_6', 'last_12', 'custom'];

function periodMonthsBack(period: PeriodKey): number {
  switch (period) {
    case 'this_month': return 1;
    case 'last_month': return 2;
    case 'last_3':     return 3;
    case 'last_6':     return 6;
    case 'last_12':    return 12;
    case 'custom':     return 12;
  }
}

export default function TrendsScreen() {
  const userId = useAuth((s) => s.user?.id)!;
  const [period, setPeriod] = useState<PeriodKey>('last_12');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [points, setPoints] = useState<MonthlyPoint[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = await openDb();
      const result = await monthlyTrend(db, userId, periodMonthsBack(period));
      setPoints(result);
    } finally {
      setRefreshing(false);
    }
  }, [userId, period]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const spendBars = points.map((p) => ({ x: p.month, y: p.spend_micro }));
  const incomeBars = points.map((p) => ({ x: p.month, y: p.income_micro }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingBottom: space(15) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <View style={{ paddingHorizontal: space(4), paddingTop: space(8) }}>
        <Text variant="display2" style={{ marginBottom: space(4) }}>Trends</Text>

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

        {/* Spend chart */}
        <Text variant="display3" style={{ marginBottom: space(3) }}>Spend</Text>
        <Bars data={spendBars} height={200} barColor={color.pulseIndigo} />

        {/* Income chart */}
        <Text variant="display3" style={{ marginTop: space(5), marginBottom: space(3) }}>
          Income
        </Text>
        <Bars data={incomeBars} height={200} barColor={color.success} />

        {points.length === 0 && (
          <Text variant="body" tone="muted" style={{ textAlign: 'center', marginTop: space(8) }}>
            No data for this period
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
