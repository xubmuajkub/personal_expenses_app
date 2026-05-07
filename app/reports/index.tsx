import { useCallback, useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Text } from '@/ui/Text';
import { StatTriple } from '@/ui/StatTriple';
import { MiniBars } from '@/ui/MiniBars';
import { AuroraArch } from '@/ui/AuroraArch';
import { color, radius, shadow, space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { monthSpendBase, savingsRate, monthlyTrend } from '@/domain/reports';
import { getProfile } from '@/db/repos/profiles';
import { format } from '@/domain/money';
import { useAuth } from '@/store/auth';
import type { Currency } from '@/domain/types';

const HERO_HEIGHT = 260;

interface Card {
  title: string;
  subtitle: string;
  route: '/reports/by-category' | '/reports/trends' | '/reports/savings-rate';
}

const CARDS: Card[] = [
  { title: 'By category', subtitle: 'Where money goes', route: '/reports/by-category' },
  { title: 'Trends', subtitle: '12-month history', route: '/reports/trends' },
  { title: 'Savings rate', subtitle: 'Income vs spend', route: '/reports/savings-rate' },
];

export default function ReportsDashboard() {
  const router = useRouter();
  const userId = useAuth((s) => s.user?.id)!;
  const [base, setBase] = useState<Currency>('LAK');
  const [spend, setSpend] = useState(0);
  const [rate, setRate] = useState(0);
  const [sparkline, setSparkline] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = await openDb();
      const profile = await getProfile(db, userId);
      if (profile) setBase(profile.base_currency as Currency);

      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const fromStr = new Date(y, m, 1).toISOString().slice(0, 10);
      const toStr = new Date(y, m + 1, 0).toISOString().slice(0, 10);

      const [s, sr, trend] = await Promise.all([
        monthSpendBase(db, userId, now),
        savingsRate(db, userId, fromStr, toStr),
        monthlyTrend(db, userId, 3),
      ]);
      setSpend(s);
      setRate(sr.rate);
      setSparkline(trend.map((pt) => pt.spend_micro));
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const savingsPct = `${Math.round(rate * 100)}%`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingBottom: space(15) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
    >
      {/* Hero */}
      <View style={{ position: 'relative', height: HERO_HEIGHT, marginBottom: space(5) }}>
        <AuroraArch
          height={HERO_HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            padding: space(5),
            justifyContent: 'flex-end',
          }}
        >
          <StatTriple
            label="This month spend"
            value={format(spend, base)}
            sub={`Savings rate ${savingsPct}`}
            valueVariant="display1"
            tone="onDark"
          />
          {sparkline.length > 0 && (
            <View style={{ marginTop: space(4) }}>
              <MiniBars values={sparkline} height={48} />
            </View>
          )}
        </View>
      </View>

      {/* Cards */}
      <View style={{ paddingHorizontal: space(4), gap: space(3) }}>
        {CARDS.map((card) => (
          <Pressable
            key={card.route}
            onPress={() => router.push(card.route)}
            accessibilityRole="button"
            style={({ pressed }) => ({
              backgroundColor: color.surface,
              borderRadius: radius.lg,
              padding: space(5),
              borderWidth: 1,
              borderColor: color.hairline,
              opacity: pressed ? 0.7 : 1,
              ...shadow.s1,
            })}
          >
            <Text variant="display3">{card.title}</Text>
            <Text variant="body" tone="muted" style={{ marginTop: space(1) }}>
              {card.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
