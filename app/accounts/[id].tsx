import { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { TxnRow } from '@/ui/TxnRow';
import { color, space } from '@/ui/theme';
import { useAuth } from '@/store/auth';
import { openDb } from '@/db/sqlite';
import { listAccounts, updateAccount } from '@/db/repos/accounts';
import { listTransactions } from '@/db/repos/transactions';
import { computeBalances } from '@/domain/balances';
import { format } from '@/domain/money';
import type { Account, Transaction } from '@/domain/types';

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuth((s) => s.user?.id)!;
  const [account, setAccount] = useState<Account | null>(null);
  const [balanceMicro, setBalanceMicro] = useState(0);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const db = await openDb();
      const [accounts, balances, recentTxns] = await Promise.all([
        listAccounts(db, userId),
        computeBalances(db, userId),
        listTransactions(db, { user_id: userId, account_id: id, limit: 20 }),
      ]);
      const acct = accounts.find((a) => a.id === id) ?? null;
      setAccount(acct);
      const bal = balances.find((b) => b.account_id === id);
      setBalanceMicro(bal?.balance_micro ?? 0);
      setTxns(recentTxns);
    })();
  }, [id, userId]);

  async function archive() {
    if (!account || !id) return;
    Alert.alert(
      account.archived ? 'Unarchive account?' : 'Archive account?',
      account.archived
        ? 'This account will appear in your list again.'
        : 'This account will be hidden from the main list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: account.archived ? 'Unarchive' : 'Archive',
          style: account.archived ? 'default' : 'destructive',
          onPress: async () => {
            setArchiving(true);
            try {
              const db = await openDb();
              await updateAccount(db, id, { archived: !account.archived });
              router.back();
            } finally {
              setArchiving(false);
            }
          },
        },
      ],
    );
  }

  if (!account) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ padding: space(5) }}>
        {/* Balance display */}
        <View style={{ marginBottom: space(4) }}>
          <Text variant="caption" tone="muted" caps>Balance</Text>
          <Text variant="display3" style={{ marginTop: space(1) }}>
            {format(balanceMicro, account.currency)}
          </Text>
          <Text variant="body" tone="muted" style={{ marginTop: space(1) }}>
            {account.name} · {account.type} · {account.currency}
          </Text>
        </View>

        {/* Opening balance info */}
        <View
          style={{
            backgroundColor: color.glassSoft,
            borderRadius: 14,
            padding: space(4),
            marginBottom: space(4),
          }}
        >
          <Text variant="caption" tone="muted" caps>Opening balance</Text>
          <Text variant="bodyLg" style={{ marginTop: space(1) }}>
            {format(account.opening_balance_micro, account.currency)}
          </Text>
        </View>

        {/* Recent transactions */}
        {txns.length > 0 && (
          <View style={{ marginBottom: space(4) }}>
            <Text variant="caption" tone="muted" caps style={{ marginBottom: space(2) }}>
              Recent transactions
            </Text>
            <View
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: color.hairline,
              }}
            >
              {txns.map((txn) => (
                <TxnRow key={txn.id} txn={txn} />
              ))}
            </View>
          </View>
        )}

        {account.archived ? (
          <Button
            title="Unarchive account"
            variant="secondary"
            onPress={archive}
            loading={archiving}
          />
        ) : (
          <Button
            title="Archive account"
            variant="secondary"
            onPress={archive}
            loading={archiving}
            style={{ borderColor: color.danger }}
          />
        )}
      </View>
    </ScrollView>
  );
}
