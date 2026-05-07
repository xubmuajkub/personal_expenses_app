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
import {
  getNotifParseRule,
  updateNotifParseRule,
  deleteNotifParseRule,
} from '@/db/repos/notif_parse_rules';
import type { NotifParseRule } from '@/db/repos/notif_parse_rules';
import { listAccounts } from '@/db/repos/accounts';
import type { Account } from '@/domain/types';

export default function EditNotifRule() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuth((s) => s.user?.id)!;

  const [rule, setRule] = useState<NotifParseRule | null>(null);
  const [appPackage, setAppPackage] = useState('');
  const [regex, setRegex] = useState('');
  const [fieldAmount, setFieldAmount] = useState('$1');
  const [fieldCurrency, setFieldCurrency] = useState('$2');
  const [fieldMerchant, setFieldMerchant] = useState('$3');
  const [priority, setPriority] = useState('100');
  const [enabled, setEnabled] = useState(true);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regexError, setRegexError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void (async () => {
        const db = await openDb();
        const [r, accts] = await Promise.all([
          getNotifParseRule(db, id),
          listAccounts(db, userId),
        ]);
        if (!r) return;
        setRule(r);
        setAppPackage(r.app_package);
        setRegex(r.regex);
        setFieldAmount(r.field_map.amount ?? '$1');
        setFieldCurrency(r.field_map.currency ?? '$2');
        setFieldMerchant(r.field_map.merchant ?? '$3');
        setPriority(String(r.priority));
        setEnabled(r.enabled);
        setDefaultAccountId(r.default_account_id);
        setAccounts(accts.filter((a) => !a.archived));
      })();
    }, [id, userId]),
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
    if (!id) return;

    setSaving(true);
    try {
      const db = await openDb();
      await updateNotifParseRule(db, id, {
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

  function confirmDelete() {
    if (!id) return;
    Alert.alert(
      'Delete rule?',
      'This notification rule will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const db = await openDb();
              await deleteNotifParseRule(db, id);
              router.back();
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  if (!rule) return null;

  return (
    <Sheet title="Edit notif rule">
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

      <Button
        title="Save"
        variant="primary"
        onPress={save}
        loading={saving}
        style={{ marginBottom: space(3) }}
      />

      <Button
        title="Delete rule"
        variant="secondary"
        onPress={confirmDelete}
        loading={deleting}
        style={{ borderColor: color.danger }}
      />
    </Sheet>
  );
}
