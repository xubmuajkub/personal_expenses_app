export type Currency = 'LAK' | 'THB' | 'USD';
export type AccountType = 'cash' | 'bank' | 'credit_card' | 'other';
export type TxnKind = 'expense' | 'income' | 'transfer';
export type TxnSource = 'manual' | 'notif' | 'recurring' | 'import';
export type CategoryKind = 'expense' | 'income';

export interface SyncedRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

export interface Account extends SyncedRow {
  name: string;
  type: AccountType;
  currency: Currency;
  opening_balance_micro: number;
  archived: boolean;
}

export interface Category extends SyncedRow {
  name: string;
  icon: string | null;
  color: string | null;
  kind: CategoryKind;
  archived: boolean;
}

export interface Transaction extends SyncedRow {
  account_id: string;
  category_id: string | null;
  kind: TxnKind;
  amount_micro: number;
  currency: Currency;
  fx_rate_to_base: number;
  amount_base_micro: number;
  occurred_at: string;
  merchant: string | null;
  note: string | null;
  receipt_url: string | null;
  source: TxnSource;
  source_ref: string | null;
}

export interface Transfer extends SyncedRow {
  from_txn_id: string;
  to_txn_id: string;
  fx_rate: number | null;
}

export interface Budget extends SyncedRow {
  category_id: string;
  month: string;            // YYYY-MM-01
  limit_amount_micro: number;
  limit_currency: Currency;
  last_alert_threshold: 0 | 80 | 100;
}
