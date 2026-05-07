import { useCallback, useState } from 'react';
import { View, Alert } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
import {
  getRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
  type RecurringRule,
  type RecurringMode,
  type TemplateTxn,
} from '@/db/repos/recurring_rules';
import { nextRunAfter } from '@/domain/cadence';
import { toMicro, fromMicro } from '@/domain/money';
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

const QUICK_VALUES = CADENCE_QUICK.map((q) => q.value);

export default function EditRecurring() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuth((s) => s.user?.id)!;

  const [rule, setRule] = useState<RecurringRule | null>(null);
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
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadRule = useCallback(async () => {
    const db = await openDb();
    const [r, accs, cats] = await Promise.all([
      getRecurringRule(db, id),
      listAccounts(db, userId),
      listCategories(db, userId),
    ]);
    if (!r) return;
    setRule(r);
    setAccounts(accs);
    setCategories(cats);

    setName(r.name);
    setMode(r.mode);
    setEnabled(r.enabled === 1);
    // Determine if cadence is a quick option
    if (QUICK_VALUES.includes(r.cadence as typeof QUICK_VALUES[number])) {
      setCadence(r.cadence);
      setCadenceFree('');
    } else {
      setCadenceFree(r.cadence);
    }

    const tmpl = JSON.parse(r.template_txn) as TemplateTxn;
    setKind(tmpl.kind);
    setAccountId(tmpl.account_id);
    setCategoryId(tmpl.category_id ?? null);
    setCurrency(tmpl.currency);
    setAmountRaw(String(fromMicro(tmpl.amount_micro)));
  }, [id, userId]);

  useFocusEffect(useCallback(() => { void loadRule(); }, [loadRule]));

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
      await updateRecurringRule(db, id, {
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
        enabled,
        next_run_at: rule?.next_run_at ?? nextRun.toISOString(),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete rule',
      `Delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const db = await openDb();
            await deleteRecurringRule(db, id);
            router.back();
          },
        },
      ],
    );
  }

  const filteredCats = categories.filter((c) => c.kind === kind);

  if (!rule) return null;

  return (
    <Sheet title="Edit recurring rule">
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Monthly rent"
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {MODES.map((m) => (
          <Chip key={m} label={m} selected={mode === m} onPress={() => setMode(m)} />
        ))}
      </View>

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Status
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(4) }}>
        <Chip label="Enabled"  selected={enabled}  onPress={() => setEnabled(true)} />
        <Chip label="Disabled" selected={!enabled} onPress={() => setEnabled(false)} />
      </View>

      {error ? (
        <Text variant="caption" tone="danger" style={{ marginBottom: space(2) }}>
          {error}
        </Text>
      ) : null}

      <Button title="Save" variant="primary" onPress={save} loading={saving} />
      <Button
        title="Delete rule"
        variant="ghost"
        onPress={confirmDelete}
        style={{ marginTop: space(2) }}
      />
    </Sheet>
  );
}
