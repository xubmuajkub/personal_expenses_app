import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Field } from '@/ui/Field';
import { Chip } from '@/ui/Chip';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { openDb } from '@/db/sqlite';
import { listCategories } from '@/db/repos/categories';
import { upsertBudget } from '@/db/repos/budgets';
import { toMicro } from '@/domain/money';
import type { Category, Currency } from '@/domain/types';

const CURRENCIES: Currency[] = ['LAK', 'THB', 'USD'];

function monthKey(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function NewBudget() {
  const userId = useAuth((s) => s.user?.id)!;
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>('LAK');
  const [limitRaw, setLimitRaw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const db = await openDb();
        const cats = await listCategories(db, userId, 'expense');
        setCategories(cats);
      })();
    }, [userId]),
  );

  async function save() {
    if (!categoryId) { setError('Select a category'); return; }
    const amount = parseFloat(limitRaw);
    if (!limitRaw.trim() || isNaN(amount) || amount <= 0) {
      setError('Enter a valid limit amount');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const db = await openDb();
      await upsertBudget(db, {
        user_id: userId,
        category_id: categoryId,
        month: monthKey(new Date()),
        limit_amount_micro: toMicro(amount),
        limit_currency: currency,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="New budget">
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

      <Button title="Save" variant="primary" onPress={save} loading={saving} />
    </Sheet>
  );
}
