import { useState, useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Sheet } from '@/ui/Sheet';
import { Chip } from '@/ui/Chip';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { getProfile, setBaseCurrency } from '@/db/repos/profiles';
import { useAuth } from '@/store/auth';
import { showUndoToast } from '@/ui/UndoToast';
import type { Currency } from '@/domain/types';

const CURRENCIES: Currency[] = ['LAK', 'THB', 'USD'];

export default function BaseCurrencyScreen() {
  const user = useAuth((s) => s.user);
  const [selected, setSelected] = useState<Currency>('LAK');

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void openDb().then((db) =>
        getProfile(db, user.id).then((p) => {
          if (p?.base_currency) setSelected(p.base_currency);
        }),
      );
    }, [user?.id]),
  );

  const handleSelect = async (currency: Currency) => {
    if (!user?.id || currency === selected) return;
    setSelected(currency);
    try {
      const db = await openDb();
      await setBaseCurrency(db, user.id, currency);
      showUndoToast({
        title: `Base currency set to ${currency}. Existing rows keep their snapshot.`,
        actionLabel: 'OK',
        ttlMs: 3000,
        onAction: () => {},
      });
    } catch {
      // revert on error
      setSelected(selected);
    }
  };

  return (
    <Sheet title="Base currency">
      <Text variant="body" tone="muted" style={{ marginBottom: space(5) }}>
        This affects new transactions. Existing rows keep their recorded currency.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {CURRENCIES.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={selected === c}
            onPress={() => void handleSelect(c)}
          />
        ))}
      </View>
    </Sheet>
  );
}
