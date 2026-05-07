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
import { listAccounts } from '@/db/repos/accounts';
import { listCategories } from '@/db/repos/categories';
import { createRecurringRule, type RecurringMode } from '@/db/repos/recurring_rules';
import { nextRunAfter } from '@/domain/cadence';
import { toMicro } from '@/domain/money';
import type { Account, Category, Currency, TxnKind } from '@/domain/types';

const CURRENCIES: Currency[] = ['LAK', 'THB', 'USD'];
const KINDS: TxnKind[] = ['expense', 'income'];
const MODES: RecurringMode[] = ['auto', 'confirm'];

const CADENCE_QUICK = [
  { label: 'Monthly day 1',  value: 'monthly_day_1' },
  { label: 'Monthly day 15', value: 'monthly_day_15' },
  { label: 'Weekly Mon',     value: 'weekly_dow_1' },
  { label: 'Weekly Sun',     value: 'weekly_dow_0' },
  { label: 'Every 7 days',   value: 'every_n_days_7' },
  { label: 'Every 30 days',  value: 'every_n_days_30' },
] as const;

export default function NewRecurring() {
  const userId = useAuth((s) => s.user?.id)!;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<TxnKind>('expense');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>('LAK');
  const [amountRaw, setAmountRaw] = useState('');
  const [cadence, setCadence] = useState<string>('monthly_day_1');
  const [cadenceFree, setCadenceFree] = useState('');
  const [mode, setMode] = useState<RecurringMode>('auto');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const db = await openDb();
        const [accs, cats] = await Promise.all([
          listAccounts(db, userId),
          listCategories(db, userId),
        ]);
        setAccounts(accs);
        setCategories(cats);
      })();
    }, [userId]),
  );

  const effectiveCadence = cadenceFree.trim() || cadence;

  async function save() {
    if (!name.trim()) { setError('Enter a name'); return; }
    if (!accountId) { setError('Select an account'); return; }
    const amount = parseFloat(amountRaw);
    if (!amountRaw.trim() || isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    let nextRun: Date;
    try {
      nextRun = nextRunAfter(effectiveCadence, new Date());
    } catch {
      setError(`Invalid cadence: ${effectiveCadence}`);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const db = await openDb();
      await createRecurringRule(db, {
        user_id: userId,
        name: name.trim(),
        template_txn: {
          account_id: accountId,
          ...(categoryId !== null ? { category_id: categoryId } : {}),
          kind,
          amount_micro: toMicro(amount),
          currency,
        },
        cadence: effectiveCadence,
        mode,
        next_run_at: nextRun.toISOString(),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const filteredCats = categories.filter((c) => c.kind === kind);

  return (
    <Sheet title="New recurring rule">
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Monthly rent"
        {...(error && !name.trim() ? { error } : {})}
      />

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Kind
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {KINDS.map((k) => (
          <Chip key={k} label={k} selected={kind === k} onPress={() => { setKind(k); setCategoryId(null); }} />
        ))}
      </View>

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Account
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {accounts.map((a) => (
          <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
        ))}
      </View>

      {filteredCats.length > 0 && (
        <>
          <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
            Category
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
            {filteredCats.map((c) => (
              <Chip
                key={c.id}
                label={c.icon ? `${c.icon} ${c.name}` : c.name}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(c.id)}
              />
            ))}
          </View>
        </>
      )}

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Currency
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {CURRENCIES.map((cur) => (
          <Chip key={cur} label={cur} selected={currency === cur} onPress={() => setCurrency(cur)} />
        ))}
      </View>

      <Field
        label="Amount"
        value={amountRaw}
        onChangeText={setAmountRaw}
        placeholder="e.g. 500000"
        keyboardType="numeric"
      />

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Cadence
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(2) }}>
        {CADENCE_QUICK.map((q) => (
          <Chip
            key={q.value}
            label={q.label}
            selected={!cadenceFree.trim() && cadence === q.value}
            onPress={() => { setCadence(q.value); setCadenceFree(''); }}
          />
        ))}
      </View>
      <Field
        label="Custom cadence (overrides above)"
        value={cadenceFree}
        onChangeText={setCadenceFree}
        placeholder="e.g. every_n_days_14"
      />

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Mode
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(4) }}>
        {MODES.map((m) => (
          <Chip key={m} label={m} selected={mode === m} onPress={() => setMode(m)} />
        ))}
      </View>

      {error ? (
        <Text variant="caption" tone="danger" style={{ marginBottom: space(2) }}>
          {error}
        </Text>
      ) : null}

      <Button title="Save" variant="primary" onPress={save} loading={saving} />
    </Sheet>
  );
}
