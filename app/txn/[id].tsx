import { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { color, space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { getTransaction, deleteTransaction } from '@/db/repos/transactions';
import { format } from '@/domain/money';
import type { Transaction } from '@/domain/types';

export default function TxnDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [txn, setTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const db = await openDb();
      setTxn(await getTransaction(db, id));
    })();
  }, [id]);

  async function remove() {
    if (!id) return;
    Alert.alert('Delete?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const db = await openDb();
          await deleteTransaction(db, id);
          router.back();
        },
      },
    ]);
  }

  if (!txn) return null;

  return (
    <Sheet title="Transaction">
      <Text variant="display1" style={{ marginBottom: space(2) }}>
        {format(txn.amount_micro, txn.currency)}
      </Text>
      <Text variant="body" tone="muted" style={{ marginBottom: space(4) }}>
        {new Date(txn.occurred_at).toLocaleString()}
      </Text>
      {txn.merchant ? (
        <View style={{ marginBottom: space(2) }}>
          <Text variant="caption" tone="muted" caps>Merchant</Text>
          <Text variant="body">{txn.merchant}</Text>
        </View>
      ) : null}
      {txn.note ? (
        <View style={{ marginBottom: space(2) }}>
          <Text variant="caption" tone="muted" caps>Note</Text>
          <Text variant="body">{txn.note}</Text>
        </View>
      ) : null}
      <View style={{ height: space(6) }} />
      <Button title="Delete" variant="secondary" onPress={remove} style={{ borderColor: color.danger }} />
    </Sheet>
  );
}
