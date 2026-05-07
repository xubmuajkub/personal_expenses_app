import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from './Text';
import { color, space } from './theme';
import { format } from '@/domain/money';
import type { Transaction } from '@/domain/types';

type Props = {
  txn: Transaction;
  categoryName?: string | undefined;
  accountName?: string | undefined;
};

export function TxnRow({ txn, categoryName, accountName }: Props) {
  const isIncome = txn.kind === 'income';
  const sign = isIncome ? '+' : '-';
  const amountTone = isIncome ? 'success' : 'fg';

  const caption = [
    accountName,
    new Date(txn.occurred_at).toLocaleDateString(),
    txn.source !== 'manual' ? txn.source : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => router.push(`/txn/${txn.id}`)}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: space(3.5),
        paddingHorizontal: space(4),
        borderBottomWidth: 1,
        borderBottomColor: color.hairline,
      }}
    >
      <View style={{ flex: 1, marginRight: space(3) }}>
        <Text variant="bodyLg">{txn.merchant ?? categoryName ?? '—'}</Text>
        <Text variant="caption" tone="muted" style={{ marginTop: space(0.5) }}>
          {caption}
        </Text>
      </View>
      <Text variant="display3" tone={amountTone}>
        {sign}{format(txn.amount_micro, txn.currency)}
      </Text>
    </Pressable>
  );
}
