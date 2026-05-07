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
import { createMerchantRule } from '@/db/repos/merchant_rules';
import { listCategories } from '@/db/repos/categories';
import { listAccounts } from '@/db/repos/accounts';
import type { Category, Account } from '@/domain/types';

export default function NewMerchantRule() {
  const userId = useAuth((s) => s.user?.id)!;

  const [pattern, setPattern] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);
  const [patternError, setPatternError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const db = await openDb();
        const [cats, accts] = await Promise.all([
          listCategories(db, userId, 'expense'),
          listAccounts(db, userId),
        ]);
        setCategories(cats.filter((c) => !c.archived));
        setAccounts(accts.filter((a) => !a.archived));
      })();
    }, [userId]),
  );

  async function save() {
    let valid = true;
    if (!pattern.trim()) {
      setPatternError('Pattern is required');
      valid = false;
    } else {
      setPatternError('');
    }
    if (!categoryId) {
      setCategoryError('Category is required');
      valid = false;
    } else {
      setCategoryError('');
    }
    if (!valid || !categoryId) return;

    setSaving(true);
    try {
      const db = await openDb();
      await createMerchantRule(db, {
        user_id: userId,
        pattern: pattern.trim(),
        is_regex: isRegex,
        category_id: categoryId,
        account_id: accountId,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="New merchant rule">
      <Field
        label="Pattern"
        value={pattern}
        onChangeText={setPattern}
        placeholder="e.g. StarBucks or ^star.*"
        error={patternError}
      />

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Match type
      </Text>
      <View style={{ flexDirection: 'row', marginBottom: space(3) }}>
        <Chip label="Substring" selected={!isRegex} onPress={() => setIsRegex(false)} />
        <Chip label="Regex" selected={isRegex} onPress={() => setIsRegex(true)} />
      </View>

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Category
      </Text>
      {categoryError ? (
        <Text variant="caption" tone="danger" style={{ marginBottom: space(1) }}>
          {categoryError}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            selected={categoryId === c.id}
            onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
          />
        ))}
      </View>

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Account (optional)
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {accounts.map((a) => (
          <Chip
            key={a.id}
            label={a.name}
            selected={accountId === a.id}
            onPress={() => setAccountId(accountId === a.id ? null : a.id)}
          />
        ))}
      </View>

      <Button title="Save" variant="primary" onPress={save} loading={saving} />
    </Sheet>
  );
}
