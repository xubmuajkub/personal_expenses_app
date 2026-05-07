import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Field } from '@/ui/Field';
import { Chip } from '@/ui/Chip';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { useRecents } from '@/store/recents';
import { openDb } from '@/db/sqlite';
import { listAccounts } from '@/db/repos/accounts';
import { listCategories } from '@/db/repos/categories';
import { getRate } from '@/db/repos/fx_rates';
import { createTransaction } from '@/db/repos/transactions';
import { listNotifParseRules } from '@/db/repos/notif_parse_rules';
import { getProfile } from '@/db/repos/profiles';
import { toMicro } from '@/domain/money';
import { parseNotif } from '@/domain/notif_parser';
import type { Account, Category, Currency, TxnKind } from '@/domain/types';

export default function NewTxn() {
  const userId = useAuth((s) => s.user?.id)!;
  const recents = useRecents();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [base, setBase] = useState<Currency>('LAK');

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(recents.currency);
  const [accountId, setAccountId] = useState<string | null>(recents.accountId);
  const [categoryId, setCategoryId] = useState<string | null>(recents.categoryId);
  const [note, setNote] = useState('');
  const [merchant, setMerchant] = useState('');
  const [kind, setKind] = useState<TxnKind>('expense');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void recents.load();
    void (async () => {
      const db = await openDb();
      const [a, c, p] = await Promise.all([
        listAccounts(db, userId),
        listCategories(db, userId),
        getProfile(db, userId),
      ]);
      setAccounts(a);
      setCategories(c);
      if (p) setBase(p.base_currency as Currency);
      setAccountId((prev) => prev ?? a[0]?.id ?? null);
    })();
  }, [userId, recents]);

  // Prefill from share extension: personalexpenses://share?text=...
  useEffect(() => {
    if (!prefill) return;
    void (async () => {
      const db = await openDb();
      const rules = await listNotifParseRules(db, userId);
      const parsed = parseNotif({ package: 'manual', title: '', text: prefill }, rules);
      if (parsed) {
        const micro = parsed.amount_micro;
        const wholePart = Math.floor(micro / 1_000_000);
        const fracPart = micro % 1_000_000;
        setAmount(fracPart === 0 ? String(wholePart) : `${wholePart}.${String(fracPart).replace(/0+$/, '')}`);
        setCurrency(parsed.currency);
        if (parsed.merchant) setMerchant(parsed.merchant);
      } else {
        setNote(prefill);
      }
    })();
  }, [prefill, userId]);

  async function save() {
    if (!accountId) return;
    setSaving(true);
    try {
      const db = await openDb();
      const rate = await getRate(db, currency, base);
      const amt = toMicro(parseFloat(amount.replace(/,/g, '')) || 0);
      await createTransaction(db, {
        user_id: userId,
        account_id: accountId,
        ...(kind !== 'transfer' && categoryId ? { category_id: categoryId } : {}),
        kind,
        amount_micro: amt,
        currency,
        fx_rate_to_base: rate,
        occurred_at: new Date().toISOString(),
        ...(merchant ? { merchant } : {}),
        ...(note ? { note } : {}),
        source: 'manual',
      });
      await recents.set({ currency, accountId, categoryId });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const filteredCats = categories.filter((c) => c.kind === kind);

  return (
    <Sheet title="Add transaction">
      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>Kind</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {(['expense', 'income'] as const).map((k) => (
          <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>

      <Field
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>Currency</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {(['LAK', 'THB', 'USD'] as Currency[]).map((c) => (
          <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
        ))}
      </View>

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>Account</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {accounts.map((a) => (
          <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
        ))}
      </View>

      {kind !== 'transfer' && (
        <>
          <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
            {filteredCats.map((c) => (
              <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>
        </>
      )}

      <Field label="Merchant (optional)" value={merchant} onChangeText={setMerchant} />
      <Field label="Note (optional)" value={note} onChangeText={setNote} />

      <Button title="Save" variant="primary" onPress={save} loading={saving} />
    </Sheet>
  );
}
