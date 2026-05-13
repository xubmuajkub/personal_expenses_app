// IMPORTANT: TxnRow MUST NOT be wrapped in <Glass>. BlurView in a long list
// destroys scroll performance on Android. Use Surface(flat) only. See
// docs/superpowers/specs/2026-05-13-soft-pulse-ui-refactor-design.md §9.
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from './Text';
import { Surface } from './atoms/Surface';
import { color, space } from './theme';
import { format } from '@/domain/money';
import type { Transaction } from '@/domain/types';

type Props = {
  txn: Transaction;
  categoryName?: string | undefined;
  accountName?: string | undefined;
  onPress?: () => void;
};

function dotColor(category?: string | null): string {
  switch (category) {
    case 'food': return color.catFood;
    case 'transport': return color.catTransport;
    case 'bills': return color.catBills;
    case 'shopping': return color.catShopping;
    case 'entertainment': return color.catEntertain;
    default: return color.pulseLilac;
  }
}

export function TxnRow({ txn, categoryName, accountName, onPress }: Props) {
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

  const handlePress = onPress ?? (() => router.push(`/txn/${txn.id}`));

  return (
    <Pressable onPress={handlePress} accessibilityRole="button">
      <Surface
        variant="flat"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: space(3.5),
          paddingHorizontal: space(4),
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: dotColor(txn.category_id ?? null),
            marginRight: space(3),
          }}
        />
        <View style={{ flex: 1, marginRight: space(3) }}>
          <Text variant="bodyLg" numberOfLines={1}>
            {txn.merchant ?? categoryName ?? '—'}
          </Text>
          {caption ? (
            <Text
              variant="caption"
              tone="muted"
              style={{ marginTop: space(0.5) }}
              numberOfLines={1}
            >
              {caption}
            </Text>
          ) : null}
        </View>
        <Text variant="display3" tone={amountTone}>
          {sign}{format(txn.amount_micro, txn.currency)}
        </Text>
      </Surface>
    </Pressable>
  );
}
