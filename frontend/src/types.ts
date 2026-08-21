export type TransactionType = "income" | "expense";

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string | null;
  date: string;
}

export interface TransactionUpdate {
  type?: TransactionType;
  amount?: number;
  category?: string;
  description?: string | null;
  date?: string;
}

export interface Summary {
  income: number;
  expense: number;
  balance: number;
  count: number;
}

export interface CategoryStat {
  category: string;
  total: number;
}

export interface MonthlyStat {
  month: string;
  income: number;
  expense: number;
}

export interface Budget {
  id: number;
  category: string;
  monthly_limit: number;
  spent: number;
}

export interface TransactionFilters {
  type?: TransactionType | "";
  category?: string;
  date_from?: string;
  date_to?: string;
}
