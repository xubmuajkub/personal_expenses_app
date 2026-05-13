import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Field } from '@/ui/Field';
import { Chip } from '@/ui/Chip';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { color, space } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { openDb } from '@/db/sqlite';
import { listAccounts } from '@/db/repos/accounts';
import { getRate } from '@/db/repos/fx_rates';
import { getProfile } from '@/db/repos/profiles';
import { createTransfer } from '@/domain/transfer';
import { format, toMicro, applyRate } from '@/domain/money';
import type { Account, Currency } from '@/domain/types';

export default function NewTransfer() {
  const userId = useAuth((s) => s.user?.id)!;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [base, setBase] = useState<Currency>('LAK');
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [rateOverride, setRateOverride] = useState('');
  const [previewRate, setPreviewRate] = useState<number | null>(null);
  const [previewAmount, setPreviewAmount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const db = await openDb();
      const [accts, profile] = await Promise.all([
        listAccounts(db, userId),
        getProfile(db, userId),
      ]);
      setAccounts(accts.filter((a) => !a.archived));
      setBase((profile?.base_currency ?? 'LAK') as Currency);
      if (accts[0]) setFromId(accts[0].id);
      if (accts[1]) setToId(accts[1].id);
    })();
  }, [userId]);

  const fromAccount = accounts.find((a) => a.id === fromId) ?? null;
  const toAccount = accounts.find((a) => a.id === toId) ?? null;

  // Fetch FX rate when from/to/amount changes
  useEffect(() => {
    if (!fromAccount || !toAccount) return;
    const amtNum = parseFloat(amount.replace(/,/g, ''));
    if (!amtNum || isNaN(amtNum)) {
      setPreviewRate(null);
      setPreviewAmount(null);
      return;
    }

    void (async () => {
      const db = await openDb();
      let rate: number;
      if (rateOverride) {
        rate = parseFloat(rateOverride) || 1;
      } else if (fromAccount.currency === toAccount.currency) {
        rate = 1;
      } else {
        rate = await getRate(db, fromAccount.currency, toAccount.currency);
      }
      const fromMicro = toMicro(amtNum);
      const toMicroAmt = applyRate(fromMicro, rate);
      setPreviewRate(rate);
      setPreviewAmount(toMicroAmt);
    })();
  }, [fromAccount, toAccount, amount, rateOverride]);

  async function save() {
    if (!fromAccount || !toAccount || !amount.trim()) return;
    if (fromId === toId) return;
    setSaving(true);
    try {
      const db = await openDb();
      const amtNum = parseFloat(amount.replace(/,/g, '')) || 0;
      const fromAmountMicro = toMicro(amtNum);
      const parsedRate = rateOverride ? parseFloat(rateOverride) : 0;
      await createTransfer(db, {
        user_id: userId,
        from_account: fromAccount,
        to_account: toAccount,
        from_amount_micro: fromAmountMicro,
        ...(parsedRate ? { fx_rate: parsedRate } : {}),
        occurred_at: new Date().toISOString(),
        base_currency: base,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const isCrossCurrency =
    fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  return (
    <Sheet title="New transfer">
      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>From</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {accounts.map((a) => (
          <Chip
            key={a.id}
            label={`${a.name} (${a.currency})`}
            selected={fromId === a.id}
            onPress={() => setFromId(a.id)}
          />
        ))}
      </View>

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>To</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {accounts.map((a) => (
          <Chip
            key={a.id}
            label={`${a.name} (${a.currency})`}
            selected={toId === a.id}
            onPress={() => setToId(a.id)}
          />
        ))}
      </View>

      <Field
        label={fromAccount ? `Amount (${fromAccount.currency})` : 'Amount'}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0"
      />

      {isCrossCurrency && (
        <Field
          label="Rate override (optional)"
          value={rateOverride}
          onChangeText={setRateOverride}
          keyboardType="decimal-pad"
          placeholder={previewRate?.toString() ?? 'e.g. 21000'}
        />
      )}

      {/* Rate / converted amount preview */}
      {previewRate !== null && previewAmount !== null && toAccount && (
        <View
          style={{
            backgroundColor: color.glassSoft,
            borderRadius: 14,
            padding: space(4),
            marginBottom: space(3),
          }}
        >
          {isCrossCurrency && (
            <Text variant="caption" tone="muted" style={{ marginBottom: space(1) }}>
              Rate: 1 {fromAccount?.currency} = {previewRate} {toAccount.currency}
            </Text>
          )}
          <Text variant="bodyLg">
            You will receive {format(previewAmount, toAccount.currency)}
          </Text>
        </View>
      )}

      <Button
        title="Transfer"
        variant="primary"
        onPress={save}
        loading={saving}
        disabled={!fromAccount || !toAccount || fromId === toId || !amount.trim()}
      />
    </Sheet>
  );
}
