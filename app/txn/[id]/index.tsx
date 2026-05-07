import { useEffect, useState } from 'react';
import { View, Alert, Image, Pressable, Modal, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { color, space, radius } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { getTransaction, deleteTransaction, updateTransaction } from '@/db/repos/transactions';
import { format } from '@/domain/money';
import type { Transaction } from '@/domain/types';
import { signedReceiptUrl } from '@/lib/receipts';
import { getSupabase } from '@/lib/supabase';

export default function TxnDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const db = await openDb();
      const t = await getTransaction(db, id);
      setTxn(t);
      if (t?.receipt_url) {
        const signed = await signedReceiptUrl(t.receipt_url);
        setReceiptUri(signed);
      }
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

  async function removeReceipt() {
    if (!id || !txn?.receipt_url) return;
    Alert.alert('Remove receipt?', 'The receipt image will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const path = txn.receipt_url!;
          const db = await openDb();
          await updateTransaction(db, id, { receipt_url: null });
          await getSupabase().storage.from('receipts').remove([path]);
          setTxn((prev) => prev ? { ...prev, receipt_url: null } : prev);
          setReceiptUri(null);
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

      <View style={{ marginBottom: space(4) }}>
        <Text variant="caption" tone="muted" caps style={{ marginBottom: space(2) }}>
          Receipt
        </Text>
        {receiptUri ? (
          <>
            <Pressable onPress={() => setFullscreen(true)} style={styles.imageWrapper}>
              <Image source={{ uri: receiptUri }} style={styles.thumbnail} resizeMode="cover" />
            </Pressable>
            <Button
              title="Remove receipt"
              variant="secondary"
              onPress={removeReceipt}
              style={{ marginTop: space(2), borderColor: color.danger }}
            />
          </>
        ) : (
          <Button
            title="Attach receipt"
            variant="secondary"
            onPress={() => router.push(`/txn/${id}/attach-receipt`)}
          />
        )}
      </View>

      <View style={{ height: space(6) }} />
      <Button title="Delete" variant="secondary" onPress={remove} style={{ borderColor: color.danger }} />

      <Modal visible={fullscreen} transparent animationType="fade">
        <Pressable style={styles.fullscreenBackdrop} onPress={() => setFullscreen(false)}>
          {receiptUri ? (
            <Image source={{ uri: receiptUri }} style={styles.fullscreenImage} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  imageWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.hairline,
  },
  thumbnail: {
    width: '100%',
    height: 200,
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
