import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Field } from '@/ui/Field';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { color, space, radius, shadow } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { openDb } from '@/db/sqlite';
import { listNotifParseRules } from '@/db/repos/notif_parse_rules';
import { listRecentRawNotifs } from '@/db/repos/notif_parse_rules';
import type { NotifParseRule } from '@/db/repos/notif_parse_rules';
import { parseNotif, type ParseResult } from '@/domain/notif_parser';
import { fromMicro } from '@/domain/money';

export default function NotifRuleTester() {
  const userId = useAuth((s) => s.user?.id)!;
  const [rules, setRules] = useState<NotifParseRule[]>([]);
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParseResult | null | 'none'>('none');

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const db = await openDb();
        const loaded = await listNotifParseRules(db, userId);
        setRules(loaded);
      })();
    }, [userId]),
  );

  function runParse(inputText: string) {
    if (!inputText.trim()) {
      setResult('none');
      return;
    }
    const r = parseNotif(
      { package: 'la.bcel.bcelone', title: '', text: inputText },
      rules,
    );
    setResult(r);
  }

  function handleChangeText(t: string) {
    setText(t);
    runParse(t);
  }

  async function loadMostRecent() {
    const db = await openDb();
    const recents = await listRecentRawNotifs(db, 1);
    const row = recents[0];
    if (!row) return;
    const combined = [row.title ?? '', row.text ?? ''].filter(Boolean).join(' — ');
    setText(combined);
    runParse(combined);
  }

  return (
    <Sheet title="Rule tester">
      <Field
        label="Raw notification text"
        value={text}
        onChangeText={handleChangeText}
        placeholder="Debit 150,000 LAK at Joma Bakery"
        multiline
      />

      <Button
        title="Use most recent raw notif"
        variant="secondary"
        onPress={loadMostRecent}
        style={{ marginBottom: space(4) }}
      />

      {result !== 'none' && (
        <View
          style={{
            backgroundColor: color.bgRaised,
            borderRadius: radius.md,
            padding: space(4),
            ...shadow.s1,
          }}
        >
          {result === null ? (
            <Text variant="body" tone="muted">No rule matched.</Text>
          ) : (
            <>
              <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1) }}>
                Match result
              </Text>
              <View style={{ marginBottom: space(2) }}>
                <Text variant="bodyLg">Amount: {fromMicro(result.amount_micro).toLocaleString()}</Text>
              </View>
              <View style={{ marginBottom: space(2) }}>
                <Text variant="bodyLg">Currency: {result.currency}</Text>
              </View>
              <View style={{ marginBottom: space(2) }}>
                <Text variant="bodyLg">Merchant: {result.merchant ?? '—'}</Text>
              </View>
              <Text variant="caption" tone="muted">Rule ID: {result.rule_id}</Text>
            </>
          )}
        </View>
      )}
    </Sheet>
  );
}
