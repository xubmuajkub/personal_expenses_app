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
import { createNotifParseRule } from '@/db/repos/notif_parse_rules';
import { listAccounts } from '@/db/repos/accounts';
import type { Account } from '@/domain/types';

export default function NewNotifRule() {
  const userId = useAuth((s) => s.user?.id)!;

  const [appPackage, setAppPackage] = useState('la.bcel.bcelone');
  const [regex, setRegex] = useState('');
  const [fieldAmount, setFieldAmount] = useState('$1');
  const [fieldCurrency, setFieldCurrency] = useState('$2');
  const [fieldMerchant, setFieldMerchant] = useState('$3');
  const [priority, setPriority] = useState('100');
  const [enabled, setEnabled] = useState(true);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);
  const [regexError, setRegexError] = useState('');

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const db = await openDb();
        const accts = await listAccounts(db, userId);
        setAccounts(accts.filter((a) => !a.archived));
      })();
    }, [userId]),
  );

  async function save() {
    if (!regex.trim()) {
      setRegexError('Regex is required');
      return;
    }
    try {
      new RegExp(regex);
      setRegexError('');
    } catch {
      setRegexError('Invalid regular expression');
      return;
    }

    setSaving(true);
    try {
      const db = await openDb();
      await createNotifParseRule(db, {
        user_id: userId,
        app_package: appPackage.trim(),
        regex: regex.trim(),
        field_map: { amount: fieldAmount, currency: fieldCurrency, merchant: fieldMerchant },
        priority: parseInt(priority, 10) || 100,
        enabled,
        default_account_id: defaultAccountId,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="New notif rule">
      <Field
        label="App package"
        value={appPackage}
        onChangeText={setAppPackage}
        placeholder="la.bcel.bcelone"
      />

      <Field
        label="Regex"
        value={regex}
        onChangeText={setRegex}
        placeholder="Debit\s+([\d,\.]+)\s+(LAK|THB|USD)\s+at\s+(.+)"
        multiline
        error={regexError}
      />

      <Field
        label="Field map — amount"
        value={fieldAmount}
        onChangeText={setFieldAmount}
        placeholder="$1"
      />

      <Field
        label="Field map — currency"
        value={fieldCurrency}
        onChangeText={setFieldCurrency}
        placeholder="$2"
      />

      <Field
        label="Field map — merchant"
        value={fieldMerchant}
        onChangeText={setFieldMerchant}
        placeholder="$3"
      />

      <Field
        label="Priority"
        value={priority}
        onChangeText={setPriority}
        placeholder="100"
        keyboardType="numeric"
      />

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Enabled
      </Text>
      <View style={{ flexDirection: 'row', marginBottom: space(3) }}>
        <Chip label="Enabled" selected={enabled} onPress={() => setEnabled(true)} />
        <Chip label="Disabled" selected={!enabled} onPress={() => setEnabled(false)} />
      </View>

      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        Default account (optional)
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}>
        {accounts.map((a) => (
          <Chip
            key={a.id}
            label={a.name}
            selected={defaultAccountId === a.id}
            onPress={() => setDefaultAccountId(defaultAccountId === a.id ? null : a.id)}
          />
        ))}
      </View>

      <Button title="Save" variant="primary" onPress={save} loading={saving} />
    </Sheet>
  );
}
