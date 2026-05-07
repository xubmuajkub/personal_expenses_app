import { useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AuroraArch } from '@/ui/AuroraArch';
import { StatTriple } from '@/ui/StatTriple';
import { TxnRow } from '@/ui/TxnRow';
import { Text } from '@/ui/Text';
import { color, space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { monthIncomeBase, monthSpendBase } from '@/domain/reports';
import { listTransactions } from '@/db/repos/transactions';
import { getProfile } from '@/db/repos/profiles';
import { useAuth } from '@/store/auth';
import { format } from '@/domain/money';
import type { Currency, Transaction } from '@/domain/types';

const HERO_HEIGHT = 280;

export default function HomeTab() {
  const userId = useAuth((s) => s.user?.id)!;
  const [base, setBase] = useState<Currency>('LAK');
  const [spend, setSpend] = useState(0);
  const [income, setIncome] = useState(0);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = await openDb();
      const profile = await getProfile(db, userId);
      if (profile) setBase(profile.base_currency as Currency);
      const now = new Date();
      const [s, inc, txns] = await Promise.all([
        monthSpendBase(db, userId, now),
        monthIncomeBase(db, userId, now),
        listTransactions(db, { user_id: userId, limit: 5 }),
      ]);
      setSpend(s);
      setIncome(inc);
      setRecent(txns);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingBottom: space(15) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
    >
      {/* Hero card */}
      <View style={{ position: 'relative', height: HERO_HEIGHT, marginBottom: space(4) }}>
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
            label="This month"
            value={format(spend, base)}
            sub={`+${format(income, base)} income`}
            valueVariant="display1"
            tone="onDark"
          />
        </View>
      </View>

      {/* Recents */}
      <Text
        variant="display3"
        style={{ paddingHorizontal: space(4), marginBottom: space(2) }}
      >
        Recent
      </Text>
      {recent.length === 0 ? (
        <Text
          variant="body"
          tone="muted"
          style={{ textAlign: 'center', marginTop: space(10) }}
        >
          No transactions yet
        </Text>
      ) : (
        recent.map((t) => <TxnRow key={t.id} txn={t} />)
      )}
    </ScrollView>
  );
}
