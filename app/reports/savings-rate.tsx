import { useCallback, useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Text } from '@/ui/Text';
import { Chip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Ring } from '@/ui/Ring';
import { AuroraArch } from '@/ui/AuroraArch';
import { color, space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { savingsRate } from '@/domain/reports/savings_rate';
import type { SavingsRateResult } from '@/domain/reports/savings_rate';
import { periodToRange, PERIOD_LABELS } from '@/domain/reports/period';
import type { PeriodKey } from '@/domain/reports/period';
import { format } from '@/domain/money';
import { getProfile } from '@/db/repos/profiles';
import { useAuth } from '@/store/auth';
import type { Currency } from '@/domain/types';

const PERIODS: PeriodKey[] = ['this_month', 'last_month', 'last_3', 'last_6', 'last_12', 'custom'];

export default function SavingsRateScreen() {
  const userId = useAuth((s) => s.user?.id)!;
  const [period, setPeriod] = useState<PeriodKey>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [result, setResult] = useState<SavingsRateResult>({ income_micro: 0, spend_micro: 0, rate: 0 });
  const [base, setBase] = useState<Currency>('LAK');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = await openDb();
      const profile = await getProfile(db, userId);
      if (profile) setBase(profile.base_currency as Currency);
      const range = periodToRange(
        period,
        period === 'custom' ? { from: customFrom, to: customTo } : undefined,
      );
      const sr = await savingsRate(db, userId, range.from, range.to);
      setResult(sr);
    } finally {
      setRefreshing(false);
    }
  }, [userId, period, customFrom, customTo]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const ringValue = Math.max(0, Math.min(result.rate, 1));
  const isDanger = result.rate < 0;
  const savingsPct = `${Math.round(result.rate * 100)}%`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingBottom: space(15) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <View style={{ paddingHorizontal: space(4), paddingTop: space(8) }}>
        <Text variant="display2" style={{ marginBottom: space(4) }}>Savings rate</Text>

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

        {/* Hero ring over aurora */}
        <View style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', marginBottom: space(5) }}>
          <AuroraArch height={220} />
          <View
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ring value={ringValue} size={120} stroke={10} danger={isDanger}>
              <Text variant="display3" tone="onDark">{savingsPct}</Text>
            </Ring>
            <Text variant="bodyLg" tone="onDark" style={{ marginTop: space(3) }}>
              Savings rate
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: color.surface,
            borderRadius: 14,
            padding: space(5),
          }}
        >
          <View>
            <Text variant="caption" tone="muted" caps>Income</Text>
            <Text variant="display3" style={{ marginTop: space(1) }}>
              {format(result.income_micro, base)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" tone="muted" caps>Spend</Text>
            <Text variant="display3" tone="danger" style={{ marginTop: space(1) }}>
              {format(result.spend_micro, base)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
