import { useState } from 'react';
import { View, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { updateTransaction } from '@/db/repos/transactions';
import { pickAndCompress, takePhotoAndCompress, uploadReceipt } from '@/lib/receipts';
import { useAuth } from '@/store/auth';

export default function AttachReceipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuth((s) => s.user?.id)!;
  const [busy, setBusy] = useState(false);

  async function attach(picked: Awaited<ReturnType<typeof pickAndCompress>>) {
    if (!picked || !id) return;
    setBusy(true);
    try {
      const path = await uploadReceipt({ user_id: userId, txn_id: id, localUri: picked.localUri });
      const db = await openDb();
      await updateTransaction(db, id, { receipt_url: path });
      router.back();
    } catch (e) {
      Alert.alert('Upload failed', String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleTakePhoto() {
    const picked = await takePhotoAndCompress();
    await attach(picked);
  }

  async function handlePickLibrary() {
    const picked = await pickAndCompress();
    await attach(picked);
  }

  return (
    <Sheet title="Attach Receipt">
      {busy ? (
        <View style={{ alignItems: 'center', paddingVertical: space(8) }}>
          <Text variant="body" tone="muted">Uploading…</Text>
        </View>
      ) : (
        <View style={{ gap: space(3) }}>
          <Button title="Take photo" onPress={handleTakePhoto} />
          <Button title="Pick from library" variant="secondary" onPress={handlePickLibrary} />
        </View>
      )}
    </Sheet>
  );
}
