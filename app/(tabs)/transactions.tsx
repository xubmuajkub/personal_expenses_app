import { useCallback, useState } from 'react';
import { FlatList, View, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Text } from '@/ui/Text';
import { TxnRow } from '@/ui/TxnRow';
import { color, space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { listTransactions } from '@/db/repos/transactions';
import { listAccounts } from '@/db/repos/accounts';
import { listCategories } from '@/db/repos/categories';
import { useAuth } from '@/store/auth';
import type { Account, Category, Transaction } from '@/domain/types';

export default function TransactionsTab() {
  const userId = useAuth((s) => s.user?.id)!;
  const [rows, setRows] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Map<string, Account>>(new Map());
  const [cats, setCats] = useState<Map<string, Category>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = await openDb();
      const [t, a, c] = await Promise.all([
        listTransactions(db, { user_id: userId, limit: 200 }),
        listAccounts(db, userId),
        listCategories(db, userId),
      ]);
      setRows(t);
      setAccounts(new Map(a.map((x) => [x.id, x])));
      setCats(new Map(c.map((x) => [x.id, x])));
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: 60 }}>
      <Text
        variant="display2"
        style={{ paddingHorizontal: space(4), marginBottom: space(3) }}
      >
        Transactions
      </Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
        renderItem={({ item }) => (
          <TxnRow
            txn={item}
            accountName={accounts.get(item.account_id)?.name}
            categoryName={item.category_id ? cats.get(item.category_id)?.name : undefined}
          />
        )}
        ListEmptyComponent={
          <Text
            variant="body"
            tone="muted"
            style={{ textAlign: 'center', marginTop: space(15) }}
          >
            No transactions yet
          </Text>
        }
      />
    </View>
  );
}
