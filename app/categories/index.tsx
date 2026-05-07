import { useCallback, useState } from 'react';
import { View, Pressable, SectionList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { color, space, shadow } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { openDb } from '@/db/sqlite';
import { listCategories } from '@/db/repos/categories';
import type { Category } from '@/domain/types';

type Section = { title: string; data: Category[] };

export default function CategoriesIndex() {
  const userId = useAuth((s) => s.user?.id)!;
  const [sections, setSections] = useState<Section[]>([]);

  const load = useCallback(async () => {
    const db = await openDb();
    const all = await listCategories(db, userId);
    const expenses = all.filter((c) => c.kind === 'expense');
    const income = all.filter((c) => c.kind === 'income');
    const result: Section[] = [];
    if (expenses.length > 0) result.push({ title: 'Expenses', data: expenses });
    if (income.length > 0) result.push({ title: 'Income', data: income });
    setSections(result);
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: space(20) }}
        renderSectionHeader={({ section }) => (
          <View
            style={{
              paddingVertical: space(2),
              paddingHorizontal: space(5),
              backgroundColor: color.hairline,
            }}
          >
            <Text variant="caption" tone="muted" caps>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/categories/${item.id}`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: space(4),
              paddingHorizontal: space(5),
              borderBottomWidth: 1,
              borderBottomColor: color.hairline,
              opacity: item.archived ? 0.5 : 1,
            }}
          >
            {item.color ? (
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: item.color,
                  marginRight: space(3),
                }}
              />
            ) : null}
            <Text variant="bodyLg" style={{ flex: 1 }}>
              {item.icon ? `${item.icon}  ` : ''}{item.name}
            </Text>
            {item.archived ? (
              <Text variant="caption" tone="muted">archived</Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ padding: space(8), alignItems: 'center' }}>
            <Text variant="body" tone="muted">No categories yet.</Text>
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
        <Button title="+" onPress={() => router.push('/categories/new')} variant="accent" />
      </View>
    </View>
  );
}
