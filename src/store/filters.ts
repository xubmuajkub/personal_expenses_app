import { create } from 'zustand';
import type { TxnKind, TxnSource, Currency } from '@/domain/types';

export interface TxnFilters {
  from?: string;
  to?: string;
  account_ids?: string[];
  category_ids?: string[];
  kind?: TxnKind;
  sources?: TxnSource[];
  currency?: Currency;
  amount_min_micro?: number;
  amount_max_micro?: number;
  search?: string;
}

interface State {
  filters: TxnFilters;
  set: (filters: TxnFilters) => void;
  clear: () => void;
}

export const useFilters = create<State>((set) => ({
  filters: {},
  set: (filters) => set({ filters }),
  clear: () => set({ filters: {} }),
}));
