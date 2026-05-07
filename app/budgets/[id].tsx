import { useCallback, useState } from 'react';
import { View, Alert } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Field } from '@/ui/Field';
import { Chip } from '@/ui/Chip';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { color, space } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { openDb } from '@/db/sqlite';
import { listCategories } from '@/db/repos/categories';
import { getBudget, upsertBudget, deleteBudget } from '@/db/repos/budgets';
import { toMicro, fromMicro } from '@/domain/money';
import type { Category, Currency } from '@/domain/types';

const CURRENCIES: Currency[] = ['LAK', 'THB', 'USD'];

export default function EditBudget() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuth((s) => s.user?.id)!;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>('LAK');
  const [limitRaw, setLimitRaw] = useState('');
  const [month, setMonth] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void (async () => {
        const db = await openDb();
        const [cats, budget] = await Promise.all([
          listCategories(db, userId, 'expense'),
          getBudget(db, id),
        ]);
        setCategories(cats);
        if (budget) {
          setCategoryId(budget.category_id);
          setCurrency(budget.limit_currency);
          setLimitRaw(String(fromMicro(budget.limit_amount_micro)));
          setMonth(budget.month);
        }
      })();
    }, [id, userId]),
  );

  async function save() {
    if (!categoryId) { setError('Select a category'); return; }
    const amount = parseFloat(limitRaw);
    if (!limitRaw.trim() || isNaN(amount) || amount <= 0) {
      setError('Enter a valid limit amount');
      return;
    }
    if (!month || !id) return;
    setError('');
    setSaving(true);
    try {
      const db = await openDb();
      await upsertBudget(db, {
        user_id: userId,
        category_id: categoryId,
        month,
        limit_amount_micro: toMicro(amount),
        limit_currency: currency,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!id) return;
    Alert.alert('Delete budget?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            const db = await openDb();
            await deleteBudget(db, id);
            router.back();
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (!categoryId && !month) return null;

  return (
    <Sheet title="Edit budget">
      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Category
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.icon ? `${c.icon} ${c.name}` : c.name}
            selected={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
          />
        ))}
      </View>

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Currency
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {CURRENCIES.map((cur) => (
          <Chip key={cur} label={cur} selected={currency === cur} onPress={() => setCurrency(cur)} />
        ))}
      </View>

      <Field
        label="Monthly limit"
        value={limitRaw}
        onChangeText={setLimitRaw}
        placeholder="e.g. 500000"
        keyboardType="numeric"
        error={error}
      />

      <Button
        title="Save"
        variant="primary"
        onPress={save}
        loading={saving}
        style={{ marginBottom: space(3) }}
      />

      <Button
        title="Delete budget"
        variant="secondary"
        onPress={confirmDelete}
        loading={deleting}
        style={{ borderColor: color.danger }}
      />
    </Sheet>
  );
}
