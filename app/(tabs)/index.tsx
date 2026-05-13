import { useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Gradient, Pulse } from '@/ui/atoms';
import { StatTriple } from '@/ui/StatTriple';
import { TxnRow } from '@/ui/TxnRow';
import { RecurringConfirmCard } from '@/ui/RecurringConfirmCard';
import { Text } from '@/ui/Text';
import { color, space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { monthIncomeBase, monthSpendBase } from '@/domain/reports';
import { listTransactions } from '@/db/repos/transactions';
import { listRecurringRules, type RecurringRule } from '@/db/repos/recurring_rules';
import { getProfile } from '@/db/repos/profiles';
import { useAuth } from '@/store/auth';
import { format } from '@/domain/money';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import type { Currency, Transaction } from '@/domain/types';

const HERO_HEIGHT = 320;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getPendingConfirmRules(
  rules: RecurringRule[],
  txns: Transaction[],
): RecurringRule[] {
  const now = Date.now();
  return rules.filter((r) => {
    if (r.mode !== 'confirm') return false;
    if (r.enabled !== 1) return false;
    if (!r.last_notified_at) return false;
    const notifiedAt = new Date(r.last_notified_at).getTime();
    if (now - notifiedAt > ONE_DAY_MS) return false;
    // Check if a transaction was already created for this rule in last 24h
    const prefix = `recurring:${r.id}:`;
    const alreadyCreated = txns.some(
      (t) => t.source === 'recurring' && t.source_ref?.startsWith(prefix),
    );
    return !alreadyCreated;
  });
}

export default function HomeTab() {
  const userId = useAuth((s) => s.user?.id)!;
  const [base, setBase] = useState<Currency>('LAK');
  const [spend, setSpend] = useState(0);
  const [income, setIncome] = useState(0);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [pendingRules, setPendingRules] = useState<RecurringRule[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = await openDb();
      const profile = await getProfile(db, userId);
      if (profile) setBase(profile.base_currency as Currency);
      const now = new Date();
      const oneDayAgo = new Date(Date.now() - ONE_DAY_MS).toISOString();
      const [s, inc, txns, rules] = await Promise.all([
        monthSpendBase(db, userId, now),
        monthIncomeBase(db, userId, now),
        listTransactions(db, { user_id: userId, limit: 5 }),
        listRecurringRules(db, userId),
      ]);
      // Also fetch recent recurring transactions to check for already-confirmed
      const recentRecurring = await listTransactions(db, {
        user_id: userId,
        source: 'recurring',
        from: oneDayAgo,
        limit: 100,
      });
      setSpend(s);
      setIncome(inc);
      setRecent(txns);
      setPendingRules(getPendingConfirmRules(rules, recentRecurring));
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string | undefined;
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined;

  async function handleConfirm(ruleId: string) {
    try {
      if (supabaseUrl && supabaseAnonKey) {
        const sb = createClient(supabaseUrl, supabaseAnonKey);
        await sb.rpc('confirm_recurring', { rule_id: ruleId });
      }
    } finally {
      setDismissedIds((prev) => new Set([...prev, ruleId]));
      void reload();
    }
  }

  function handleSkip(ruleId: string) {
    setDismissedIds((prev) => new Set([...prev, ruleId]));
  }

  const visiblePendingRules = pendingRules.filter((r) => !dismissedIds.has(r.id));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingBottom: space(15) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
    >
      {/* Hero card */}
      <View
        style={{
          position: 'relative',
          height: HERO_HEIGHT,
          marginBottom: space(4),
          overflow: 'hidden',
        }}
      >
        <Gradient
          preset="hero"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <Pulse
          color={color.pulsePink}
          size={320}
          opacity={0.55}
          blur={40}
          style={{ position: 'absolute', top: -80, right: -80 }}
        />
        <Pulse
          color={color.pulseLilac}
          size={280}
          opacity={0.45}
          blur={50}
          style={{ position: 'absolute', bottom: -60, left: -60 }}
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
            tone="onPulse"
          />
        </View>
      </View>

      {/* Pending recurring confirms */}
      {visiblePendingRules.length > 0 && (
        <View style={{ marginBottom: space(2) }}>
          <Text
            variant="display3"
            style={{ paddingHorizontal: space(4), marginBottom: space(2) }}
          >
            Action needed
          </Text>
          {visiblePendingRules.map((r) => (
            <RecurringConfirmCard
              key={r.id}
              rule={r}
              onConfirm={handleConfirm}
              onSkip={handleSkip}
            />
          ))}
        </View>
      )}

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
