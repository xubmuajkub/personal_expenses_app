import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Field } from '@/ui/Field';
import { Chip } from '@/ui/Chip';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { openDb } from '@/db/sqlite';
import { createAccount } from '@/db/repos/accounts';
import { toMicro } from '@/domain/money';
import type { AccountType, Currency } from '@/domain/types';

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'credit_card', 'other'];
const CURRENCIES: Currency[] = ['LAK', 'THB', 'USD'];

export default function NewAccount() {
  const userId = useAuth((s) => s.user?.id)!;

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [currency, setCurrency] = useState<Currency>('LAK');
  const [openingBalance, setOpeningBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  async function save() {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError('');
    setSaving(true);
    try {
      const db = await openDb();
      const opening = parseFloat(openingBalance.replace(/,/g, '')) || 0;
      await createAccount(db, {
        user_id: userId,
        name: name.trim(),
        type,
        currency,
        opening_balance_micro: toMicro(opening),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="New account">
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Wallet, BCEL Bank"
        error={nameError}
      />

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>Type</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {ACCOUNT_TYPES.map((t) => (
          <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
        ))}
      </View>

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>Currency</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {CURRENCIES.map((c) => (
          <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
        ))}
      </View>

      <Field
        label="Opening balance"
        value={openingBalance}
        onChangeText={setOpeningBalance}
        keyboardType="decimal-pad"
        placeholder="0"
      />

      <Button title="Save" variant="primary" onPress={save} loading={saving} />
    </Sheet>
  );
}
