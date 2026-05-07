import { useCallback, useState } from 'react';
import { FlatList, View, RefreshControl, ScrollView, Modal, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Chip } from '@/ui/Chip';
import { TxnRow } from '@/ui/TxnRow';
import { color, space, radius, shadow } from '@/ui/theme';
import { openDb } from '@/db/sqlite';
import { listTransactions } from '@/db/repos/transactions';
import { listAccounts } from '@/db/repos/accounts';
import { listCategories } from '@/db/repos/categories';
import { useAuth } from '@/store/auth';
import { useFilters } from '@/store/filters';
import { toMicro } from '@/domain/money';
import type { Account, Category, Transaction, TxnKind, TxnSource } from '@/domain/types';

const KINDS: TxnKind[] = ['expense', 'income', 'transfer'];
const SOURCES: TxnSource[] = ['manual', 'notif', 'recurring', 'import'];

export default function TransactionsTab() {
  const userId = useAuth((s) => s.user?.id)!;
  const { filters, set: setFilters, clear: clearFilters } = useFilters();

  const [rows, setRows] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Map<string, Account>>(new Map());
  const [cats, setCats] = useState<Map<string, Category>>(new Map());
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [allCats, setAllCats] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Local state inside the sheet (draft until Apply)
  const [draftSearch, setDraftSearch] = useState(filters.search ?? '');
  const [draftKind, setDraftKind] = useState<TxnKind | undefined>(filters.kind);
  const [draftSources, setDraftSources] = useState<TxnSource[]>(filters.sources ?? []);
  const [draftAccountIds, setDraftAccountIds] = useState<string[]>(filters.account_ids ?? []);
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>(filters.category_ids ?? []);
  const [draftAmountMin, setDraftAmountMin] = useState(
    filters.amount_min_micro !== undefined ? String(filters.amount_min_micro / 1_000_000) : '',
  );
  const [draftAmountMax, setDraftAmountMax] = useState(
    filters.amount_max_micro !== undefined ? String(filters.amount_max_micro / 1_000_000) : '',
  );
  const [draftFrom, setDraftFrom] = useState(filters.from ?? '');
  const [draftTo, setDraftTo] = useState(filters.to ?? '');

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = await openDb();
      const [t, a, c] = await Promise.all([
        listTransactions(db, {
          user_id: userId,
          limit: 200,
          ...filters,
        }),
        listAccounts(db, userId),
        listCategories(db, userId),
      ]);
      setRows(t);
      setAllAccounts(a);
      setAllCats(c);
      setAccounts(new Map(a.map((x) => [x.id, x])));
      setCats(new Map(c.map((x) => [x.id, x])));
    } finally {
      setRefreshing(false);
    }
  }, [userId, filters]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const openSheet = () => {
    // Sync draft with current filters
    setDraftSearch(filters.search ?? '');
    setDraftKind(filters.kind);
    setDraftSources(filters.sources ?? []);
    setDraftAccountIds(filters.account_ids ?? []);
    setDraftCategoryIds(filters.category_ids ?? []);
    setDraftAmountMin(
      filters.amount_min_micro !== undefined ? String(filters.amount_min_micro / 1_000_000) : '',
    );
    setDraftAmountMax(
      filters.amount_max_micro !== undefined ? String(filters.amount_max_micro / 1_000_000) : '',
    );
    setDraftFrom(filters.from ?? '');
    setDraftTo(filters.to ?? '');
    setSheetOpen(true);
  };

  const applyFilters = () => {
    const next: Record<string, unknown> = {};
    if (draftSearch) next['search'] = draftSearch;
    if (draftKind) next['kind'] = draftKind;
    if (draftSources.length > 0) next['sources'] = draftSources;
    if (draftAccountIds.length > 0) next['account_ids'] = draftAccountIds;
    if (draftCategoryIds.length > 0) next['category_ids'] = draftCategoryIds;
    if (draftAmountMin) next['amount_min_micro'] = toMicro(parseFloat(draftAmountMin));
    if (draftAmountMax) next['amount_max_micro'] = toMicro(parseFloat(draftAmountMax));
    if (draftFrom) next['from'] = draftFrom;
    if (draftTo) next['to'] = draftTo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setFilters(next as any);
    setSheetOpen(false);
  };

  const resetFilters = () => {
    clearFilters();
    setSheetOpen(false);
  };

  const toggleSource = (s: TxnSource) => {
    setDraftSources((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const toggleAccountId = (id: string) => {
    setDraftAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleCategoryId = (id: string) => {
    setDraftCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const hasFilters = Object.keys(filters).some(
    (k) => filters[k as keyof typeof filters] !== undefined,
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: 60 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space(4),
          marginBottom: space(3),
        }}
      >
        <Text variant="display2">Transactions</Text>
        <Pressable
          onPress={openSheet}
          accessibilityRole="button"
          style={({ pressed }) => ({
            paddingHorizontal: space(3),
            paddingVertical: space(2),
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: hasFilters ? color.indigo500 : color.hairline,
            backgroundColor: hasFilters ? color.indigo500 : color.surface,
            opacity: pressed ? 0.7 : 1,
            ...shadow.s1,
          })}
        >
          <Text variant="caption" tone={hasFilters ? 'onDark' : 'fg'}>
            {hasFilters ? 'Filtered' : 'Filter'}
          </Text>
        </Pressable>
      </View>

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
            No transactions found
          </Text>
        }
      />

      {/* Filter Sheet */}
      <Modal
        visible={sheetOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSheetOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: color.bg }}>
          <ScrollView
            contentContainerStyle={{ padding: space(5), paddingBottom: space(15) }}
            keyboardShouldPersistTaps="handled"
          >
            <Text variant="display3" style={{ marginBottom: space(4) }}>Filter</Text>

            {/* Search */}
            <Field
              label="Search"
              placeholder="Merchant or note"
              value={draftSearch}
              onChangeText={setDraftSearch}
            />

            {/* Kind */}
            <Text variant="caption" tone="muted" caps style={{ marginBottom: space(2) }}>
              Type
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(4) }}>
              {KINDS.map((k) => (
                <Chip
                  key={k}
                  label={k.charAt(0).toUpperCase() + k.slice(1)}
                  selected={draftKind === k}
                  onPress={() => setDraftKind(draftKind === k ? undefined : k)}
                />
              ))}
            </View>

            {/* Sources */}
            <Text variant="caption" tone="muted" caps style={{ marginBottom: space(2) }}>
              Source
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(4) }}>
              {SOURCES.map((s) => (
                <Chip
                  key={s}
                  label={s.charAt(0).toUpperCase() + s.slice(1)}
                  selected={draftSources.includes(s)}
                  onPress={() => toggleSource(s)}
                />
              ))}
            </View>

            {/* Accounts */}
            {allAccounts.length > 0 && (
              <>
                <Text variant="caption" tone="muted" caps style={{ marginBottom: space(2) }}>
                  Account
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(4) }}>
                  {allAccounts.map((a) => (
                    <Chip
                      key={a.id}
                      label={a.name}
                      selected={draftAccountIds.includes(a.id)}
                      onPress={() => toggleAccountId(a.id)}
                    />
                  ))}
                </View>
              </>
            )}

            {/* Categories */}
            {allCats.length > 0 && (
              <>
                <Text variant="caption" tone="muted" caps style={{ marginBottom: space(2) }}>
                  Category
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(4) }}>
                  {allCats.map((c) => (
                    <Chip
                      key={c.id}
                      label={c.name}
                      selected={draftCategoryIds.includes(c.id)}
                      onPress={() => toggleCategoryId(c.id)}
                    />
                  ))}
                </View>
              </>
            )}

            {/* Amount range */}
            <Field
              label="Amount min"
              placeholder="0"
              value={draftAmountMin}
              onChangeText={setDraftAmountMin}
              keyboardType="numeric"
            />
            <Field
              label="Amount max"
              placeholder="Any"
              value={draftAmountMax}
              onChangeText={setDraftAmountMax}
              keyboardType="numeric"
            />

            {/* Date range */}
            <Field
              label="From date (YYYY-MM-DD)"
              placeholder="2026-01-01"
              value={draftFrom}
              onChangeText={setDraftFrom}
            />
            <Field
              label="To date (YYYY-MM-DD)"
              placeholder="2026-12-31"
              value={draftTo}
              onChangeText={setDraftTo}
            />

            {/* Actions */}
            <Button title="Apply" onPress={applyFilters} style={{ marginBottom: space(3) }} />
            <Button title="Clear" variant="secondary" onPress={resetFilters} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
