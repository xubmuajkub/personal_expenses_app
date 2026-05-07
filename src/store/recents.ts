import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Currency } from '@/domain/types';

const KEY = 'recents_v1';

interface Recents {
  currency: Currency;
  accountId: string | null;
  categoryId: string | null;
  load: () => Promise<void>;
  set: (patch: Partial<Pick<Recents, 'currency' | 'accountId' | 'categoryId'>>) => Promise<void>;
}

export const useRecents = create<Recents>((setState, getState) => ({
  currency: 'LAK',
  accountId: null,
  categoryId: null,
  async load() {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<Pick<Recents, 'currency' | 'accountId' | 'categoryId'>>;
    setState(parsed);
  },
  async set(patch) {
    setState(patch);
    const next = getState();
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        currency: next.currency,
        accountId: next.accountId,
        categoryId: next.categoryId,
      }),
    );
  },
}));
