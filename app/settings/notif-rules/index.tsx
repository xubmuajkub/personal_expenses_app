import { useCallback, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { color, space, shadow } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { openDb } from '@/db/sqlite';
import { listNotifParseRules } from '@/db/repos/notif_parse_rules';
import type { NotifParseRule } from '@/db/repos/notif_parse_rules';

export default function NotifRulesList() {
  const userId = useAuth((s) => s.user?.id)!;
  const [rules, setRules] = useState<NotifParseRule[]>([]);

  const load = useCallback(async () => {
    const db = await openDb();
    const loaded = await listNotifParseRules(db, userId);
    setRules(loaded);
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: space(20) }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/settings/notif-rules/${item.id}`)}
            style={{
              paddingVertical: space(4),
              paddingHorizontal: space(5),
              borderBottomWidth: 1,
              borderBottomColor: color.hairline,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space(0.5) }}>
              <Text variant="bodyLg" style={{ flex: 1 }}>{item.app_package}</Text>
              {!item.enabled ? (
                <Text variant="caption" tone="muted" style={{ marginLeft: space(2) }}>disabled</Text>
              ) : null}
            </View>
            <Text variant="caption" tone="muted" numberOfLines={1}>{item.regex}</Text>
            <Text variant="caption" tone="muted">priority {item.priority}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ padding: space(8), alignItems: 'center' }}>
            <Text variant="body" tone="muted">No notification rules yet.</Text>
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
        <Button
          title="+"
          onPress={() => router.push('/settings/notif-rules/new')}
          variant="accent"
        />
      </View>
    </View>
  );
}
