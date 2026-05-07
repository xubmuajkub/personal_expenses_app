import { useCallback, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as MailComposer from 'expo-mail-composer';
import { useFocusEffect } from 'expo-router';
import { dumpLogs } from '@/lib/log';
import { openDb } from '@/db/sqlite';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { color, space } from '@/ui/theme';

interface OutboxCount {
  c: number;
}

interface SyncState {
  table_name: string;
  last_pulled_at: string | null;
  last_pushed_at: string | null;
}

export default function DiagnosticsScreen() {
  const [outboxCount, setOutboxCount] = useState<number | null>(null);
  const [syncStates, setSyncStates] = useState<SyncState[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, []),
  );

  async function loadStats() {
    try {
      const db = await openDb();
      const [row] = await db.getAllAsync<OutboxCount>('SELECT COUNT(*) AS c FROM outbox');
      setOutboxCount(row?.c ?? 0);
      const rows = await db.getAllAsync<SyncState>('SELECT * FROM sync_state');
      setSyncStates(rows);
    } catch {
      // stats are best-effort
    }
  }

  const getLogs = () => {
    const logs = dumpLogs();
    return logs.length > 0 ? logs : '(no logs captured yet)';
  };

  const handleCopy = async () => {
    setBusy(true);
    setStatus('');
    try {
      await Clipboard.setStringAsync(getLogs());
      setStatus('Logs copied to clipboard.');
    } catch (e) {
      setStatus(`Copy failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleShareFile = async () => {
    setBusy(true);
    setStatus('');
    try {
      const file = new File(Paths.cache, `logs_${Date.now()}.txt`);
      file.write(getLogs());
      await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Share Logs' });
      setStatus('Logs shared.');
    } catch (e) {
      setStatus(`Share failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    setBusy(true);
    setStatus('');
    try {
      const available = await MailComposer.isAvailableAsync();
      if (!available) {
        setStatus('Mail composer not available on this device.');
        return;
      }
      await MailComposer.composeAsync({
        subject: `App diagnostics – ${new Date().toISOString()}`,
        body: getLogs(),
      });
      setStatus('Email composed.');
    } catch (e) {
      setStatus(`Email failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: color.bg }}
    >
      <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: space(15) }}>
        <View style={{ marginBottom: space(4) }}>
          <Text variant="display3">Diagnostics</Text>
        </View>

        {/* Stats */}
        <View
          style={{
            backgroundColor: color.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: color.hairline,
            marginBottom: space(6),
            overflow: 'hidden',
          }}
        >
          <View style={{ padding: space(3), borderBottomWidth: 1, borderBottomColor: color.hairline }}>
            <Text variant="caption" tone="muted" caps>
              Sync stats
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: space(3),
              borderBottomWidth: 1,
              borderBottomColor: color.hairline,
            }}
          >
            <Text variant="body">Outbox pending</Text>
            <Text variant="body" tone={outboxCount ? 'danger' : 'success'}>
              {outboxCount ?? '—'}
            </Text>
          </View>

          {syncStates.length === 0 && (
            <View style={{ padding: space(3) }}>
              <Text variant="body" tone="muted">
                No sync state recorded yet.
              </Text>
            </View>
          )}

          {syncStates.map((row, i) => (
            <View
              key={row.table_name}
              style={{
                padding: space(3),
                borderBottomWidth: i < syncStates.length - 1 ? 1 : 0,
                borderBottomColor: color.hairline,
              }}
            >
              <Text variant="bodyLg">{row.table_name}</Text>
              <Text variant="caption" tone="muted" style={{ marginTop: space(1) }}>
                pulled: {row.last_pulled_at ?? 'never'} · pushed: {row.last_pushed_at ?? 'never'}
              </Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <Button
          title="Copy logs"
          variant="primary"
          loading={busy}
          onPress={handleCopy}
          style={{ marginBottom: space(3) }}
          accessibilityLabel="Copy logs to clipboard"
        />

        <Button
          title="Share logs to file"
          variant="accent"
          loading={busy}
          onPress={handleShareFile}
          style={{ marginBottom: space(3) }}
          accessibilityLabel="Share logs as a file"
        />

        <Button
          title="Email logs"
          variant="secondary"
          loading={busy}
          onPress={handleEmail}
          accessibilityLabel="Email logs"
        />

        {status ? (
          <View style={{ marginTop: space(4) }}>
            <Text variant="body" tone="muted">
              {status}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
