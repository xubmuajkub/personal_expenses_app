import { useState } from 'react';
import { View, Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { exportTransactionsCsv, exportAllJson, restoreJson } from '@/domain/export';
import { useFilters } from '@/store/filters';
import { useAuth } from '@/store/auth';

export default function DataScreen() {
  const userId = useAuth((s) => s.user?.id)!;
  const { filters } = useFilters();
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const setStatus = (msg: string, error = false) => {
    setStatusMsg(msg);
    setIsError(error);
  };

  const handleExportCsv = async () => {
    setBusy(true);
    setStatus('');
    try {
      const db = await openDb();
      const csv = await exportTransactionsCsv(db, userId, filters);
      const file = new File(Paths.cache, `transactions_${Date.now()}.csv`);
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
      setStatus('CSV exported.');
    } catch (e) {
      setStatus(`Export failed: ${String(e)}`, true);
    } finally {
      setBusy(false);
    }
  };

  const handleExportJson = async () => {
    setBusy(true);
    setStatus('');
    try {
      const db = await openDb();
      const json = await exportAllJson(db, userId);
      const file = new File(Paths.cache, `backup_${Date.now()}.json`);
      file.write(json);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'JSON Backup',
      });
      setStatus('Backup exported.');
    } catch (e) {
      setStatus(`Backup failed: ${String(e)}`, true);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore from JSON',
      'This will overwrite existing transactions with data from the backup file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setStatus('');
            try {
              const picked = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });
              if (picked.canceled) { setBusy(false); return; }
              const asset = picked.assets[0];
              if (!asset) { setBusy(false); return; }
              const file = new File(asset.uri);
              const json = await file.text();
              const db = await openDb();
              const result = await restoreJson(db, userId, json);
              setStatus(`Restored ${result.restored} transactions.`);
            } catch (e) {
              setStatus(`Restore failed: ${String(e)}`, true);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Sheet title="Data">
      <Text variant="body" tone="muted" style={{ marginBottom: space(5) }}>
        Export or restore your transaction data. CSV export respects the current
        transaction filter. JSON backup includes all transactions and can be
        restored on any device.
      </Text>

      <Button
        title="Export filtered CSV"
        variant="primary"
        loading={busy}
        onPress={handleExportCsv}
        style={{ marginBottom: space(3) }}
      />

      <Button
        title="JSON backup"
        variant="accent"
        loading={busy}
        onPress={handleExportJson}
        style={{ marginBottom: space(3) }}
      />

      <Button
        title="Restore from JSON"
        variant="secondary"
        loading={busy}
        onPress={handleRestore}
      />

      {statusMsg ? (
        <View style={{ marginTop: space(5) }}>
          <Text variant="body" tone={isError ? 'danger' : 'success'}>{statusMsg}</Text>
        </View>
      ) : null}
    </Sheet>
  );
}
