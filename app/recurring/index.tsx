import { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { color, space, radius, shadow } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { listRecurringRules, type RecurringRule } from '@/db/repos/recurring_rules';
import { useAuth } from '@/store/auth';

function RuleRow({ rule }: { rule: RecurringRule }) {
  const tmpl = (() => {
    try { return JSON.parse(rule.template_txn) as { kind?: string; currency?: string; amount_micro?: number }; }
    catch { return {}; }
  })();
  const isEnabled = rule.enabled === 1;

  return (
    <Pressable
      onPress={() => router.push(`/recurring/${rule.id}`)}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: space(3.5),
        paddingHorizontal: space(4),
        borderBottomWidth: 1,
        borderBottomColor: color.hairline,
        opacity: isEnabled ? 1 : 0.5,
      }}
    >
      <View style={{ flex: 1, marginRight: space(3) }}>
        <Text variant="bodyLg">{rule.name}</Text>
        <Text variant="caption" tone="muted" style={{ marginTop: space(0.5) }}>
          {rule.cadence} · {rule.mode} · {tmpl.currency ?? ''}
        </Text>
      </View>
      <Text variant="caption" tone={isEnabled ? 'indigo' : 'muted'}>
        {isEnabled ? 'On' : 'Off'}
      </Text>
    </Pressable>
  );
}

export default function RecurringIndex() {
  const userId = useAuth((s) => s.user?.id)!;
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = await openDb();
      setRules(await listRecurringRules(db, userId));
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space(4),
          paddingTop: space(10),
          paddingBottom: space(3),
        }}
      >
        <Text variant="display3">Recurring</Text>
        <Button
          title="+ New"
          variant="secondary"
          onPress={() => router.push('/recurring/new')}
          style={{ paddingVertical: space(2), paddingHorizontal: space(3) }}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
      >
        {rules.length === 0 ? (
          <View
            style={{
              margin: space(4),
              padding: space(5),
              borderRadius: radius.lg,
              backgroundColor: color.bgRaised,
              alignItems: 'center',
              ...shadow.s1,
            }}
          >
            <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
              {'No recurring rules yet.\nTap “+ New” to create one.'}
            </Text>
          </View>
        ) : (
          rules.map((r) => <RuleRow key={r.id} rule={r} />)
        )}
      </ScrollView>
    </View>
  );
}
